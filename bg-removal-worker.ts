// Background-removal worker. Runs in a worker_thread so the CPU-bound ONNX
// inference never blocks the main HTTP event loop. The model is loaded and
// warmed once at startup and reused for every job.
//
// Weights ship bundled inside @imgly/background-removal-node (content-addressed
// chunks under dist/), so there is no first-run network download and cold starts
// stay local. BG_REMOVAL_MODEL_CACHE_DIR is honored for any onnxruntime scratch.

const { parentPort } = require('node:worker_threads');
const sharp = require('sharp');
const { removeBackground } = require('@imgly/background-removal-node');

// The env contract (BG_REMOVAL_MODEL, default "isnet-general-use") predates this
// library's small/medium/large naming. Map known aliases; pass through if the
// caller already used a native value.
function resolveModel(name: string): 'small' | 'medium' | 'large' {
  const value = name.trim().toLowerCase();

  if (value === 'small' || value === 'medium' || value === 'large') {
    return value;
  }

  if (value === 'u2netp' || value === 'isnet_fp16' || value === 'isnet_quint8') {
    return 'small';
  }

  // isnet-general-use, isnet, u2net, and anything unknown -> balanced default.
  return 'medium';
}

const model = resolveModel(process.env.BG_REMOVAL_MODEL || 'isnet-general-use');
const config = { model, output: { format: 'image/png' as const }, debug: false };

// The server preprocesses every upload to JPEG before sending it here. imgly
// sniffs the format from the Blob's type, so it must be set explicitly.
async function runRemoval(input: Buffer): Promise<Buffer> {
  const blob = await removeBackground(new Blob([new Uint8Array(input)], { type: 'image/jpeg' }), config);
  return Buffer.from(await blob.arrayBuffer());
}

async function warmUp() {
  try {
    const sample = await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 120, g: 120, b: 120 } },
    })
      .jpeg()
      .toBuffer();
    await runRemoval(sample);
  } catch {
    // A failed warm-up is not fatal; the first real job will surface any error.
  }
}

if (!parentPort) {
  throw new Error('bg-removal-worker must be run as a worker thread.');
}

warmUp().then(() => {
  parentPort.postMessage({ type: 'ready', model });
});

parentPort.on('message', async (message: { type: string; jobId: string; buffer: Buffer }) => {
  if (message.type !== 'job') {
    return;
  }

  try {
    const cutout = await runRemoval(Buffer.from(message.buffer));
    parentPort.postMessage({ type: 'result', jobId: message.jobId, buffer: cutout });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Background removal failed.';
    parentPort.postMessage({ type: 'error', jobId: message.jobId, error: reason });
  }
});
