const crypto = require('node:crypto');

// Single source of truth for garment categories. Any value outside this set is
// rejected at the API boundary and cannot reach storage or IDM-VTON.
const GARMENT_CATEGORIES = ['shirt', 'dress', 'shorts', 'pants'] as const;

type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];

function isGarmentCategory(value: unknown): value is GarmentCategory {
  return typeof value === 'string' && (GARMENT_CATEGORIES as readonly string[]).includes(value);
}

function assertGarmentCategory(value: unknown): GarmentCategory {
  if (!isGarmentCategory(value)) {
    throw new Error(
      `Invalid garment category. Expected one of: ${GARMENT_CATEGORIES.join(', ')}.`
    );
  }

  return value;
}

// garment_des string handed to IDM-VTON. The category is always present; the
// user-supplied name (if any) is prepended for a richer description.
function buildGarmentDescription(category: GarmentCategory, name?: string): string {
  const cleanName = name?.trim();

  return cleanName ? `${cleanName}, a ${category}` : `A ${category}`;
}

function sha256Hex(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// garments.id is a global PRIMARY KEY, so it cannot be the content hash alone:
// two users saving the same product photo would collide on insert. Storage keys
// are already namespaced by user, so the row id is too. Hashed rather than
// concatenated to keep ids opaque, fixed-length, and safe inside an object key.
// The NUL separator cannot appear in a user id, so (user, sha) maps 1:1.
function garmentId(userId: string, sha256: string): string {
  return sha256Hex(Buffer.from(`${userId}\u0000${sha256}`, 'utf8'));
}

function avatarKey(userId: string, sha256: string): string {
  return `avatars/${userId}/${sha256}.jpg`;
}

function garmentOriginalKey(userId: string, sha256: string): string {
  return `garments/${userId}/${sha256}/original.jpg`;
}

function garmentCutoutKey(userId: string, sha256: string): string {
  return `garments/${userId}/${sha256}/cutout.png`;
}

function resultKey(userId: string, id: string): string {
  return `results/${userId}/${id}.png`;
}

module.exports = {
  GARMENT_CATEGORIES,
  isGarmentCategory,
  assertGarmentCategory,
  buildGarmentDescription,
  sha256Hex,
  garmentId,
  avatarKey,
  garmentOriginalKey,
  garmentCutoutKey,
  resultKey,
};
