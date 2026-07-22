const { HttpError } = require('./errors.ts');
const {
  assertGarmentCategory,
  buildGarmentDescription,
  sha256Hex,
  garmentId,
  avatarKey,
  garmentOriginalKey,
  garmentCutoutKey,
} = require('./garments.ts');
const { validateSubjectMask } = require('./mask-validation.ts');

type UploadedFile = {
  data: Buffer;
  filename: string;
  mimeType: string;
};

type Storage = {
  exists(key: string): Promise<boolean>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  url(key: string): Promise<string>;
};

type PreprocessResult = { buffer: Buffer; contentType: string };

type PipelineDeps = {
  storage: Storage;
  // Decode, auto-orient, strip EXIF, downscale to <=1536px longest edge, re-encode JPEG.
  preprocess: (buffer: Buffer) => Promise<PreprocessResult>;
  // Local background removal; returns a PNG with an alpha channel.
  removeBackground: (buffer: Buffer) => Promise<Buffer>;
  // Decode a (downscaled) alpha channel from a PNG for mask validation.
  analyzeAlpha: (pngBuffer: Buffer) => Promise<{ alpha: Uint8Array; width: number; height: number }>;
  db: GarmentDb;
  bgRemovalModel: string;
  now?: () => string;
};

type GarmentDb = {
  upsertAvatar(record: AvatarRecord): void;
  getGarmentBySha(userId: string, sha256: string): GarmentRow | undefined;
  insertGarment(record: GarmentRow): void;
};

type AvatarRecord = {
  userId: string;
  sha256: string;
  r2Key: string;
  originalFilename: string;
  createdAt: string;
};

type GarmentRow = {
  id: string;
  userId: string;
  sha256: string;
  category: string;
  name: string;
  originalKey: string;
  cutoutKey: string;
  bgRemovalModel: string;
  originalFilename: string;
  destination: string;
  createdAt: string;
};

type WardrobeItem = {
  id: string;
  userId: string;
  name: string;
  category: string;
  imageUrl: string;
  destination: string;
  createdAt: string;
};

function nowIso(deps: PipelineDeps) {
  return (deps.now ?? (() => new Date().toISOString()))();
}

async function processAvatarUpload(
  input: { userId: string; file: UploadedFile },
  deps: PipelineDeps
): Promise<{ avatarUrl: string }> {
  const { buffer } = await deps.preprocess(input.file.data);
  const sha256 = sha256Hex(buffer);
  const key = avatarKey(input.userId, sha256);

  // Re-uploading the same photo is a no-op on the storage path.
  if (!(await deps.storage.exists(key))) {
    await deps.storage.put(key, buffer, 'image/jpeg');
  }

  deps.db.upsertAvatar({
    userId: input.userId,
    sha256,
    r2Key: key,
    originalFilename: input.file.filename,
    createdAt: nowIso(deps),
  });

  return { avatarUrl: await deps.storage.url(key) };
}

async function processGarmentUpload(
  input: {
    userId: string;
    file: UploadedFile;
    category: string;
    name?: string;
    destination?: string;
  },
  deps: PipelineDeps
): Promise<WardrobeItem> {
  const category = assertGarmentCategory(input.category);
  const destination = input.destination === 'wishlist' ? 'wishlist' : 'closet';
  const { buffer: original } = await deps.preprocess(input.file.data);
  const sha256 = sha256Hex(original);
  const id = garmentId(input.userId, sha256);
  const originalKey = garmentOriginalKey(input.userId, sha256);
  const cutoutKey = garmentCutoutKey(input.userId, sha256);
  const name = input.name?.trim() || defaultName(category);

  // Dedup: an existing cutout means we already ran background removal for these
  // exact bytes. Skip the expensive work and reuse it.
  if (await deps.storage.exists(cutoutKey)) {
    const existing = deps.db.getGarmentBySha(input.userId, sha256);

    if (existing) {
      return toWardrobeItem(existing, await deps.storage.url(existing.cutoutKey));
    }

    const reused: GarmentRow = {
      id,
      userId: input.userId,
      sha256,
      category,
      name,
      originalKey,
      cutoutKey,
      bgRemovalModel: deps.bgRemovalModel,
      originalFilename: input.file.filename,
      destination,
      createdAt: nowIso(deps),
    };
    deps.db.insertGarment(reused);

    return toWardrobeItem(reused, await deps.storage.url(cutoutKey));
  }

  const cutoutPng = await deps.removeBackground(original);
  const { alpha, width, height } = await deps.analyzeAlpha(cutoutPng);
  const validation = validateSubjectMask(alpha, width, height);

  if (!validation.ok) {
    throw new HttpError(422, validation.reason ?? 'The garment photo could not be processed.');
  }

  await deps.storage.put(originalKey, original, 'image/jpeg');
  await deps.storage.put(cutoutKey, cutoutPng, 'image/png');

  const row: GarmentRow = {
    id,
    userId: input.userId,
    sha256,
    category,
    name,
    originalKey,
    cutoutKey,
    bgRemovalModel: deps.bgRemovalModel,
    originalFilename: input.file.filename,
    destination,
    createdAt: nowIso(deps),
  };
  deps.db.insertGarment(row);

  return toWardrobeItem(row, await deps.storage.url(cutoutKey));
}

function toWardrobeItem(row: GarmentRow, imageUrl: string): WardrobeItem {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    category: row.category,
    imageUrl,
    destination: row.destination,
    createdAt: row.createdAt,
  };
}

function defaultName(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

module.exports = {
  processAvatarUpload,
  processGarmentUpload,
  buildGarmentDescription,
};
