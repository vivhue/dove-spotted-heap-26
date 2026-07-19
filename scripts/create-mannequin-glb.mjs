import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputPath = resolve('mobile/assets/models/bove-mannequin.glb');
const positions = [];
const normals = [];
const indices = [];

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(vector, amount) {
  return [vector[0] * amount, vector[1] * amount, vector[2] * amount];
}

function createBasis(direction) {
  const y = normalize(direction);
  const fallback = Math.abs(y[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const x = normalize(cross(fallback, y));
  const z = normalize(cross(y, x));
  return { x, y, z };
}

function transformLocal(local, basis) {
  return add(add(scale(basis.x, local[0]), scale(basis.y, local[1])), scale(basis.z, local[2]));
}

function addEllipsoid({ center, radii, direction = [0, 1, 0], rings = 20, segments = 32 }) {
  const start = positions.length / 3;
  const basis = createBasis(direction);

  for (let ring = 0; ring <= rings; ring += 1) {
    const v = ring / rings;
    const theta = v * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let segment = 0; segment <= segments; segment += 1) {
      const u = segment / segments;
      const phi = u * Math.PI * 2;
      const localNormal = [
        Math.cos(phi) * sinTheta,
        cosTheta,
        Math.sin(phi) * sinTheta,
      ];
      const localPosition = [
        localNormal[0] * radii[0],
        localNormal[1] * radii[1],
        localNormal[2] * radii[2],
      ];
      const world = add(center, transformLocal(localPosition, basis));
      const normal = normalize(transformLocal([
        localNormal[0] / radii[0],
        localNormal[1] / radii[1],
        localNormal[2] / radii[2],
      ], basis));

      positions.push(...world);
      normals.push(...normal);
    }
  }

  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = start + ring * (segments + 1) + segment;
      const b = a + segments + 1;
      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }
}

function addLimb({ from, to, radius, taper = 0.8 }) {
  const center = scale(add(from, to), 0.5);
  const direction = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(direction[0], direction[1], direction[2]);
  addEllipsoid({
    center,
    direction,
    radii: [radius, length / 2, radius * taper],
    rings: 16,
    segments: 24,
  });
}

// Neutral runway-mannequin proportions, smooth enough to avoid the low-poly TripoSR look.
addEllipsoid({ center: [0, 1.72, 0], radii: [0.16, 0.2, 0.14], rings: 22, segments: 34 }); // head
addEllipsoid({ center: [0, 1.48, 0], radii: [0.08, 0.13, 0.07], rings: 14, segments: 24 }); // neck
addEllipsoid({ center: [0, 1.08, 0], radii: [0.29, 0.48, 0.16], rings: 24, segments: 36 }); // torso
addEllipsoid({ center: [0, 0.65, 0], radii: [0.25, 0.22, 0.15], rings: 18, segments: 32 }); // hips

addLimb({ from: [-0.24, 1.36, 0], to: [-0.55, 1.02, 0.02], radius: 0.075 });
addLimb({ from: [-0.55, 1.02, 0.02], to: [-0.62, 0.63, 0.02], radius: 0.06 });
addEllipsoid({ center: [-0.62, 0.55, 0.02], radii: [0.055, 0.08, 0.032], rings: 12, segments: 18 });

addLimb({ from: [0.24, 1.36, 0], to: [0.55, 1.02, 0.02], radius: 0.075 });
addLimb({ from: [0.55, 1.02, 0.02], to: [0.62, 0.63, 0.02], radius: 0.06 });
addEllipsoid({ center: [0.62, 0.55, 0.02], radii: [0.055, 0.08, 0.032], rings: 12, segments: 18 });

addLimb({ from: [-0.14, 0.5, 0], to: [-0.18, 0.02, 0.015], radius: 0.095, taper: 0.72 });
addLimb({ from: [-0.18, 0.02, 0.015], to: [-0.2, -0.52, 0.02], radius: 0.075, taper: 0.65 });
addEllipsoid({ center: [-0.2, -0.62, 0.08], radii: [0.07, 0.045, 0.16], direction: [0, 0.2, 1], rings: 12, segments: 20 });

