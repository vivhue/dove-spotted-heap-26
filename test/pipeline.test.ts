const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  GARMENT_CATEGORIES,
  isGarmentCategory,
  assertGarmentCategory,
  buildGarmentDescription,
  sha256Hex,
  avatarKey,
  garmentOriginalKey,
  garmentCutoutKey,
} = require('../lib/garments.ts');
const { MASK_THRESHOLDS, validateSubjectMask } = require('../lib/mask-validation.ts');
const { processAvatarUpload, processGarmentUpload } = require('../lib/pipeline.ts');
const { HttpError } = require('../lib/errors.ts');

// --- test helpers ------------------------------------------------------------

// A W*H alpha buffer with a solid rectangle [x0,x1) x [y0,y1) as subject.
function alphaRect(width: number, height: number, x0: number, y0: number, x1: number, y1: number) {
  const alpha = new Uint8Array(width * height);
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      alpha[y * width + x] = 255;
    }
  }
  return alpha;
}

function file(bytes: string) {
  return { data: Buffer.from(bytes), filename: 'photo.jpg', mimeType: 'image/jpeg' };
}

function fakeDb() {
  const avatars = new Map<string, unknown>();
  const garments = new Map<string, unknown>();
  const calls = { upsertAvatar: 0, insertGarment: 0 };

  return {
    calls,
    avatars,
    garments,
    upsertAvatar(record: { userId: string }) {
      calls.upsertAvatar += 1;
      avatars.set(record.userId, record);
    },
    getGarmentBySha(userId: string, sha256: string) {
      return garments.get(`${userId}:${sha256}`);
    },
    insertGarment(row: { userId: string; sha256: string }) {
      calls.insertGarment += 1;
      garments.set(`${row.userId}:${row.sha256}`, row);
    },
  };
}

function fakeStorage(existing: Set<string> = new Set()) {
  const puts: Array<{ key: string; contentType: string }> = [];

  return {
    puts,
    existing,
    async exists(key: string) {
      return existing.has(key);
    },
    async put(key: string, _body: Buffer, contentType: string) {
      puts.push({ key, contentType });
      existing.add(key);
    },
    async url(key: string) {
      return `https://r2.example/${key}?signed=1`;
    },
  };
}

const passingAlpha = () => ({ alpha: alphaRect(20, 20, 6, 6, 14, 14), width: 20, height: 20 });

function deps(overrides: Record<string, unknown> = {}) {
  const removeCalls = { count: 0 };
  return {
    removeCalls,
    value: {
      storage: fakeStorage(),
      preprocess: async (buffer: Buffer) => ({ buffer, contentType: 'image/jpeg' }),
      removeBackground: async (buffer: Buffer) => {
        removeCalls.count += 1;
        return Buffer.concat([Buffer.from('cutout:'), buffer]);
      },
      analyzeAlpha: async () => passingAlpha(),
      db: fakeDb(),
      bgRemovalModel: 'isnet-general-use',
      now: () => '2026-01-01T00:00:00.000Z',
      ...overrides,
    },
  };
}

// --- categories --------------------------------------------------------------

test('exactly four garment categories are permitted', () => {
  assert.deepEqual([...GARMENT_CATEGORIES], ['shirt', 'dress', 'shorts', 'pants']);
});

test('category guards accept the four values and reject anything else', () => {
  for (const value of GARMENT_CATEGORIES) {
    assert.equal(isGarmentCategory(value), true);
    assert.equal(assertGarmentCategory(value), value);
  }
  for (const bad of ['tops', 'shoes', 'accessories', 'other', '', 'Shirt', null]) {
    assert.equal(isGarmentCategory(bad), false);
    assert.throws(() => assertGarmentCategory(bad), /Invalid garment category/);
  }
});

test('buildGarmentDescription uses the category, and the name when present', () => {
  assert.equal(buildGarmentDescription('shirt'), 'A shirt');
  assert.equal(buildGarmentDescription('pants', '  '), 'A pants');
  assert.equal(buildGarmentDescription('dress', 'Red Silk'), 'Red Silk, a dress');
});

test('hashing is deterministic and keys follow the documented layout', () => {
  const hash = sha256Hex(Buffer.from('same-bytes'));
  assert.equal(hash, sha256Hex(Buffer.from('same-bytes')));
  assert.equal(hash.length, 64);
  assert.equal(avatarKey('u1', hash), `avatars/u1/${hash}.jpg`);
  assert.equal(garmentOriginalKey('u1', hash), `garments/u1/${hash}/original.jpg`);
  assert.equal(garmentCutoutKey('u1', hash), `garments/u1/${hash}/cutout.png`);
});

// --- mask validation ---------------------------------------------------------

test('a well-framed single subject passes', () => {
  const result = validateSubjectMask(alphaRect(20, 20, 6, 6, 14, 14), 20, 20);
  assert.equal(result.ok, true, result.reason);
});

