const canvas = document.getElementById("avatarCanvas");
const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
const BODY_ONLY_MODE = true;

if (!gl) {
  document.querySelector(".viewport-wrap").innerHTML = "<p class=\"webgl-error\">WebGL is not available in this browser.</p>";
  throw new Error("WebGL is not available");
}

const measurements = {
  height: bindMeasurement("height", 145, 205),
  build: bindMeasurement("build", 80, 120),
  chest: bindMeasurement("chest", 72, 125),
  waist: bindMeasurement("waist", 55, 115),
  hips: bindMeasurement("hips", 70, 130),
  shoulders: bindMeasurement("shoulders", 34, 55),
  inseam: bindMeasurement("inseam", 62, 95),
  arm: bindMeasurement("arm", 48, 72)
};

const controls = {
  bodyType: document.querySelectorAll('input[name="bodyType"]'),
  topType: document.getElementById("topType"),
  layerType: document.getElementById("layerType"),
  bottomType: document.getElementById("bottomType"),
  dressType: document.getElementById("dressType"),
  shoes: document.getElementById("shoes"),
  hat: document.getElementById("hat"),
  preset: document.getElementById("preset"),
  skinColor: document.getElementById("skinColor"),
  topColor: document.getElementById("topColor"),
  bottomColor: document.getElementById("bottomColor"),
  layerColor: document.getElementById("layerColor")
};

const statusText = document.getElementById("statusText");

const bodyDefaults = {
  female: {
    height: 165,
    build: 98,
    chest: 88,
    waist: 68,
    hips: 94,
    shoulders: 38,
    inseam: 74,
    arm: 57
  },
  male: {
    height: 175,
    build: 103,
    chest: 96,
    waist: 82,
    hips: 94,
    shoulders: 45,
    inseam: 79,
    arm: 62
  }
};

const bodyProfiles = {
  female: {
    label: "Female body proportions",
    shoulderScale: 0.9,
    chestScale: 0.92,
    waistScale: 0.82,
    hipScale: 1.18,
    torsoDepth: 0.94,
    limbScale: 0.9,
    thighScale: 1.18,
    calfScale: 0.9,
    neckScale: 0.82,
    torsoLength: 0.94
  },
  male: {
    label: "Male body proportions",
    shoulderScale: 1.16,
    chestScale: 1.16,
    waistScale: 1.0,
    hipScale: 0.93,
    torsoDepth: 1.1,
    limbScale: 1.12,
    thighScale: 1.08,
    calfScale: 1.16,
    neckScale: 1.14,
    torsoLength: 1.04
  }
};