addLimb({ from: [0.14, 0.5, 0], to: [0.18, 0.02, 0.015], radius: 0.095, taper: 0.72 });
addLimb({ from: [0.18, 0.02, 0.015], to: [0.2, -0.52, 0.02], radius: 0.075, taper: 0.65 });
addEllipsoid({ center: [0.2, -0.62, 0.08], radii: [0.07, 0.045, 0.16], direction: [0, 0.2, 1], rings: 12, segments: 20 });

// Simple pedestal so the mannequin opens nicely in viewers.
addEllipsoid({ center: [0, -0.73, 0], radii: [0.42, 0.035, 0.24], rings: 8, segments: 40 });

const minPosition = [Infinity, Infinity, Infinity];
const maxPosition = [-Infinity, -Infinity, -Infinity];
for (let index = 0; index < positions.length; index += 3) {
  for (let axis = 0; axis < 3; axis += 1) {
    minPosition[axis] = Math.min(minPosition[axis], positions[index + axis]);
    maxPosition[axis] = Math.max(maxPosition[axis], positions[index + axis]);
  }
}

const positionBuffer = Buffer.alloc(positions.length * 4);
positions.forEach((value, index) => positionBuffer.writeFloatLE(value, index * 4));
const normalBuffer = Buffer.alloc(normals.length * 4);
normals.forEach((value, index) => normalBuffer.writeFloatLE(value, index * 4));
const indexBuffer = Buffer.alloc(indices.length * 4);
indices.forEach((value, index) => indexBuffer.writeUInt32LE(value, index * 4));

const positionOffset = 0;
const normalOffset = align4(positionOffset + positionBuffer.length);
const indexOffset = align4(normalOffset + normalBuffer.length);
const binaryLength = align4(indexOffset + indexBuffer.length);
const binary = Buffer.alloc(binaryLength);
positionBuffer.copy(binary, positionOffset);
normalBuffer.copy(binary, normalOffset);
indexBuffer.copy(binary, indexOffset);

const gltf = {
  asset: { version: '2.0', generator: 'Bove Closet local mannequin generator' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'Bove Smooth Mannequin' }],
  meshes: [{
    primitives: [{
      attributes: { POSITION: 0, NORMAL: 1 },
      indices: 2,
      material: 0,
      mode: 4,
    }],
  }],
  materials: [{
    name: 'Warm matte mannequin',
    pbrMetallicRoughness: {
      baseColorFactor: [0.76, 0.62, 0.5, 1],
      metallicFactor: 0,
      roughnessFactor: 0.88,
    },
  }],
  buffers: [{ byteLength: binary.length }],
  bufferViews: [
    { buffer: 0, byteOffset: positionOffset, byteLength: positionBuffer.length, target: 34962 },
    { buffer: 0, byteOffset: normalOffset, byteLength: normalBuffer.length, target: 34962 },
    { buffer: 0, byteOffset: indexOffset, byteLength: indexBuffer.length, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: minPosition, max: maxPosition },
    { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5125, count: indices.length, type: 'SCALAR' },
  ],
};

const json = Buffer.from(JSON.stringify(gltf));
const paddedJson = Buffer.concat([json, Buffer.alloc(align4(json.length) - json.length, 0x20)]);
const totalLength = 12 + 8 + paddedJson.length + 8 + binary.length;
const header = Buffer.alloc(12);
header.write('glTF', 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(totalLength, 8);

const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(paddedJson.length, 0);
jsonHeader.write('JSON', 4);

const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binary.length, 0);
binaryHeader.write('BIN\0', 4);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, Buffer.concat([header, jsonHeader, paddedJson, binaryHeader, binary]));
console.log(`${outputPath} ${(totalLength / 1024).toFixed(1)}KB`);

function align4(value) {
  return (value + 3) & ~3;
}
