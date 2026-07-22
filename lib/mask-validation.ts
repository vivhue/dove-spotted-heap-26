// Tunable thresholds for garment cutout validation. Kept together so they can be
// calibrated against real uploads without hunting through the code.
const MASK_THRESHOLDS = {
  // Alpha value (0-255) above which a pixel counts as "subject".
  ALPHA: 16,
  // Fraction of the frame the subject should occupy.
  MIN_COVERAGE: 0.1,
  MAX_COVERAGE: 0.8,
  // The largest connected blob must be at least this fraction of all subject
  // pixels. Rejects group shots and cluttered flat-lays (many separate blobs).
  DOMINANT_COMPONENT_RATIO: 0.85,
  // If any single frame edge is covered by more than this fraction of subject
  // pixels, the garment is treated as clipped at that edge.
  EDGE_CLIP_MAX_FRACTION: 0.12,
} as const;

type MaskMetrics = {
  coverage: number;
  dominantRatio: number;
  maxEdgeFraction: number;
};

type MaskResult = {
  ok: boolean;
  reason?: string;
  metrics: MaskMetrics;
};

// Validates a subject mask given its raw alpha channel. `alpha[i]` is the alpha
// of pixel (x = i % width, y = i / width). Works on a downscaled mask — full
// resolution is unnecessary and expensive for connected-component analysis.
function validateSubjectMask(alpha: Uint8Array | number[], width: number, height: number): MaskResult {
  const total = width * height;

  if (total === 0) {
    return {
      ok: false,
      reason: 'The garment image looks empty. Try a clearer photo.',
      metrics: { coverage: 0, dominantRatio: 0, maxEdgeFraction: 0 },
    };
  }

  const isSubject = new Uint8Array(total);
  let subjectCount = 0;

  for (let i = 0; i < total; i += 1) {
    if (alpha[i] > MASK_THRESHOLDS.ALPHA) {
      isSubject[i] = 1;
      subjectCount += 1;
    }
  }

  const coverage = subjectCount / total;
  const { largestComponent } = largestConnectedComponent(isSubject, width, height);
  const dominantRatio = subjectCount === 0 ? 0 : largestComponent / subjectCount;
  const maxEdgeFraction = maxEdgeCoverage(isSubject, width, height);

  const metrics: MaskMetrics = { coverage, dominantRatio, maxEdgeFraction };

  if (coverage < MASK_THRESHOLDS.MIN_COVERAGE) {
    return {
      ok: false,
      reason:
        'The garment is too small in the frame. Fill more of the photo with the item and try again.',
      metrics,
    };
  }

  if (coverage > MASK_THRESHOLDS.MAX_COVERAGE) {
    return {
      ok: false,
      reason:
        'The garment fills too much of the frame. Step back so the whole item is visible with a little margin.',
      metrics,
    };
  }

  if (dominantRatio < MASK_THRESHOLDS.DOMINANT_COMPONENT_RATIO) {
    return {
      ok: false,
      reason:
        'Multiple items were detected. Photograph a single garment on a plain background and try again.',
      metrics,
    };
  }

  if (maxEdgeFraction > MASK_THRESHOLDS.EDGE_CLIP_MAX_FRACTION) {
    return {
      ok: false,
      reason:
        'The garment is cut off at the edge of the photo. Re-shoot with the whole item inside the frame.',
      metrics,
    };
  }

  return { ok: true, metrics };
}

// Iterative flood fill (4-connectivity) returning the size of the largest blob.
function largestConnectedComponent(isSubject: Uint8Array, width: number, height: number) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const stack: number[] = [];
  let largestComponent = 0;

  for (let start = 0; start < total; start += 1) {
    if (!isSubject[start] || visited[start]) {
      continue;
    }

    let size = 0;
    stack.push(start);
    visited[start] = 1;

    while (stack.length > 0) {
      const index = stack.pop() as number;
      size += 1;

      const x = index % width;
      const y = (index - x) / width;

      if (x > 0) pushNeighbor(index - 1);
      if (x < width - 1) pushNeighbor(index + 1);
      if (y > 0) pushNeighbor(index - width);
      if (y < height - 1) pushNeighbor(index + width);
    }

    if (size > largestComponent) {
      largestComponent = size;
    }

    function pushNeighbor(neighbor: number) {
      if (isSubject[neighbor] && !visited[neighbor]) {
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }
  }

  return { largestComponent };
}

// The largest subject fraction along any single frame edge.
function maxEdgeCoverage(isSubject: Uint8Array, width: number, height: number) {
  let top = 0;
  let bottom = 0;
  let left = 0;
  let right = 0;

  for (let x = 0; x < width; x += 1) {
    if (isSubject[x]) top += 1;
    if (isSubject[(height - 1) * width + x]) bottom += 1;
  }

  for (let y = 0; y < height; y += 1) {
    if (isSubject[y * width]) left += 1;
    if (isSubject[y * width + (width - 1)]) right += 1;
  }

  return Math.max(top / width, bottom / width, left / height, right / height);
}

module.exports = {
  MASK_THRESHOLDS,
  validateSubjectMask,
};