const vertexShader = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProj;
uniform mat3 uNormalMatrix;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uViewProj * world;
}`;

const fragmentShader = `
precision mediump float;
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform vec3 uAccent;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec3 normal = normalize(vNormal);
  float key = max(dot(normal, normalize(uLightDir)), 0.0);
  float fill = max(dot(normal, normalize(vec3(-0.45, 0.45, 0.55))), 0.0);
  float rim = pow(1.0 - max(dot(normal, normalize(vec3(0.0, 0.08, 1.0))), 0.0), 2.0);
  float vertical = smoothstep(-0.2, 1.4, vWorld.y);
  vec3 warm = vec3(1.08, 0.98, 0.9);
  vec3 color = uColor * warm * (0.5 + key * 0.42 + fill * 0.16 + vertical * 0.05);
  gl_FragColor = vec4(color + uAccent * rim * 0.045, 1.0);
}`;

const program = createProgram(vertexShader, fragmentShader);
const locations = {
  aPosition: gl.getAttribLocation(program, "aPosition"),
  aNormal: gl.getAttribLocation(program, "aNormal"),
  uModel: gl.getUniformLocation(program, "uModel"),
  uViewProj: gl.getUniformLocation(program, "uViewProj"),
  uNormalMatrix: gl.getUniformLocation(program, "uNormalMatrix"),
  uColor: gl.getUniformLocation(program, "uColor"),
  uAccent: gl.getUniformLocation(program, "uAccent"),
  uLightDir: gl.getUniformLocation(program, "uLightDir")
};

const sphere = createSphere(32, 20);
const cylinder = createCylinder(32);
const bodyCoreMesh = createDynamicProfileMesh(9, 42);
const headMesh = createProfileMesh([
  [-1, 0.52, 0.48],
  [-0.72, 0.78, 0.72],
  [0.1, 0.9, 0.82],
  [0.74, 0.76, 0.7],
  [1, 0.42, 0.38]
], 44);
const armMesh = createProfileMesh([
  [-1, 0.38, 0.34],
  [-0.35, 0.5, 0.42],
  [0.5, 0.62, 0.5],
  [1, 0.44, 0.38]
], 32);
const forearmMesh = createProfileMesh([
  [-1, 0.34, 0.3],
  [-0.18, 0.46, 0.38],
  [1, 0.3, 0.27]
], 32);
const thighMeshes = {
  female: createProfileMesh([
    [-1, 0.46, 0.38],
    [-0.18, 0.66, 0.52],
    [1, 0.5, 0.42]
  ], 30),
  male: createProfileMesh([
    [-1, 0.42, 0.36],
    [-0.12, 0.62, 0.5],
    [1, 0.54, 0.44]
  ], 30)
};
const calfMeshes = {
  female: createProfileMesh([
    [-1, 0.3, 0.25],
    [-0.14, 0.46, 0.36],
    [1, 0.32, 0.28]
  ], 30),
  male: createProfileMesh([
    [-1, 0.32, 0.28],
    [-0.24, 0.56, 0.44],
    [1, 0.34, 0.3]
  ], 30)
};
const palmMesh = createProfileMesh([
  [-1, 0.46, 0.34],
  [-0.1, 0.62, 0.42],
  [1, 0.36, 0.28]
], 24);
const footMesh = createProfileMesh([
  [-1, 0.42, 0.3],
  [-0.18, 0.62, 0.38],
  [1, 1.35, 0.58]
], 24);
const fittedTopMesh = createProfileMesh([
  [-1, 0.78, 0.72],
  [-0.48, 0.82, 0.74],
  [0.38, 1.0, 0.86],
  [1, 0.9, 0.78]
], 44);
const skirtMesh = createProfileMesh([
  [-1, 1.08, 1.0],
  [-0.5, 0.92, 0.9],
  [1, 0.72, 0.74]
], 44);
const pantsSeatMesh = createProfileMesh([
  [-1, 0.86, 0.76],
  [-0.35, 1.0, 0.88],
  [1, 0.72, 0.64]
], 36);
const beltMesh = createProfileMesh([[-1, 1, 1], [1, 0.98, 0.98]], 44);

let yaw = -0.18;
let pitch = 0.03;
let distance = 3.05;
let dragging = false;
let previousPointer = { x: 0, y: 0 };

const presets = {
  smart: {
    label: "Smart casual outfit",
    topType: "shirt",
    bottomType: "trousers",
    layerType: "jacket",
    dressType: "none",
    topColor: "#f7f0e6",
    bottomColor: "#2f465f",
    layerColor: "#31554f"
  },
  street: {
    label: "Streetwear outfit",
    topType: "tee",
    bottomType: "jeans",
    layerType: "jacket",
    dressType: "none",
    topColor: "#f5f1e8",
    bottomColor: "#27384d",
    layerColor: "#1d1e22"
  },
  cny: {
    label: "CNY dinner outfit",
    topType: "shirt",
    bottomType: "skirt",
    layerType: "cardigan",
    dressType: "none",
    topColor: "#b3283d",
    bottomColor: "#2a3230",
    layerColor: "#e6c95f"
  },
  date: {
    label: "First date outfit",
    topType: "tank",
    bottomType: "skirt",
    layerType: "cardigan",
    dressType: "none",
    topColor: "#df8ea2",
    bottomColor: "#5b3d50",
    layerColor: "#f0d9c7"
  },
  interview: {
    label: "Job interview outfit",
    topType: "shirt",
    bottomType: "trousers",
    layerType: "jacket",
    dressType: "none",
    topColor: "#ffffff",
    bottomColor: "#202833",
    layerColor: "#303744"
  }
};

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`[data-panel="${button.dataset.tab}"]`).classList.add("active");
  });
});

Object.values(controls).forEach((control) => {
  if (control instanceof NodeList) return;
  control.addEventListener("input", () => {
    if (control === controls.preset) {
      applyPreset(control.value);
    }
    updateStatus();
    draw();
  });
});

controls.bodyType.forEach((control) => {
  control.addEventListener("change", () => {
    applyBodyDefaults(control.value);
    updateStatus();
    draw();
  });
});

document.getElementById("surpriseBtn").addEventListener("click", () => {
  const presetKeys = Object.keys(presets);
  applyPreset(presetKeys[Math.floor(Math.random() * presetKeys.length)]);
  setMeasure("height", Math.round(rand(155, 184)));
  setMeasure("chest", Math.round(rand(78, 108)));
  setMeasure("waist", Math.round(rand(60, 96)));
  setMeasure("hips", Math.round(rand(82, 112)));
  setMeasure("shoulders", Math.round(rand(36, 48)));
  setMeasure("inseam", Math.round(rand(68, 86)));
  setMeasure("arm", Math.round(rand(52, 66)));
  controls.hat.checked = Math.random() > 0.55;
  draw();
});

canvas.addEventListener("pointerdown", (event) => {
  dragging = true;
  previousPointer = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  yaw += (event.clientX - previousPointer.x) * 0.008;
  pitch = clamp(pitch + (event.clientY - previousPointer.y) * 0.006, -0.45, 0.45);
  previousPointer = { x: event.clientX, y: event.clientY };
  draw();
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  distance = clamp(distance + event.deltaY * 0.003, 2.35, 4.8);
  draw();
}, { passive: false });

window.addEventListener("resize", draw);

applyPreset("smart");
applyBodyDefaults(getBodyType());
draw();

function bindMeasurement(name, min, max) {
  const range = document.getElementById(`${name}Range`);
  const value = document.getElementById(`${name}Value`);
  const sync = (source) => {
    const next = clamp(Number(source.value || min), min, max);
    range.value = String(next);
    value.value = String(next);
    draw();
  };
  range.addEventListener("input", () => sync(range));
  value.addEventListener("input", () => sync(value));
  return { range, value, min, max };
}

function setMeasure(name, value) {
  measurements[name].range.value = String(value);
  measurements[name].value.value = String(value);
}

function getMeasure(name) {
  return Number(measurements[name].value.value) / 100;
}

function getBodyType() {
  return document.querySelector('input[name="bodyType"]:checked').value;
}

function applyBodyDefaults(type) {
  Object.entries(bodyDefaults[type]).forEach(([name, value]) => setMeasure(name, value));
}

function applyPreset(name) {
  const preset = presets[name];
  controls.preset.value = name;
  controls.topType.value = preset.topType;
  controls.bottomType.value = preset.bottomType;
  controls.layerType.value = preset.layerType;
  controls.dressType.value = preset.dressType;
  controls.topColor.value = preset.topColor;
  controls.bottomColor.value = preset.bottomColor;
  controls.layerColor.value = preset.layerColor;
  updateStatus();
}

function updateStatus() {
  statusText.textContent = BODY_ONLY_MODE ? bodyProfiles[getBodyType()].label : controls.dressType.value !== "none" ? "One-piece outfit" : presets[controls.preset.value].label;
}

function draw() {
  resizeCanvas();
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0.88, 0.93, 0.91, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniform3fv(locations.uLightDir, normalize([0.35, 0.95, 0.62]));
  gl.uniform3fv(locations.uAccent, [0.5, 0.38, 0.28]);

  const shape = getShape();
  const aspect = canvas.width / canvas.height;
  const projection = mat4Perspective(36 * Math.PI / 180, aspect, 0.1, 100);
  const responsiveDistance = distance * (aspect < 0.76 ? 1.24 : 1);
  const eye = [
    Math.sin(yaw) * responsiveDistance,
    shape.eyeLine + pitch * 1.4,
    Math.cos(yaw) * responsiveDistance
  ];
  const view = mat4LookAt(eye, [0, shape.height * 0.48, 0], [0, 1, 0]);
  gl.uniformMatrix4fv(locations.uViewProj, false, mat4Multiply(projection, view));

  drawGround(shape);
  drawAvatar(shape);
}

function getShape() {
  const type = getBodyType();
  const profile = bodyProfiles[type];
  const height = getMeasure("height");
  const build = Number(measurements.build.value.value) / 100;
  const chest = getMeasure("chest");
  const waist = getMeasure("waist");
  const hips = getMeasure("hips");
  const shoulders = getMeasure("shoulders") * profile.shoulderScale;
  const inseam = Math.min(getMeasure("inseam"), height * 0.54);
  const arm = getMeasure("arm");
  const headH = height * (type === "female" ? 0.14 : 0.138);
  const floor = 0;
  const headCenter = height - headH * 0.52;
  const headBottom = headCenter - headH * 0.52;
  const crotch = inseam;
  const shoulderY = height * 0.785;
  const chestY = height * 0.675;
  const waistY = height * (type === "female" ? 0.555 : 0.545);
  const hipY = height * 0.475;
  const ankleY = height * 0.045;
  const neckTop = headBottom + height * 0.01;
  const neckBottom = shoulderY + height * 0.022;
  const buildWidth = 0.94 + build * 0.06;
  const buildDepth = 0.88 + build * 0.12;

  return {
    height,
    build,
    type,
    profile,
    chest,
    waist,
    hips,
    shoulders,
    inseam,
    arm,
    floor,
    headH,
    headCenter,
    neckY: (neckTop + neckBottom) / 2,
    neckHalfH: Math.max((neckTop - neckBottom) / 2, height * 0.018),
    shoulderY,
    chestY,
    waistY,
    hipY,
    crotch,
    kneeY: crotch * 0.52,
    ankleY,
    eyeLine: height * 0.69,
    headX: headH * (type === "female" ? 0.38 : 0.39),
    headZ: headH * 0.34,
    shoulderX: shoulders * 0.5 * buildWidth,
    chestX: Math.max(chest * 0.21 * profile.chestScale, shoulders * 0.45) * buildWidth,
    chestZ: chest * 0.115 * profile.torsoDepth * buildDepth,
    waistX: waist * 0.16 * profile.waistScale * buildWidth,
    waistZ: waist * 0.098 * profile.torsoDepth * buildDepth,
    hipX: hips * 0.185 * profile.hipScale * buildWidth,
    hipZ: hips * 0.115 * (type === "female" ? 1.04 : 0.96) * buildDepth,
    thighX: hips * 0.078 * profile.thighScale * buildWidth,
    calfX: hips * 0.052 * profile.calfScale * (0.96 + build * 0.04),
    limbZ: chest * 0.04 * profile.limbScale * buildDepth
  };
}

function drawAvatar(shape) {
  const skin = hexToRgb(controls.skinColor.value);
  drawBody(shape, skin);
  if (!BODY_ONLY_MODE) {
    const top = hexToRgb(controls.topColor.value);
    const bottom = hexToRgb(controls.bottomColor.value);
    const layer = hexToRgb(controls.layerColor.value);
    const shoe = [0.08, 0.09, 0.09];
    drawClothes(shape, top, bottom, layer, shoe);
  }
}

function getCoverage() {
  const hasDress = controls.dressType.value !== "none";
  const hasTop = controls.topType.value !== "none" || hasDress;
  const hasLongLayer = controls.layerType.value !== "none";
  const bottom = controls.bottomType.value;
  return {
    torso: hasTop,
    upperArm: hasLongLayer || controls.topType.value === "tee" || controls.topType.value === "shirt",
    forearm: hasLongLayer,
    thigh: !hasDress && (bottom === "trousers" || bottom === "jeans"),
    calf: !hasDress && (bottom === "trousers" || bottom === "jeans"),
    foot: controls.shoes.checked
  };
}

function drawBody(shape, skin) {
  drawHeadAndNeck(shape, skin);
  drawTorsoAndPelvis(shape, skin);
  drawArm(-1, shape, skin);
  drawArm(1, shape, skin);
  drawLeg(-1, shape, skin);
  drawLeg(1, shape, skin);
}

// Head and neck: compact forms that overlap the shoulders so the model feels connected.
function drawHeadAndNeck(shape, skin) {
  const profile = shape.profile;
  drawPart(headMesh, skin, [0, shape.headCenter, 0], [shape.headX, shape.headH * 0.52, shape.headZ]);
  drawPart(cylinder, skin, [0, shape.neckY, 0], [shape.headX * 0.34 * profile.neckScale, shape.neckHalfH, shape.headX * 0.31 * profile.neckScale]);
  drawJoint([0, shape.shoulderY + 0.012, 0], [shape.headX * 0.54, 0.032, shape.headX * 0.45], skin);
}

// Torso and pelvis: stylised ribcage, waist, and hip masses with tasteful gender profile offsets.
function drawTorsoAndPelvis(shape, skin) {
  updateProfileMesh(bodyCoreMesh, getBodyCoreProfile(shape));
  drawPart(bodyCoreMesh, skin, [0, 0, 0], [1, 1, 1]);
  drawJoint([-shape.shoulderX * 0.92, shape.shoulderY - 0.025, 0], [shape.limbZ * 1.55, 0.07, shape.limbZ * 1.25], skin, [0, 0, 0.18]);
  drawJoint([shape.shoulderX * 0.92, shape.shoulderY - 0.025, 0], [shape.limbZ * 1.55, 0.07, shape.limbZ * 1.25], skin, [0, 0, -0.18]);
  drawClavicles(shape, skin);
}

function getBodyCoreProfile(shape) {
  const shoulderWidth = Math.max(shape.shoulderX, shape.chestX * 1.02);
  const upperChest = shape.type === "male" ? shape.chestX * 1.04 : shape.chestX * 0.92;
  const lowerRib = shape.type === "male" ? shape.chestX * 0.84 : shape.chestX * 0.76;
  const highHip = shape.type === "female" ? shape.hipX * 0.92 : shape.hipX * 0.82;
  return [
    [shape.crotch + shape.height * 0.025, shape.hipX * 0.48, shape.hipZ * 0.46],
    [shape.hipY - shape.height * 0.05, shape.hipX * 0.98, shape.hipZ * 0.9],
    [shape.hipY + shape.height * 0.025, highHip, shape.hipZ],
    [shape.waistY, shape.waistX, shape.waistZ],
    [shape.chestY - shape.height * 0.06, lowerRib, shape.chestZ * 0.9],
    [shape.chestY + shape.height * 0.015, shape.chestX, shape.chestZ],
    [shape.shoulderY - shape.height * 0.055, upperChest, shape.chestZ * 0.88],
    [shape.shoulderY, shoulderWidth, shape.chestZ * 0.62],
    [shape.shoulderY + shape.height * 0.035, shape.headX * 0.72, shape.headZ * 0.62]
  ];
}

function drawClavicles(shape, skin) {
  const shade = skin.map((value) => value * 0.9);
  const y = shape.shoulderY - shape.height * 0.028;
  const z = shape.chestZ * 0.78;
  drawPart(cylinder, shade, [-shape.shoulderX * 0.2, y, z], [shape.shoulderX * 0.22, 0.004, 0.003], [0, 0, -0.16]);
  drawPart(cylinder, shade, [shape.shoulderX * 0.2, y, z], [shape.shoulderX * 0.22, 0.004, 0.003], [0, 0, 0.16]);
}

// Arms: shoulder, elbow, wrist, and palm forms overlap to avoid a segmented toy look.
function drawArm(side, shape, skin) {
  const upperH = shape.arm * 0.5;
  const lowerH = shape.arm * 0.46;
  const shoulderX = side * shape.shoulderX * 0.92;
  const elbowY = shape.shoulderY - upperH;
  const wristY = elbowY - lowerH;
  drawLimbSegment(armMesh, [shoulderX + side * 0.004, shape.shoulderY - upperH * 0.5, 0], [shape.limbZ * 1.55, upperH * 0.5, shape.limbZ * 1.12], skin, [0, 0, side * 0.1]);
  drawJoint([shoulderX - side * 0.004, elbowY, 0], [shape.limbZ * 1.08, 0.036, shape.limbZ * 0.9], skin);
  drawLimbSegment(forearmMesh, [shoulderX - side * 0.012, elbowY - lowerH * 0.5, 0], [shape.limbZ * 1.08, lowerH * 0.5, shape.limbZ * 0.92], skin, [0, 0, -side * 0.025]);
  drawJoint([shoulderX - side * 0.014, wristY - 0.006, 0], [shape.limbZ * 0.74, 0.024, shape.limbZ * 0.62], skin);
  drawPart(palmMesh, skin, [shoulderX - side * 0.017, wristY - 0.06, 0.02], [shape.limbZ * 1.12, 0.06, shape.limbZ * 0.82], [0, 0, side * 0.02]);
}

// Legs: hip sockets, knees, ankles, and feet are rounded but minimal for a clean demo mannequin.
function drawLeg(side, shape, skin) {
  const thighH = shape.crotch - shape.kneeY;
  const calfH = shape.kneeY - shape.ankleY;
  const legX = side * shape.hipX * (shape.type === "female" ? 0.32 : 0.27);
  drawJoint([legX, shape.crotch + thighH * 0.08, 0], [shape.thighX * 1.35, thighH * 0.14, shape.hipZ * 0.62], skin);
  drawLimbSegment(thighMeshes[shape.type], [legX, shape.kneeY + thighH * 0.5, 0], [shape.thighX * 1.28, thighH * 0.5, shape.hipZ * 0.62], skin);
  drawJoint([legX, shape.kneeY, shape.hipZ * 0.22], [shape.calfX * 1.08, 0.034, shape.hipZ * 0.26], skin);
  drawLimbSegment(calfMeshes[shape.type], [legX, shape.ankleY + calfH * 0.5, 0], [shape.calfX * 1.18, calfH * 0.5, shape.hipZ * 0.5], skin);
  drawJoint([legX, shape.ankleY + 0.006, 0], [shape.calfX * 0.9, 0.022, shape.hipZ * 0.28], skin);
  drawPart(footMesh, skin, [legX, shape.ankleY * 0.5, shape.hipZ * 0.5], [shape.calfX * 1.45, 0.045, shape.hipZ * 1.15], [Math.PI / 2, 0, 0]);
}

function drawClothes(shape, top, bottom, layer, shoe) {
  const ease = controls.layerType.value === "none" ? 0.018 : 0.026;
  const topX = Math.max(shape.chestX, shape.shoulders * 0.42) + ease;
  const topZ = shape.chestZ + ease;
  const topCenter = (shape.shoulderY + shape.waistY) / 2;
  const topHalfH = (shape.shoulderY - shape.waistY) / 2;

  if (controls.dressType.value !== "none") {
    const hemY = controls.dressType.value === "midi" ? shape.kneeY * 0.58 : shape.crotch * 0.76;
    const dressCenter = (shape.shoulderY + hemY) / 2;
    const dressHalfH = (shape.shoulderY - hemY) / 2;
    part(fittedTopMesh, top, [0, dressCenter, 0.006], [Math.max(shape.chestX, shape.hipX) + 0.026, dressHalfH, Math.max(shape.chestZ, shape.hipZ) + 0.026]);
    part(skirtMesh, top, [0, (shape.hipY + hemY) / 2, 0.008], [shape.hipX + 0.05, (shape.hipY - hemY) / 2, shape.hipZ + 0.032]);
  } else {
    if (controls.topType.value !== "none") {
      const shirtDrop = controls.topType.value === "tank" ? shape.waistY + 0.03 : shape.waistY - 0.035;
      part(fittedTopMesh, top, [0, (shape.shoulderY + shirtDrop) / 2, 0.006], [topX, (shape.shoulderY - shirtDrop) / 2, topZ]);
      if (controls.topType.value === "shirt") {
        drawShirtDetails(shape);
      }
      if (controls.topType.value !== "tank") {
        drawSleeve(-1, shape, top, controls.topType.value === "shirt" ? 0.42 : 0.28);
        drawSleeve(1, shape, top, controls.topType.value === "shirt" ? 0.42 : 0.28);
      }
    }

    drawBottom(shape, bottom);
  }

  if (controls.layerType.value !== "none") {
    part(fittedTopMesh, layer, [0, topCenter, 0.002], [topX + 0.038, topHalfH + 0.025, topZ + 0.035]);
    drawSleeve(-1, shape, layer, 0.78);
    drawSleeve(1, shape, layer, 0.78);
    drawLayerDetails(shape);
  }

  if (controls.shoes.checked) {
    const footY = 0.035;
    part(sphere, shoe, [-shape.hipX * 0.42, footY, shape.hipZ * 0.38], [shape.calfX * 1.15, 0.045, shape.hipZ * 0.8]);
    part(sphere, shoe, [shape.hipX * 0.42, footY, shape.hipZ * 0.38], [shape.calfX * 1.15, 0.045, shape.hipZ * 0.8]);
  }

  if (controls.hat.checked) {
    part(cylinder, layer, [0, shape.height + 0.012, 0], [shape.headX * 1.05, 0.035, shape.headZ * 1.04]);
    part(sphere, layer, [0, shape.height - shape.headH * 0.02, shape.headZ * 0.84], [shape.headX * 0.7, 0.018, shape.headZ * 0.36]);
  }
}

function drawSleeve(side, shape, color, lengthRatio) {
  const length = shape.arm * lengthRatio;
  const shoulderX = side * shape.shoulders * 0.5;
  part(armMesh, color, [shoulderX + side * 0.014, shape.shoulderY - length * 0.5, 0.006], [shape.chest * 0.076, length * 0.5, shape.limbZ * 1.18], [0, 0, side * 0.08]);
}

function drawShirtDetails(shape) {
  const seam = [0.78, 0.82, 0.8];
  const button = [0.1, 0.12, 0.12];
  const frontZ = shape.chestZ + 0.027;
  part(cylinder, seam, [0, (shape.shoulderY + shape.waistY) / 2, frontZ], [0.006, (shape.shoulderY - shape.waistY) * 0.46, 0.004], [0, 0, 0]);
  for (let i = 0; i < 4; i += 1) {
    const y = shape.shoulderY - 0.07 - i * 0.075;
    part(sphere, button, [0, y, frontZ + 0.004], [0.012, 0.012, 0.004]);
  }
}

function drawLayerDetails(shape) {
  const trim = [0.08, 0.1, 0.1];
  const frontZ = shape.chestZ + 0.05;
  part(cylinder, trim, [0, (shape.shoulderY + shape.waistY) / 2, frontZ], [0.007, (shape.shoulderY - shape.waistY) * 0.46, 0.004]);
  part(cylinder, trim, [0, shape.waistY - 0.025, frontZ * 0.92], [shape.waistX * 1.08, 0.012, 0.006]);
  for (let i = 0; i < 4; i += 1) {
    const y = shape.shoulderY - 0.075 - i * 0.08;
    part(sphere, trim, [0.018, y, frontZ + 0.004], [0.01, 0.01, 0.004]);
  }
}

function drawBottom(shape, bottom) {
  if (controls.bottomType.value === "skirt") {
    part(skirtMesh, bottom, [0, (shape.waistY + shape.crotch * 0.72) / 2, 0.008], [shape.hipX + 0.04, (shape.waistY - shape.crotch * 0.72) / 2, shape.hipZ + 0.028]);
    part(beltMesh, [0.12, 0.13, 0.13], [0, shape.waistY - 0.01, 0.01], [shape.hipX + 0.026, 0.014, shape.hipZ + 0.022]);
    return;
  }

  if (controls.bottomType.value === "shorts") {
    part(pantsSeatMesh, bottom, [0, (shape.waistY + shape.crotch * 0.88) / 2, 0.008], [shape.hipX + 0.025, (shape.waistY - shape.crotch * 0.88) / 2, shape.hipZ + 0.018]);
    part(beltMesh, [0.12, 0.13, 0.13], [0, shape.waistY - 0.01, 0.01], [shape.hipX + 0.018, 0.012, shape.hipZ + 0.018]);
    return;
  }

  const pantEase = controls.bottomType.value === "jeans" ? 0.012 : 0.022;
  [-1, 1].forEach((side) => {
    const legX = side * shape.hipX * 0.42;
    const thighH = shape.crotch - shape.kneeY;
    const calfH = shape.kneeY - shape.ankleY;
    part(thighMeshes[shape.type], bottom, [legX, shape.kneeY + thighH * 0.5, 0.007], [shape.thighX + pantEase, thighH * 0.5, shape.hipZ * 0.59 + pantEase]);
    part(calfMeshes[shape.type], bottom, [legX, shape.ankleY + calfH * 0.5, 0.007], [shape.calfX + pantEase, calfH * 0.5, shape.hipZ * 0.46 + pantEase]);
  });
  part(pantsSeatMesh, bottom, [0, (shape.waistY + shape.crotch) / 2, 0.008], [shape.hipX + 0.025, (shape.waistY - shape.crotch) / 2, shape.hipZ + 0.018]);
  part(beltMesh, [0.12, 0.13, 0.13], [0, shape.waistY - 0.01, 0.01], [shape.hipX + 0.018, 0.012, shape.hipZ + 0.018]);
}

function drawGround(shape) {
  const platform = [0.48, 0.57, 0.53];
  const shadow = [0.28, 0.36, 0.33];
  drawPart(cylinder, platform, [0, -0.01, 0], [shape.height * 0.32, 0.01, shape.height * 0.32]);
  drawPart(cylinder, shadow, [0, 0.002, 0.05], [shape.height * 0.24, 0.0025, shape.height * 0.13]);
  drawPart(cylinder, shadow, [-shape.hipX * 0.25, 0.005, shape.hipZ * 0.34], [shape.calfX * 1.8, 0.0025, shape.hipZ * 0.82]);
  drawPart(cylinder, shadow, [shape.hipX * 0.25, 0.005, shape.hipZ * 0.34], [shape.calfX * 1.8, 0.0025, shape.hipZ * 0.82]);
}

function drawLimbSegment(mesh, translate, scale, color, rotate = [0, 0, 0]) {
  drawPart(mesh, color, translate, scale, rotate);
}

function drawJoint(translate, scale, color, rotate = [0, 0, 0]) {
  drawPart(sphere, color, translate, scale, rotate);
}

function drawPart(mesh, color, translate, scale, rotate = [0, 0, 0]) {
  part(mesh, color, translate, scale, rotate);
}

function part(mesh, color, translate, scale, rotate = [0, 0, 0]) {
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
  gl.enableVertexAttribArray(locations.aPosition);
  gl.vertexAttribPointer(locations.aPosition, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(locations.aNormal);
  gl.vertexAttribPointer(locations.aNormal, 3, gl.FLOAT, false, 24, 12);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

  const model = mat4Model(translate, rotate, scale);
  gl.uniformMatrix4fv(locations.uModel, false, model);
  gl.uniformMatrix3fv(locations.uNormalMatrix, false, normalMatrix(model));
  gl.uniform3fv(locations.uColor, color);
  gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
}

function createSphere(widthSegments, heightSegments) {
  const vertices = [];
  const indices = [];
  for (let y = 0; y <= heightSegments; y += 1) {
    const v = y / heightSegments;
    const theta = v * Math.PI;
    for (let x = 0; x <= widthSegments; x += 1) {
      const u = x / widthSegments;
      const phi = u * Math.PI * 2;
      const nx = Math.cos(phi) * Math.sin(theta);
      const ny = Math.cos(theta);
      const nz = Math.sin(phi) * Math.sin(theta);
      vertices.push(nx, ny, nz, nx, ny, nz);
    }
  }

  for (let y = 0; y < heightSegments; y += 1) {
    for (let x = 0; x < widthSegments; x += 1) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return uploadMesh(vertices, indices);
}

function createCylinder(segments) {
  return createProfileMesh([[-1, 1, 1], [1, 1, 1]], segments);
}

function createProfileMesh(profile, segments) {
  const vertices = [];
  const indices = [];
  profile.forEach(([y, rx, rz]) => {
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * rx;
      const z = Math.sin(angle) * rz;
      const normal = normalize([Math.cos(angle) / rx, 0.08, Math.sin(angle) / rz]);
      vertices.push(x, y, z, normal[0], normal[1], normal[2]);
    }
  });

  for (let row = 0; row < profile.length - 1; row += 1) {
    for (let i = 0; i < segments; i += 1) {
      const a = row * (segments + 1) + i;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const bottomCenter = vertices.length / 6;
  vertices.push(0, profile[0][0], 0, 0, -1, 0);
  const topCenter = vertices.length / 6;
  vertices.push(0, profile[profile.length - 1][0], 0, 0, 1, 0);
  const topStart = (profile.length - 1) * (segments + 1);
  for (let i = 0; i < segments; i += 1) {
    indices.push(bottomCenter, i + 1, i);
    indices.push(topCenter, topStart + i, topStart + i + 1);
  }
  return uploadMesh(vertices, indices);
}

function createDynamicProfileMesh(ringCount, segments) {
  const vertexCount = ringCount * (segments + 1) + 2;
  const indices = [];
  for (let row = 0; row < ringCount - 1; row += 1) {
    for (let i = 0; i < segments; i += 1) {
      const a = row * (segments + 1) + i;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const bottomCenter = ringCount * (segments + 1);
  const topCenter = bottomCenter + 1;
  const topStart = (ringCount - 1) * (segments + 1);
  for (let i = 0; i < segments; i += 1) {
    indices.push(bottomCenter, i + 1, i);
    indices.push(topCenter, topStart + i, topStart + i + 1);
  }

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexCount * 6), gl.DYNAMIC_DRAW);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return { vertexBuffer, indexBuffer, count: indices.length, ringCount, segments };
}

function updateProfileMesh(mesh, profile) {
  const vertices = [];
  profile.forEach(([y, rx, rz], row) => {
    const prev = profile[Math.max(0, row - 1)];
    const next = profile[Math.min(profile.length - 1, row + 1)];
    const slope = row === 0 || row === profile.length - 1 ? 0 : ((next[1] + next[2]) - (prev[1] + prev[2])) / Math.max(next[0] - prev[0], 0.001);
    for (let i = 0; i <= mesh.segments; i += 1) {
      const angle = (i / mesh.segments) * Math.PI * 2;
      const x = Math.cos(angle) * rx;
      const z = Math.sin(angle) * rz;
      const normal = normalize([Math.cos(angle) / Math.max(rx, 0.001), -slope * 0.22, Math.sin(angle) / Math.max(rz, 0.001)]);
      vertices.push(x, y, z, normal[0], normal[1], normal[2]);
    }
  });

  vertices.push(0, profile[0][0], 0, 0, -1, 0);
  vertices.push(0, profile[profile.length - 1][0], 0, 0, 1, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(vertices));
}

function uploadMesh(vertices, indices) {
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  return { vertexBuffer, indexBuffer, count: indices.length };
}

function createProgram(vsSource, fsSource) {
  const vs = compile(gl.VERTEX_SHADER, vsSource);
  const fs = compile(gl.FRAGMENT_SHADER, fsSource);
  const result = gl.createProgram();
  gl.attachShader(result, vs);
  gl.attachShader(result, fs);
  gl.linkProgram(result);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(result));
  }
  return result;
}

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function resizeCanvas() {
  const width = Math.floor(canvas.clientWidth * window.devicePixelRatio);
  const height = Math.floor(canvas.clientHeight * window.devicePixelRatio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function mat4Identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function mat4Multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      for (let k = 0; k < 4; k += 1) {
        out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
      }
    }
  }
  return out;
}

function mat4Translate(x, y, z) {
  const m = mat4Identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

function mat4Scale(x, y, z) {
  return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
}

function mat4RotateX(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}

function mat4RotateY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

function mat4RotateZ(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function mat4Model(translate, rotate, scale) {
  return mat4Multiply(
    mat4Translate(translate[0], translate[1], translate[2]),
    mat4Multiply(
      mat4Multiply(mat4RotateZ(rotate[2]), mat4Multiply(mat4RotateY(rotate[1]), mat4RotateX(rotate[0]))),
      mat4Scale(scale[0], scale[1], scale[2])
    )
  );
}

function mat4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0
  ];
}

function mat4LookAt(eye, center, up) {
  const z = normalize([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  return [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
  ];
}

function normalMatrix(model) {
  return [
    model[0], model[1], model[2],
    model[4], model[5], model[6],
    model[8], model[9], model[10]
  ];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
