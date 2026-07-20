from __future__ import annotations

import os
import json
import struct
import uuid
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory
from werkzeug.utils import secure_filename


ROOT = Path(__file__).resolve().parent
UPLOAD_FOLDER = ROOT / "uploads"
OUTPUT_FOLDER = ROOT / "outputs"
ALLOWED_EXTENSIONS = {"gif", "jpeg", "jpg", "png", "webp"}


app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["OUTPUT_FOLDER"] = OUTPUT_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024

UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/health")
def health():
    return jsonify({"ok": True, "service": "ai-worker-prototype"})


@app.route("/api/generate-3d", methods=["POST"])
def generate_3d():
    uploaded_file = request.files.get("image")

    if uploaded_file is None or uploaded_file.filename == "":
        return jsonify({"error": "Missing image file."}), 400

    if not is_allowed_image(uploaded_file.filename):
        return jsonify({"error": "Upload a png, jpg, jpeg, webp, or gif image."}), 400

    saved_path = save_uploaded_image(uploaded_file)
    job = generate_mock_3d_job(saved_path)

    return jsonify(job), 202


@app.route("/upload", methods=["POST"])
def upload_from_form():
    response, status = generate_3d()

    if status >= 400:
        return response, status

    payload = response.get_json()
    return render_template("result.html", result=payload), status


@app.route("/outputs/<path:filename>")
def output_file(filename):
    return send_from_directory(
        app.config["OUTPUT_FOLDER"],
        filename,
        as_attachment=False,
        mimetype="model/gltf-binary",
    )


def save_uploaded_image(uploaded_file):
    original_name = secure_filename(uploaded_file.filename)
    extension = Path(original_name).suffix.lower()
    filename = f"{uuid.uuid4().hex}{extension}"
    saved_path = app.config["UPLOAD_FOLDER"] / filename

    uploaded_file.save(saved_path)

    return saved_path


def generate_mock_3d_job(image_path):
    job_id = uuid.uuid4().hex
    model_filename = f"{job_id}.glb"
    model_path = app.config["OUTPUT_FOLDER"] / model_filename
    write_placeholder_glb(model_path)

    return {
        "jobId": job_id,
        "message": "Image saved. Placeholder GLB created. Replace generate_mock_3d_job with a real 3D provider/model later.",
        "modelUrl": f"/outputs/{model_filename}",
        "status": "mock-ready",
        "uploadedImage": str(image_path.relative_to(ROOT)),
    }


def is_allowed_image(filename):
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return extension in ALLOWED_EXTENSIONS


def write_placeholder_glb(output_path):
    # A tiny valid GLB made from simple boxes. This is still a placeholder,
    # but it reads as a 3D clothing shape instead of a flat panel.
    positions = []
    indices = []

    add_box(positions, indices, center=(0.0, -0.1, 0.0), size=(0.85, 1.15, 0.18))
    add_box(positions, indices, center=(-0.62, 0.18, 0.0), size=(0.34, 0.62, 0.16))
    add_box(positions, indices, center=(0.62, 0.18, 0.0), size=(0.34, 0.62, 0.16))
    add_box(positions, indices, center=(-0.18, 0.55, 0.035), size=(0.22, 0.26, 0.08))
    add_box(positions, indices, center=(0.18, 0.55, 0.035), size=(0.22, 0.26, 0.08))

    min_position = [min(positions[index::3]) for index in range(3)]
    max_position = [max(positions[index::3]) for index in range(3)]
    position_bytes = struct.pack(f"<{len(positions)}f", *positions)
    index_bytes = struct.pack(f"<{len(indices)}H", *indices)
    index_offset = align4(len(position_bytes))
    binary = position_bytes + (b"\x00" * (index_offset - len(position_bytes))) + index_bytes
    binary += b"\x00" * (align4(len(binary)) - len(binary))

    gltf = {
        "asset": {"version": "2.0", "generator": "Bove Closet AI worker prototype"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "Placeholder shirt mesh"}],
        "meshes": [
            {
                "primitives": [
                    {
                        "attributes": {"POSITION": 0},
                        "indices": 1,
                        "material": 0,
                        "mode": 4,
                    }
                ]
            }
        ],
        "materials": [
            {
                "name": "Warm fabric placeholder",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [0.66, 0.42, 0.22, 1.0],
                    "metallicFactor": 0,
                    "roughnessFactor": 0.75,
                },
            }
        ],
        "buffers": [{"byteLength": len(binary)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(position_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": index_offset, "byteLength": len(index_bytes), "target": 34963},
        ],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": len(positions) // 3,
                "type": "VEC3",
                "min": min_position,
                "max": max_position,
            },
            {
                "bufferView": 1,
                "componentType": 5123,
                "count": len(indices),
                "type": "SCALAR",
            },
        ],
    }
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_bytes += b" " * (align4(len(json_bytes)) - len(json_bytes))

    total_length = 12 + 8 + len(json_bytes) + 8 + len(binary)
    with output_path.open("wb") as file:
        file.write(struct.pack("<4sII", b"glTF", 2, total_length))
        file.write(struct.pack("<I4s", len(json_bytes), b"JSON"))
        file.write(json_bytes)
        file.write(struct.pack("<I4s", len(binary), b"BIN\x00"))
        file.write(binary)


def align4(value):
    return (value + 3) & ~3


def add_box(positions, indices, center, size):
    cx, cy, cz = center
    sx, sy, sz = (value / 2 for value in size)
    vertex_offset = len(positions) // 3

    vertices = [
        (cx - sx, cy - sy, cz + sz),
        (cx + sx, cy - sy, cz + sz),
        (cx + sx, cy + sy, cz + sz),
        (cx - sx, cy + sy, cz + sz),
        (cx - sx, cy - sy, cz - sz),
        (cx + sx, cy - sy, cz - sz),
        (cx + sx, cy + sy, cz - sz),
        (cx - sx, cy + sy, cz - sz),
    ]
    faces = [
        (0, 1, 2, 0, 2, 3),
        (5, 4, 7, 5, 7, 6),
        (4, 0, 3, 4, 3, 7),
        (1, 5, 6, 1, 6, 2),
        (3, 2, 6, 3, 6, 7),
        (4, 5, 1, 4, 1, 0),
    ]

    for vertex in vertices:
        positions.extend(vertex)

    for face in faces:
        indices.extend(vertex_offset + index for index in face)


if __name__ == "__main__":
    port = int(os.environ.get("AI_WORKER_PORT", "7001"))
    app.run(host="127.0.0.1", port=port, debug=True)