test('a subject that is too small is rejected', () => {
  // 2x2 of 400 px = 1% coverage, below MIN_COVERAGE.
  const result = validateSubjectMask(alphaRect(20, 20, 9, 9, 11, 11), 20, 20);
  assert.equal(result.ok, false);
  assert.ok(result.metrics.coverage < MASK_THRESHOLDS.MIN_COVERAGE);
  assert.match(result.reason, /too small/);
});

test('a subject that fills the whole frame is rejected', () => {
  const result = validateSubjectMask(alphaRect(20, 20, 0, 0, 20, 20), 20, 20);
  assert.equal(result.ok, false);
  assert.match(result.reason, /too much|cut off/);
});

test('two separate blobs (group shot / flat-lay) are rejected', () => {
  const alpha = new Uint8Array(20 * 20);
  // two equal 5x5 blocks with a gap -> dominant ratio 0.5
  for (let y = 6; y < 11; y += 1) {
    for (let x = 2; x < 7; x += 1) alpha[y * 20 + x] = 255;
    for (let x = 13; x < 18; x += 1) alpha[y * 20 + x] = 255;
  }
  const result = validateSubjectMask(alpha, 20, 20);
  assert.equal(result.ok, false);
  assert.ok(result.metrics.dominantRatio < MASK_THRESHOLDS.DOMINANT_COMPONENT_RATIO);
  assert.match(result.reason, /Multiple items/);
});

test('a subject clipped at an edge is rejected', () => {
  // A block spanning the full top edge -> maxEdgeFraction 1.0
  const result = validateSubjectMask(alphaRect(20, 20, 0, 0, 20, 8), 20, 20);
  assert.equal(result.ok, false);
  assert.ok(result.metrics.maxEdgeFraction > MASK_THRESHOLDS.EDGE_CLIP_MAX_FRACTION);
});

// --- avatar pipeline ---------------------------------------------------------

test('avatar upload stores the photo and records the row', async () => {
  const d = deps();
  const result = await processAvatarUpload({ userId: 'u1', file: file('photo-bytes') }, d.value);

  assert.match(result.avatarUrl, /^https:\/\/r2\.example\/avatars\/u1\//);
  assert.equal(d.value.storage.puts.length, 1);
  assert.equal(d.value.db.calls.upsertAvatar, 1);
});

test('re-uploading the same avatar skips the storage write (dedup)', async () => {
  const d = deps();
  await processAvatarUpload({ userId: 'u1', file: file('same') }, d.value);
  const putsAfterFirst = d.value.storage.puts.length;
  await processAvatarUpload({ userId: 'u1', file: file('same') }, d.value);

  assert.equal(d.value.storage.puts.length, putsAfterFirst, 'second upload must not write again');
});

// --- garment pipeline --------------------------------------------------------

test('garment upload runs background removal, validates, stores both files', async () => {
  const d = deps();
  const item = await processGarmentUpload(
    { userId: 'u1', file: file('garment'), category: 'shirt', name: 'Blue Tee' },
    d.value
  );

  assert.equal(d.removeCalls.count, 1);
  assert.equal(item.category, 'shirt');
  assert.equal(item.name, 'Blue Tee');
  // both original.jpg and cutout.png written
  assert.equal(d.value.storage.puts.length, 2);
  assert.ok(d.value.storage.puts.some((p) => p.key.endsWith('/original.jpg')));
  assert.ok(d.value.storage.puts.some((p) => p.key.endsWith('/cutout.png')));
  assert.match(item.imageUrl, /cutout\.png/);
  assert.equal(d.value.db.calls.insertGarment, 1);
});

test('re-uploading the same garment skips background removal (dedup short-circuit)', async () => {
  const d = deps();
  await processGarmentUpload({ userId: 'u1', file: file('same-garment'), category: 'pants' }, d.value);
  const firstRemoveCount = d.removeCalls.count;

  const again = await processGarmentUpload(
    { userId: 'u1', file: file('same-garment'), category: 'pants' },
    d.value
  );

  assert.equal(d.removeCalls.count, firstRemoveCount, 'background removal must not run twice');
  assert.match(again.imageUrl, /cutout\.png/);
});

test('an invalid category is rejected before any processing', async () => {
  const d = deps();
  await assert.rejects(
    processGarmentUpload({ userId: 'u1', file: file('x'), category: 'shoes' }, d.value),
    /Invalid garment category/
  );
  assert.equal(d.removeCalls.count, 0);
  assert.equal(d.value.storage.puts.length, 0);
});

test('a failed mask check rejects with a readable error and stores nothing', async () => {
  const d = deps({ analyzeAlpha: async () => ({ alpha: alphaRect(20, 20, 9, 9, 11, 11), width: 20, height: 20 }) });
  await assert.rejects(
    processGarmentUpload({ userId: 'u1', file: file('bad'), category: 'dress' }, d.value),
    (error: unknown) => error instanceof HttpError && error.status === 422
  );
  assert.equal(d.value.storage.puts.length, 0, 'nothing should be stored when validation fails');
  assert.equal(d.value.db.calls.insertGarment, 0);
});
