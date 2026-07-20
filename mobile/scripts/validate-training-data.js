const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const labelsPath = path.join(root, 'training', 'labels.sample.json');
const outfitsPath = path.join(root, 'training', 'outfits.sample.json');
const occasionsPath = path.join(root, 'training', 'occasions.sample.json');
const imagesDir = path.join(root, 'training', 'images');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(message) {
  console.error(`\n[training validation] ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[training validation] ${message}`);
}

const labels = readJson(labelsPath);
const outfits = readJson(outfitsPath);
const occasions = readJson(occasionsPath);
const imageFiles = new Set(
  fs.readdirSync(imagesDir).map((fileName) => fileName.toLowerCase())
);

if (!Array.isArray(labels.items) || labels.items.length === 0) {
  fail('labels.sample.json must contain a non-empty items array.');
}

if (!Array.isArray(outfits) || outfits.length === 0) {
  fail('outfits.sample.json must contain at least one outfit.');
}

if (!Array.isArray(occasions) || occasions.length === 0) {
  fail('occasions.sample.json must contain at least one occasion.');
}

const seenIds = new Set();
const seenImages = new Map();

for (const item of labels.items ?? []) {
  if (seenIds.has(item.id)) {
    fail(`Duplicate label id found: ${item.id}`);
  }
  seenIds.add(item.id);

  if (!item.image) {
    fail(`Missing image value for label ${item.id}`);
    continue;
  }

  if (!imageFiles.has(item.image.toLowerCase())) {
    fail(`Missing image file for label ${item.id}: ${item.image}`);
  }

  if (!Array.isArray(item.seasons)) {
    fail(`Label ${item.id} must use seasons[] instead of season.`);
  }

  if (item.imageRole && !['single-item', 'composite-look'].includes(item.imageRole)) {
    fail(`Label ${item.id} has invalid imageRole: ${item.imageRole}`);
  }

  const list = seenImages.get(item.image) ?? [];
  list.push(item.id);
  seenImages.set(item.image, list);
}

for (const outfit of outfits) {
  if (!Array.isArray(outfit.items) || outfit.items.length === 0) {
    fail(`Outfit ${outfit.id} must contain at least one item reference.`);
  }

  for (const ref of outfit.items) {
    if (!seenIds.has(ref)) {
      fail(`Outfit ${outfit.id} references unknown label id: ${ref}`);
    }
  }
}

for (const occasion of occasions) {
  if (!occasion.id || !occasion.title) {
    fail('Each occasion entry must have id and title.');
  }
}

for (const [image, ids] of seenImages.entries()) {
  if (ids.length > 1) {
    const missingRole = ids.filter((id) => {
      const item = labels.items.find((entry) => entry.id === id);
      return item?.imageRole !== 'composite-look';
    });

    if (missingRole.length > 0) {
      warn(`Image ${image} is reused by ${ids.join(', ')} but some labels are missing imageRole=composite-look.`);
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[training validation] OK');
