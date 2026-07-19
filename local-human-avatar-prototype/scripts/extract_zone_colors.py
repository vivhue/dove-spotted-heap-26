"""
Extract representative zone colors from a full-body photo.

This script is intentionally not a texture baker. It removes the background,
uses MediaPipe pose landmarks to locate rough body/outfit regions, samples
dominant colors from those regions, and writes a JSON file for Blender.

Usage:
    python scripts/extract_zone_colors.py input.png outputs/zone_colors.json

Optional:
    python scripts/extract_zone_colors.py input.png outputs/zone_colors.json \
        --debug-dir outputs/zone-debug
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ZONE_ORDER = ("hair", "skin", "top", "bottom", "shoes")


def main() -> None:
    args = parse_args()
    load_runtime_dependencies()
    bgr, foreground_mask, removed_rgba = load_foreground_mask(args.input)
    method = "rembg_foreground_mask + silhouette_boxes + kmeans_dominant_color"

    try:
        landmarks, pose_landmark = get_pose_landmarks(bgr)
        boxes = build_pose_zone_boxes(landmarks, pose_landmark, bgr.shape[:2], foreground_mask)
        method = "rembg_foreground_mask + mediapipe_pose_boxes + kmeans_dominant_color"
    except RuntimeError as exc:
        print(f"Pose landmarks unavailable ({exc}). Falling back to silhouette zone boxes.")
        boxes = build_silhouette_zone_boxes(foreground_mask)

    result = {
        "_meta": {
            "source_image": str(args.input),
            "image_width": int(bgr.shape[1]),
            "image_height": int(bgr.shape[0]),
            "method": method,
        }
    }

    for zone in ZONE_ORDER:
        sample = dominant_color(bgr, foreground_mask, boxes[zone], zone=zone, k=args.k)
        if sample is None:
            continue
        rgb, pixels_used = sample
        result[zone] = {
            "rgb": [int(channel) for channel in rgb],
            "hex": rgb_to_hex(rgb),
            "box": [int(value) for value in boxes[zone]],
            "pixels_used": int(pixels_used),
        }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")

    if args.debug_dir:
        write_debug_images(args.debug_dir, bgr, foreground_mask, removed_rgba, boxes)

    print(f"Wrote zone colors to {args.output}")
    print(json.dumps(result, indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract avatar material zone colors from a photo.")
    parser.add_argument("input", type=Path, help="Input full-body photo.")
    parser.add_argument("output", type=Path, help="Output zone_colors.json path.")
    parser.add_argument("--debug-dir", type=Path, help="Optional folder for mask and box debug images.")
    parser.add_argument("--k", type=int, default=4, help="K-means cluster count per zone.")
    return parser.parse_args()


def load_runtime_dependencies() -> None:
    global cv2, np, Image

    try:
        import cv2 as cv2_module
    except ImportError as exc:
        raise SystemExit("Missing dependency: pip install opencv-python") from exc

    try:
        import numpy as np_module
    except ImportError as exc:
        raise SystemExit("Missing dependency: pip install numpy") from exc

    try:
        from PIL import Image as image_module
    except ImportError as exc:
        raise SystemExit("Missing dependency: pip install Pillow") from exc

    cv2 = cv2_module
    np = np_module
    Image = image_module


def load_foreground_mask(image_path: Path) -> tuple[np.ndarray, np.ndarray, Image.Image]:
    try:
        from rembg import remove
    except ImportError as exc:
        raise SystemExit("Missing dependency: pip install rembg") from exc

    source = Image.open(image_path).convert("RGBA")
    removed = remove(source)
    removed_np = np.array(removed)
    foreground_mask = removed_np[:, :, 3] > 10
    bgr = cv2.cvtColor(np.array(source.convert("RGB")), cv2.COLOR_RGB2BGR)
    return bgr, foreground_mask, removed


def get_pose_landmarks(bgr: np.ndarray):
    try:
        import mediapipe as mp
    except ImportError as exc:
        raise SystemExit("Missing dependency: pip install mediapipe") from exc

    if not hasattr(mp, "solutions"):
        raise RuntimeError("installed mediapipe package does not expose mp.solutions.pose")

    pose_api = mp.solutions.pose
    with pose_api.Pose(static_image_mode=True, model_complexity=2) as pose:
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)
        if not results.pose_landmarks:
            raise RuntimeError("No pose detected. Use a clear, full-body, mostly front-facing photo.")

        height, width = bgr.shape[:2]
        points = {}
        for index, landmark in enumerate(results.pose_landmarks.landmark):
            points[index] = {
                "x": int(landmark.x * width),
                "y": int(landmark.y * height),
                "visibility": float(getattr(landmark, "visibility", 1.0)),
            }
        return points, pose_api.PoseLandmark


def build_pose_zone_boxes(landmarks, pose_landmark, shape, foreground_mask: np.ndarray) -> dict[str, tuple[int, int, int, int]]:
    image_height, image_width = shape
    person_box = foreground_bounds(foreground_mask)

    def p(name: str) -> tuple[int, int]:
        landmark = landmarks[pose_landmark[name].value]
        return landmark["x"], landmark["y"]

    nose = p("NOSE")
    left_ear, right_ear = p("LEFT_EAR"), p("RIGHT_EAR")
    left_shoulder, right_shoulder = p("LEFT_SHOULDER"), p("RIGHT_SHOULDER")
    left_hip, right_hip = p("LEFT_HIP"), p("RIGHT_HIP")
    left_knee, right_knee = p("LEFT_KNEE"), p("RIGHT_KNEE")
    left_ankle, right_ankle = p("LEFT_ANKLE"), p("RIGHT_ANKLE")
    left_heel, right_heel = p("LEFT_HEEL"), p("RIGHT_HEEL")

    shoulder_y = min(left_shoulder[1], right_shoulder[1])
    hip_y = max(left_hip[1], right_hip[1])
    knee_y = max(left_knee[1], right_knee[1])
    ankle_y = max(left_ankle[1], right_ankle[1])
    foot_y = max(left_heel[1], right_heel[1], ankle_y)

    shoulder_x1 = min(left_shoulder[0], right_shoulder[0])
    shoulder_x2 = max(left_shoulder[0], right_shoulder[0])
    hip_x1 = min(left_hip[0], right_hip[0])
    hip_x2 = max(left_hip[0], right_hip[0])
    ankle_x1 = min(left_ankle[0], right_ankle[0])
    ankle_x2 = max(left_ankle[0], right_ankle[0])

    face_width = max(abs(left_ear[0] - right_ear[0]), 50)
    torso_pad = max(int((shoulder_x2 - shoulder_x1) * 0.25), 24)
    hip_pad = max(int((hip_x2 - hip_x1) * 0.35), 24)

    boxes = {
        "hair": (
            nose[0] - int(face_width * 0.65),
            nose[1] - int(face_width * 1.35),
            nose[0] + int(face_width * 0.65),
            nose[1] - int(face_width * 0.18),
        ),
        "skin": (
            nose[0] - int(face_width * 0.35),
            nose[1] - int(face_width * 0.05),
            nose[0] + int(face_width * 0.35),
            nose[1] + int(face_width * 0.55),
        ),
        "top": (
            shoulder_x1 - torso_pad,
            shoulder_y,
            shoulder_x2 + torso_pad,
            hip_y,
        ),
        "bottom": (
            hip_x1 - hip_pad,
            hip_y,
            hip_x2 + hip_pad,
            max(knee_y, hip_y + 1),
        ),
        "shoes": (
            ankle_x1 - hip_pad,
            ankle_y - int(0.04 * image_height),
            ankle_x2 + hip_pad,
            foot_y + int(0.06 * image_height),
        ),
    }

    return {zone: clamp_box(box, image_width, image_height, person_box) for zone, box in boxes.items()}


def build_silhouette_zone_boxes(foreground_mask: np.ndarray) -> dict[str, tuple[int, int, int, int]]:
    image_height, image_width = foreground_mask.shape[:2]
    x1, y1, x2, y2 = foreground_bounds(foreground_mask)
    width = max(x2 - x1, 1)
    height = max(y2 - y1, 1)

    def rel_box(rx1: float, ry1: float, rx2: float, ry2: float) -> tuple[int, int, int, int]:
        return clamp_box(
            (
                int(x1 + width * rx1),
                int(y1 + height * ry1),
                int(x1 + width * rx2),
                int(y1 + height * ry2),
            ),
            image_width,
            image_height,
            (x1, y1, x2, y2),
        )

    return {
        "hair": rel_box(0.32, 0.00, 0.68, 0.16),
        "skin": rel_box(0.36, 0.08, 0.64, 0.26),
        "top": rel_box(0.18, 0.24, 0.82, 0.52),
        "bottom": rel_box(0.18, 0.50, 0.82, 0.78),
        "shoes": rel_box(0.10, 0.78, 0.90, 1.00),
    }


def foreground_bounds(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(mask)
    if len(xs) == 0 or len(ys) == 0:
        height, width = mask.shape[:2]
        return 0, 0, width, height
    return int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)


def clamp_box(
    box: tuple[int, int, int, int],
    image_width: int,
    image_height: int,
    person_box: tuple[int, int, int, int],
) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = box
    px1, py1, px2, py2 = person_box
    return (
        max(0, min(image_width, max(x1, px1 - 8))),
        max(0, min(image_height, max(y1, py1 - 8))),
        max(0, min(image_width, min(x2, px2 + 8))),
        max(0, min(image_height, min(y2, py2 + 8))),
    )


def dominant_color(
    bgr: np.ndarray,
    foreground_mask: np.ndarray,
    box: tuple[int, int, int, int],
    zone: str,
    k: int,
) -> tuple[tuple[int, int, int], int] | None:
    x1, y1, x2, y2 = box
    if x2 <= x1 or y2 <= y1:
        return None

    region = bgr[y1:y2, x1:x2]
    region_mask = foreground_mask[y1:y2, x1:x2]
    pixels = region[region_mask]
    if len(pixels) < 20:
        return None

    pixels = filter_zone_pixels(pixels, zone)
    if len(pixels) < 20:
        return None

    pixels = pixels.astype(np.float32)
    cluster_count = max(1, min(k, len(pixels)))
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 24, 0.4)
    _, labels, centers = cv2.kmeans(pixels, cluster_count, None, criteria, 6, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.flatten(), minlength=cluster_count)
    center = select_cluster_center(centers, counts, zone)
    blue, green, red = center
    return (int(red), int(green), int(blue)), int(len(pixels))


def filter_zone_pixels(pixels_bgr: np.ndarray, zone: str) -> np.ndarray:
    rgb = pixels_bgr[:, ::-1].astype(np.uint8)
    hsv = cv2.cvtColor(rgb.reshape(-1, 1, 3), cv2.COLOR_RGB2HSV).reshape(-1, 3)
    value = hsv[:, 2]
    saturation = hsv[:, 1]

    keep = value > 22
    if zone in {"top", "bottom"}:
        keep &= ~looks_like_skin(rgb)
    if zone == "skin":
        skin_keep = looks_like_skin(rgb)
        if skin_keep.sum() >= 20:
            keep &= skin_keep
    if zone == "hair":
        # Hair is often dark, but keep saturated lighter hair too.
        keep &= (value < 145) | (saturation > 45)
    if zone == "shoes":
        dark_pixels = value < 115
        if dark_pixels.sum() >= 20:
            keep &= dark_pixels
        else:
            keep &= value < 245

    filtered = pixels_bgr[keep]
    return filtered if len(filtered) >= 20 else pixels_bgr


def looks_like_skin(rgb: np.ndarray) -> np.ndarray:
    red = rgb[:, 0].astype(np.int16)
    green = rgb[:, 1].astype(np.int16)
    blue = rgb[:, 2].astype(np.int16)
    return (red > 80) & (green > 45) & (blue > 25) & (red > green + 12) & (green > blue - 2)


def select_cluster_center(centers: np.ndarray, counts: np.ndarray, zone: str) -> np.ndarray:
    if zone == "hair":
        brightness = centers.mean(axis=1)
        score = counts / max(counts.max(), 1) - (brightness / 255.0) * 0.35
        return centers[int(np.argmax(score))]
    if zone == "shoes":
        brightness = centers.mean(axis=1)
        score = counts / max(counts.max(), 1) - (brightness / 255.0) * 0.65
        return centers[int(np.argmax(score))]
    return centers[int(np.argmax(counts))]


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    red, green, blue = rgb
    return f"#{red:02x}{green:02x}{blue:02x}"


def write_debug_images(
    debug_dir: Path,
    bgr: np.ndarray,
    foreground_mask: np.ndarray,
    removed_rgba: Image.Image,
    boxes: dict[str, tuple[int, int, int, int]],
) -> None:
    debug_dir.mkdir(parents=True, exist_ok=True)
    removed_rgba.save(debug_dir / "foreground.png")
    cv2.imwrite(str(debug_dir / "mask.png"), foreground_mask.astype(np.uint8) * 255)

    preview = bgr.copy()
    colors = {
        "hair": (60, 60, 60),
        "skin": (80, 170, 235),
        "top": (90, 190, 90),
        "bottom": (220, 140, 70),
        "shoes": (190, 80, 190),
    }
    for zone, box in boxes.items():
        x1, y1, x2, y2 = box
        cv2.rectangle(preview, (x1, y1), (x2, y2), colors[zone], 2)
        cv2.putText(preview, zone, (x1, max(y1 - 8, 16)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, colors[zone], 1)
    cv2.imwrite(str(debug_dir / "zone_boxes.png"), preview)


if __name__ == "__main__":
    main()
