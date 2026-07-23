const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const { HttpError } = require('./lib/errors.ts');
const {
  GARMENT_CATEGORIES,
  GARMENT_FITS,
  isGarmentCategory,
  isGarmentFit,
  garmentCutoutKey,
  resultKey,
} = require('./lib/garments.ts');
const {
  processAvatarUpload,
  processGarmentUpload,
  buildGarmentDescription,
} = require('./lib/pipeline.ts');

type UploadedFile = {
  data: Buffer;
  filename: string;
  mimeType: string;
};

type MultipartPayload = {
  fields: Record<string, string>;
  files: Record<string, UploadedFile>;
};

type ClosetChatRequest = {
  bodyProfile?: {
    chestCm: number | null;
    derivedShape: string | null;
    heightCm: number | null;
    hipsCm: number | null;
    inseamCm: number | null;
    legTorsoRatio: string | null;
    waistCm: number | null;
  };
  chatMode?: 'closet' | 'shopping';
  closetItems?: {
    category?: string;
    color?: string;
    id?: string;
    name?: string;
    pattern?: string;
    primaryColor?: string;
    subcategory?: string;
    tags?: string[];
    texture?: string;
  }[];
  colorProfile?: {
    avoidPalette?: string[];
    contrastLevel?: string | null;
    recommendedPalette?: string[];
    undertone?: string | null;
  };
  currentUser?: {
    gender?: 'female' | 'male';
    username?: string;
  } | null;
  hasAttachedImage?: boolean;
  message?: string;
  selectedClosetItems?: {
    category?: string;
    color?: string;
    id?: string;
    name?: string;
    pattern?: string;
    primaryColor?: string;
    subcategory?: string;
    tags?: string[];
    texture?: string;
  }[];
  styleProfile?: {
    bottomFitPref?: string | null;
    tags?: string[];
    topFitPref?: string | null;
  };
  wishlistItems?: {
    category?: string;
    color?: string;
    id?: string;
    name?: string;
    pattern?: string;
    primaryColor?: string;
    subcategory?: string;
    tags?: string[];
    texture?: string;
  }[];
};

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const maxUploadBytes = Number(process.env.MAX_UPLOAD_MB || 15) * 1024 * 1024;
const presignExpiresSeconds = Number(process.env.PRESIGN_EXPIRES_SECONDS || 604800);
const bgRemovalModel = process.env.BG_REMOVAL_MODEL || 'isnet-general-use';
const idmVtonSpace = process.env.IDM_VTON_SPACE || 'yisol/IDM-VTON';

const staticTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

function send(res: typeof http.ServerResponse.prototype, status: number, body: string | Buffer, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': type,
  });
  res.end(body);
}

function sendJson(res: typeof http.ServerResponse.prototype, status: number, body: unknown) {
  send(res, status, JSON.stringify(body), 'application/json; charset=utf-8');
}

const server = http.createServer(async (req: typeof http.IncomingMessage.prototype, res: typeof http.ServerResponse.prototype) => {
  try {
    if (req.method === 'OPTIONS') {
      send(res, 204, '');
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    console.log(`${req.method} ${url.pathname}${url.search}`);

    if (req.method === 'POST' && url.pathname === '/api/avatar') {
      sendJson(res, 200, await handleAvatarUpload(req));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/avatar') {
      const userId = url.searchParams.get('userId')?.trim() || 'demo-user';
      sendJson(res, 200, await handleGetAvatar(userId));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/garments') {
      sendJson(res, 201, await handleGarmentUpload(req));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/garments') {
      const userId = url.searchParams.get('userId')?.trim() || 'demo-user';
      sendJson(res, 200, await handleListGarments(userId));
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/garments/')) {
      const garmentId = decodeURIComponent(url.pathname.slice('/api/garments/'.length));
      const userId = url.searchParams.get('userId')?.trim() || 'demo-user';
      sendJson(res, 200, await handleDeleteGarment(userId, garmentId));
      return;
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/garments/')) {
      const garmentId = decodeURIComponent(url.pathname.slice('/api/garments/'.length));
      sendJson(res, 200, await handleUpdateGarment(garmentId, req));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/try-on') {
      sendJson(res, 200, await handleTryOn(req));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/try-on') {
      const userId = url.searchParams.get('userId')?.trim() || 'demo-user';
      sendJson(res, 200, await handleListTryOns(userId));
      return;
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/try-on/')) {
      const resultId = decodeURIComponent(url.pathname.slice('/api/try-on/'.length));
      sendJson(res, 200, await handleUpdateTryOn(resultId, req));
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/try-on/')) {
      const resultId = decodeURIComponent(url.pathname.slice('/api/try-on/'.length));
      const userId = url.searchParams.get('userId')?.trim() || 'demo-user';
      sendJson(res, 200, await handleDeleteTryOn(userId, resultId));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      sendJson(res, 200, await handleChat(req));
      return;
    }

    serveStatic(url, res);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unexpected server error.';

    if (status >= 500) {
      console.error(error);
    }

    sendJson(res, status, { error: message });
  }
});

// ---------------------------------------------------------------------------
// R2 storage (S3-compatible). Bucket is private; clients get presigned GET URLs.
// ---------------------------------------------------------------------------

let s3Client: unknown;

function getS3() {
  if (!s3Client) {
    const { S3Client } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  return s3Client;
}

const storage = {
  async exists(key: string): Promise<boolean> {
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');

    try {
      await getS3().send(new HeadObjectCommand({ Bucket: requireEnv('R2_BUCKET'), Key: key }));
      return true;
    } catch (error) {
      if (isNotFound(error)) {
        return false;
      }

      throw error;
    }
  },
  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await getS3().send(
      new PutObjectCommand({ Bucket: requireEnv('R2_BUCKET'), Key: key, Body: body, ContentType: contentType })
    );
  },
  async get(key: string): Promise<Buffer> {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const response = await getS3().send(new GetObjectCommand({ Bucket: requireEnv('R2_BUCKET'), Key: key }));
    return Buffer.from(await response.Body.transformToByteArray());
  },
  async url(key: string): Promise<string> {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    return getSignedUrl(
      getS3(),
      new GetObjectCommand({ Bucket: requireEnv('R2_BUCKET'), Key: key }),
      { expiresIn: presignExpiresSeconds }
    );
  },
  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

    try {
      await getS3().send(new DeleteObjectCommand({ Bucket: requireEnv('R2_BUCKET'), Key: key }));
    } catch (error) {
      // Deleting an already-gone object is a success for our purposes.
      if (!isNotFound(error)) {
        throw error;
      }
    }
  },
};

function isNotFound(error: unknown): boolean {
  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
  const name = (error as { name?: string })?.name;
  return status === 404 || name === 'NotFound' || name === 'NoSuchKey';
}

// ---------------------------------------------------------------------------
// SQLite metadata store
// ---------------------------------------------------------------------------

let dbInstance: unknown;

function getRawDb() {
  if (!dbInstance) {
    const { DatabaseSync } = require('node:sqlite');
    const dbPath = process.env.APP_DB_PATH || path.join(root, 'data', 'app.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS avatars (
        user_id TEXT PRIMARY KEY,
        sha256 TEXT NOT NULL,
        r2_key TEXT NOT NULL,
        original_filename TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS garments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('shirt','dress','shorts','pants')),
        name TEXT NOT NULL,
        original_key TEXT NOT NULL,
        cutout_key TEXT NOT NULL,
        bg_removal_model TEXT,
        original_filename TEXT,
        destination TEXT NOT NULL DEFAULT 'closet',
        created_at TEXT NOT NULL,
        UNIQUE (user_id, sha256)
      );
      CREATE TABLE IF NOT EXISTS tryon_results (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        garment_id TEXT NOT NULL,
        r2_key TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Optional descriptive attributes, added after the initial schema shipped.
    // ALTER TABLE ADD COLUMN throws if the column already exists, which makes
    // this an idempotent poor-man's migration.
    for (const column of ['primary_color TEXT', 'price TEXT', 'fit TEXT', 'source TEXT', 'notes TEXT']) {
      try {
        db.exec(`ALTER TABLE garments ADD COLUMN ${column}`);
      } catch {
        // Column already exists.
      }
    }

    for (const column of ['liked INTEGER NOT NULL DEFAULT 0', 'saved INTEGER NOT NULL DEFAULT 0']) {
      try {
        db.exec(`ALTER TABLE tryon_results ADD COLUMN ${column}`);
      } catch {
        // Column already exists.
      }
    }

    dbInstance = db;
  }

  return dbInstance as {
    prepare(sql: string): { run(...args: unknown[]): unknown; get(...args: unknown[]): unknown; all(...args: unknown[]): unknown[] };
  };
}

function rowToGarment(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    sha256: String(row.sha256),
    category: String(row.category),
    name: String(row.name),
    originalKey: String(row.original_key),
    cutoutKey: String(row.cutout_key),
    bgRemovalModel: row.bg_removal_model == null ? '' : String(row.bg_removal_model),
    originalFilename: row.original_filename == null ? '' : String(row.original_filename),
    destination: String(row.destination),
    createdAt: String(row.created_at),
    primaryColor: row.primary_color == null ? '' : String(row.primary_color),
    price: row.price == null ? '' : String(row.price),
    fit: row.fit == null ? '' : String(row.fit),
    source: row.source == null ? '' : String(row.source),
    notes: row.notes == null ? '' : String(row.notes),
  };
}

const db = {
  upsertAvatar(record: { userId: string; sha256: string; r2Key: string; originalFilename: string; createdAt: string }) {
    getRawDb()
      .prepare(
        `INSERT INTO avatars (user_id, sha256, r2_key, original_filename, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           sha256 = excluded.sha256,
           r2_key = excluded.r2_key,
           original_filename = excluded.original_filename,
           created_at = excluded.created_at`
      )
      .run(record.userId, record.sha256, record.r2Key, record.originalFilename, record.createdAt);
  },
  getAvatar(userId: string) {
    const row = getRawDb().prepare('SELECT * FROM avatars WHERE user_id = ?').get(userId) as
      | Record<string, unknown>
      | undefined;
    return row ? { userId: String(row.user_id), sha256: String(row.sha256), r2Key: String(row.r2_key) } : undefined;
  },
  getGarmentBySha(userId: string, sha256: string) {
    const row = getRawDb().prepare('SELECT * FROM garments WHERE user_id = ? AND sha256 = ?').get(userId, sha256) as
      | Record<string, unknown>
      | undefined;
    return row ? rowToGarment(row) : undefined;
  },
  getGarmentById(userId: string, id: string) {
    const row = getRawDb().prepare('SELECT * FROM garments WHERE user_id = ? AND id = ?').get(userId, id) as
      | Record<string, unknown>
      | undefined;
    return row ? rowToGarment(row) : undefined;
  },
  insertGarment(row: {
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
    primaryColor?: string;
    price?: string;
    fit?: string;
    source?: string;
    notes?: string;
  }) {
    getRawDb()
      .prepare(
        `INSERT INTO garments
           (id, user_id, sha256, category, name, original_key, cutout_key, bg_removal_model, original_filename, destination, created_at,
            primary_color, price, fit, source, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, sha256) DO NOTHING`
      )
      .run(
        row.id,
        row.userId,
        row.sha256,
        row.category,
        row.name,
        row.originalKey,
        row.cutoutKey,
        row.bgRemovalModel,
        row.originalFilename,
        row.destination,
        row.createdAt,
        row.primaryColor ?? null,
        row.price ?? null,
        row.fit ?? null,
        row.source ?? null,
        row.notes ?? null
      );
  },
  listGarments(userId: string) {
    return (getRawDb().prepare('SELECT * FROM garments WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Record<
      string,
      unknown
    >[]).map(rowToGarment);
  },
  insertResult(record: { id: string; userId: string; garmentId: string; r2Key: string; createdAt: string }) {
    getRawDb()
      .prepare('INSERT INTO tryon_results (id, user_id, garment_id, r2_key, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(record.id, record.userId, record.garmentId, record.r2Key, record.createdAt);
  },
  listResults(userId: string) {
    return getRawDb()
      .prepare(
        `SELECT tryon_results.id, tryon_results.garment_id, tryon_results.r2_key, tryon_results.created_at,
                tryon_results.liked, tryon_results.saved,
                garments.name AS garment_name
         FROM tryon_results
         LEFT JOIN garments ON garments.id = tryon_results.garment_id AND garments.user_id = tryon_results.user_id
         WHERE tryon_results.user_id = ?
         ORDER BY tryon_results.created_at DESC`
      )
      .all(userId) as Record<string, unknown>[];
  },
  getResult(userId: string, resultId: string) {
    return getRawDb().prepare('SELECT * FROM tryon_results WHERE user_id = ? AND id = ?').get(userId, resultId) as
      | Record<string, unknown>
      | undefined;
  },
  updateResult(userId: string, resultId: string, changes: { liked?: boolean; saved?: boolean }) {
    if (changes.liked !== undefined) {
      getRawDb().prepare('UPDATE tryon_results SET liked = ? WHERE user_id = ? AND id = ?').run(changes.liked ? 1 : 0, userId, resultId);
    }
    if (changes.saved !== undefined) {
      getRawDb().prepare('UPDATE tryon_results SET saved = ? WHERE user_id = ? AND id = ?').run(changes.saved ? 1 : 0, userId, resultId);
    }
  },
  deleteResult(userId: string, resultId: string) {
    getRawDb().prepare('DELETE FROM tryon_results WHERE user_id = ? AND id = ?').run(userId, resultId);
  },
  updateGarment(userId: string, garmentId: string, changes: Record<string, string | null>) {
    const columns = Object.keys(changes);

    if (columns.length === 0) {
      return;
    }

    // Column names only ever come from the fixed allow-list in
    // handleUpdateGarment, never from user input.
    const setClause = columns.map((column) => `${column} = ?`).join(', ');
    getRawDb()
      .prepare(`UPDATE garments SET ${setClause} WHERE user_id = ? AND id = ?`)
      .run(...Object.values(changes), userId, garmentId);
  },
  listResultKeysForGarment(userId: string, garmentId: string) {
    return (
      getRawDb()
        .prepare('SELECT r2_key FROM tryon_results WHERE user_id = ? AND garment_id = ?')
        .all(userId, garmentId) as Record<string, unknown>[]
    ).map((row) => String(row.r2_key));
  },
  deleteGarment(userId: string, garmentId: string) {
    getRawDb().prepare('DELETE FROM tryon_results WHERE user_id = ? AND garment_id = ?').run(userId, garmentId);
    getRawDb().prepare('DELETE FROM garments WHERE user_id = ? AND id = ?').run(userId, garmentId);
  },
};

// ---------------------------------------------------------------------------
// Image processing
// ---------------------------------------------------------------------------

async function preprocess(buffer: Buffer): Promise<{ buffer: Buffer; contentType: string }> {
  // failOn:'error' instead of sharp's default 'warning'. Phone and social-media
  // JPEGs routinely carry recoverable defects ("extraneous bytes before marker",
  // unlinkable ICC profiles) that libjpeg decodes fine; at the default those
  // warnings become thrown errors and reject a perfectly good photo. Genuinely
  // broken files still fail here, and re-encoding below emits a clean buffer.
  const out = await sharp(buffer, { failOn: 'error' })
    .rotate() // auto-orient from EXIF; re-encoding below drops the EXIF block
    .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  return { buffer: out, contentType: 'image/jpeg' };
}

// Downscaled alpha channel for mask validation. Full resolution is unnecessary
// and expensive for connected-component analysis.
async function analyzeAlpha(pngBuffer: Buffer): Promise<{ alpha: Uint8Array; width: number; height: number }> {
  const { data, info } = await sharp(pngBuffer)
    .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const alpha = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    alpha[i] = data[i * channels + (channels - 1)];
  }

  return { alpha, width, height };
}

// Flatten the transparent cutout onto solid white. Gradio flattens alpha to
// black otherwise, which is worse than any real background.
async function compositeOnWhite(cutoutPng: Buffer): Promise<Buffer> {
  return sharp(cutoutPng).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
}

// ---------------------------------------------------------------------------
// Background-removal worker (single persistent worker_thread)
// ---------------------------------------------------------------------------

let bgWorker: { postMessage(msg: unknown): void; on(event: string, handler: (arg: unknown) => void): void } | null = null;
let bgReady: Promise<void> | null = null;
let bgJobSeq = 0;
const bgJobs = new Map<string, { resolve: (buffer: Buffer) => void; reject: (error: Error) => void }>();

function getBgWorker() {
  if (bgWorker) {
    return bgWorker;
  }

  const { Worker } = require('node:worker_threads');
  const worker = new Worker(path.join(root, 'bg-removal-worker.ts'), {
    execArgv: ['--experimental-strip-types'],
    env: process.env,
  });

  let markReady: () => void;
  bgReady = new Promise<void>((resolve) => {
    markReady = resolve;
  });

  worker.on('message', (message: { type: string; jobId?: string; buffer?: Buffer; error?: string }) => {
    if (message.type === 'ready') {
      markReady();
      return;
    }

    if (!message.jobId) {
      return;
    }

    const job = bgJobs.get(message.jobId);

    if (!job) {
      return;
    }

    bgJobs.delete(message.jobId);

    if (message.type === 'result' && message.buffer) {
      job.resolve(Buffer.from(message.buffer));
    } else {
      job.reject(new HttpError(502, message.error || 'Background removal failed.'));
    }
  });

  worker.on('error', (error: Error) => {
    for (const job of bgJobs.values()) {
      job.reject(error);
    }
    bgJobs.clear();
    bgWorker = null;
    bgReady = null;
  });

  worker.on('exit', () => {
    bgWorker = null;
    bgReady = null;
  });

  bgWorker = worker;
  return worker;
}

async function removeBackground(buffer: Buffer): Promise<Buffer> {
  getBgWorker();
  await bgReady;
  const jobId = String((bgJobSeq += 1));

  return new Promise<Buffer>((resolve, reject) => {
    bgJobs.set(jobId, { resolve, reject });
    getBgWorker().postMessage({ type: 'job', jobId, buffer });
  });
}

// ---------------------------------------------------------------------------
// IDM-VTON (Gradio Space)
// ---------------------------------------------------------------------------

async function runIdmVton(input: { avatarUrl: string; garmentImage: Buffer; garmentDes: string }): Promise<string> {
  const { Client, handle_file } = await import('@gradio/client');

  const attempt = async (): Promise<string> => {
    const app = await Client.connect(idmVtonSpace);
    const result = await app.predict('/tryon', {
      dict: { background: handle_file(input.avatarUrl), layers: [], composite: null },
      garm_img: handle_file(input.garmentImage),
      garment_des: input.garmentDes,
      is_checked: true,
      is_checked_crop: false,
      denoise_steps: 30,
      seed: 42,
    });

    const first = Array.isArray(result?.data) ? result.data[0] : undefined;
    const resultUrl = typeof first === 'string' ? first : (first as { url?: string })?.url;

    if (!resultUrl) {
      throw new HttpError(502, 'IDM-VTON did not return a try-on image.');
    }

    return resultUrl;
  };

  try {
    return await attempt();
  } catch (error) {
    // Retry once for transient failures (Space cold start / queue timeout).
    console.warn('IDM-VTON attempt failed, retrying once:', error instanceof Error ? error.message : error);
    await sleep(2000);

    try {
      return await attempt();
    } catch (retryError) {
      const message = retryError instanceof Error ? retryError.message : 'IDM-VTON request failed.';
      throw new HttpError(502, `Try-on failed after a retry: ${message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleAvatarUpload(req: typeof http.IncomingMessage.prototype): Promise<{ avatarUrl: string }> {
  const { fields, files } = await readMultipart(req);
  const userId = fields.userId?.trim() || 'demo-user';
  const file = requireImageFile(files.image, 'avatar photo');

  return processAvatarUpload({ userId, file }, pipelineDeps());
}

async function handleGetAvatar(userId: string): Promise<{ avatarUrl: string | null }> {
  const avatar = db.getAvatar(userId);
  return { avatarUrl: avatar ? await storage.url(avatar.r2Key) : null };
}

async function handleGarmentUpload(req: typeof http.IncomingMessage.prototype) {
  const { fields, files } = await readMultipart(req);
  const userId = fields.userId?.trim() || 'demo-user';
  const file = requireImageFile(files.image, 'garment photo');

  if (!fields.category?.trim()) {
    throw new HttpError(400, `A garment category is required. Choose one of: ${GARMENT_CATEGORIES.join(', ')}.`);
  }

  try {
    return await processGarmentUpload(
      {
        userId,
        file,
        category: fields.category.trim(),
        name: fields.name,
        destination: fields.destination?.trim().toLowerCase(),
        attributes: readGarmentAttributes(fields),
      },
      pipelineDeps()
    );
  } catch (error) {
    // assertGarmentCategory throws a plain Error for a bad category value.
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, error instanceof Error ? error.message : 'Could not process garment.');
  }
}

async function handleListGarments(userId: string) {
  return Promise.all(db.listGarments(userId).map((row) => garmentRowToItem(row)));
}

async function garmentRowToItem(row: ReturnType<typeof rowToGarment>) {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    category: row.category,
    imageUrl: await storage.url(row.cutoutKey),
    destination: row.destination,
    createdAt: row.createdAt,
    primaryColor: row.primaryColor || undefined,
    price: row.price || undefined,
    fit: row.fit || undefined,
    source: row.source || undefined,
    notes: row.notes || undefined,
  };
}

async function handleUpdateGarment(garmentId: string, req: typeof http.IncomingMessage.prototype) {
  const body = await readJsonBody<{
    userId?: string;
    name?: string;
    category?: string;
    destination?: string;
    primaryColor?: string;
    price?: string;
    fit?: string;
    source?: string;
    notes?: string;
  }>(req);
  const userId = body.userId?.trim() || 'demo-user';

  if (!garmentId) {
    throw new HttpError(400, 'A garment id is required to edit an item.');
  }

  if (!db.getGarmentById(userId, garmentId)) {
    throw new HttpError(404, 'That item could not be found. It may have been deleted on another device.');
  }

  // Absent field = keep, empty string = clear, value = set.
  const changes: Record<string, string | null> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 80);

    if (!name) {
      throw new HttpError(400, 'Give the item a name, or leave the field out to keep the current one.');
    }

    changes.name = name;
  }

  if (body.category !== undefined) {
    if (!isGarmentCategory(body.category)) {
      throw new HttpError(400, `Invalid garment category. Expected one of: ${GARMENT_CATEGORIES.join(', ')}.`);
    }

    changes.category = body.category;
  }

  if (body.destination !== undefined) {
    if (body.destination !== 'closet' && body.destination !== 'wishlist') {
      throw new HttpError(400, "Destination must be 'closet' or 'wishlist'.");
    }

    changes.destination = body.destination;
  }

  const attributeColumns = [
    ['primaryColor', 'primary_color', 40],
    ['price', 'price', 20],
    ['source', 'source', 80],
    ['notes', 'notes', 500],
  ] as const;

  for (const [field, column, maxLength] of attributeColumns) {
    if (body[field] !== undefined) {
      const clean = String(body[field]).trim();
      changes[column] = clean ? clean.slice(0, maxLength) : null;
    }
  }

  if (body.fit !== undefined) {
    const fit = String(body.fit).trim().toLowerCase();

    if (fit && !isGarmentFit(fit)) {
      throw new HttpError(400, `Invalid fit. Expected one of: ${GARMENT_FITS.join(', ')}.`);
    }

    changes.fit = fit || null;
  }

  db.updateGarment(userId, garmentId, changes);

  const updated = db.getGarmentById(userId, garmentId);

  if (!updated) {
    throw new HttpError(500, 'The item disappeared while saving. Refresh and try again.');
  }

  return garmentRowToItem(updated);
}

// Shared by upload and edit: trims, drops empties, enforces the fit
// allow-list, and caps lengths so a paste cannot balloon a row.
function readGarmentAttributes(fields: Record<string, string | undefined>) {
  const attributes: { primaryColor?: string; price?: string; fit?: string; source?: string; notes?: string } = {};
  const readText = (value: string | undefined, maxLength: number) => {
    const clean = value?.trim();
    return clean ? clean.slice(0, maxLength) : undefined;
  };

  attributes.primaryColor = readText(fields.primaryColor, 40);
  attributes.price = readText(fields.price, 20);
  attributes.source = readText(fields.source, 80);
  attributes.notes = readText(fields.notes, 500);

  const fit = fields.fit?.trim().toLowerCase();

  if (fit) {
    if (!isGarmentFit(fit)) {
      throw new HttpError(400, `Invalid fit. Expected one of: ${GARMENT_FITS.join(', ')}.`);
    }

    attributes.fit = fit;
  }

  return attributes;
}

async function handleDeleteGarment(userId: string, garmentId: string): Promise<{ deleted: boolean }> {
  if (!garmentId) {
    throw new HttpError(400, 'A garment id is required to delete an item.');
  }

  const garment = db.getGarmentById(userId, garmentId);

  // Idempotent: deleting something already gone (or an item that only ever
  // lived client-side) is a success from the caller's point of view.
  if (!garment) {
    return { deleted: false };
  }

  const resultKeys = db.listResultKeysForGarment(userId, garmentId);
  db.deleteGarment(userId, garmentId);

  // DB row is the source of truth; storage cleanup is best-effort so a
  // transient R2 error cannot resurrect the item in the UI.
  const orphanKeys = [garment.originalKey, garment.cutoutKey, ...resultKeys];
  await Promise.all(
    orphanKeys.map((key) =>
      storage.delete(key).catch((error: unknown) => {
        console.error(`Could not delete R2 object ${key}:`, error);
      })
    )
  );

  return { deleted: true };
}

async function handleTryOn(req: typeof http.IncomingMessage.prototype): Promise<{ resultUrl: string }> {
  const body = await readJsonBody<{ userId?: string; garmentId?: string }>(req);
  const userId = body.userId?.trim() || 'demo-user';
  const garmentId = body.garmentId?.trim();

  if (!garmentId) {
    throw new HttpError(400, 'A garmentId is required to run try-on.');
  }

  const avatar = db.getAvatar(userId);

  if (!avatar) {
    throw new HttpError(400, 'Upload a full-body photo before trying on clothes.');
  }

  const garment = db.getGarmentById(userId, garmentId);

  if (!garment) {
    throw new HttpError(400, 'That garment could not be found. Upload it again and retry.');
  }

  const avatarUrl = await storage.url(avatar.r2Key);
  const cutout = await storage.get(garment.cutoutKey);
  const garmentImage = await compositeOnWhite(cutout);
  const garmentDes = buildGarmentDescription(garment.category, garment.name);

  const idmUrl = await runIdmVton({ avatarUrl, garmentImage, garmentDes });
  const resultBytes = await downloadImage(idmUrl);

  const id = crypto.randomUUID();
  const key = resultKey(userId, id);
  await storage.put(key, resultBytes, 'image/png');
  db.insertResult({ id, userId, garmentId, r2Key: key, createdAt: new Date().toISOString() });

  return { resultUrl: await storage.url(key) };
}

async function handleListTryOns(userId: string) {
  return Promise.all(
    db.listResults(userId).map(async (row) => ({
      createdAt: String(row.created_at),
      garmentId: String(row.garment_id),
      garmentName: row.garment_name ? String(row.garment_name) : 'Try-on look',
      id: String(row.id),
      liked: Boolean(row.liked),
      resultUrl: await storage.url(String(row.r2_key)),
      saved: Boolean(row.saved),
    }))
  );
}

async function handleUpdateTryOn(resultId: string, req: typeof http.IncomingMessage.prototype) {
  const body = await readJsonBody<{ userId?: string; liked?: boolean; saved?: boolean }>(req);
  const userId = body.userId?.trim() || 'demo-user';

  if (!db.getResult(userId, resultId)) throw new HttpError(404, 'That try-on look could not be found.');
  if (body.liked === undefined && body.saved === undefined) throw new HttpError(400, 'Provide liked or saved to update this look.');

  db.updateResult(userId, resultId, { liked: body.liked, saved: body.saved });
  return { id: resultId, liked: body.liked, saved: body.saved };
}

async function handleDeleteTryOn(userId: string, resultId: string) {
  const result = db.getResult(userId, resultId);
  if (!result) throw new HttpError(404, 'That try-on look could not be found.');

  db.deleteResult(userId, resultId);
  await storage.delete(String(result.r2_key)).catch((error: unknown) => console.error('Could not delete try-on image:', error));
  return { deleted: true };
}

function pipelineDeps() {
  return { storage, preprocess, removeBackground, analyzeAlpha, db, bgRemovalModel };
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

async function readMultipart(req: typeof http.IncomingMessage.prototype): Promise<MultipartPayload> {
  const contentType = req.headers['content-type'] ?? '';

  if (!contentType.includes('multipart/form-data')) {
    throw new HttpError(415, 'Expected multipart/form-data.');
  }

  const body = await readRequestBody(req);

  if (body.length > maxUploadBytes) {
    throw new HttpError(413, `Upload is too large. The limit is ${Math.round(maxUploadBytes / (1024 * 1024))} MB.`);
  }

  return parseMultipart(body, contentType);
}

function requireImageFile(file: UploadedFile | undefined, label: string): UploadedFile {
  if (!file) {
    throw new HttpError(400, `A ${label} file is required.`);
  }

  if (file.data.length > maxUploadBytes) {
    throw new HttpError(413, `The ${label} is too large. The limit is ${Math.round(maxUploadBytes / (1024 * 1024))} MB.`);
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowed.includes(file.mimeType.split(';')[0].trim().toLowerCase())) {
    throw new HttpError(415, `The ${label} must be a JPEG, PNG, or WebP image.`);
  }

  return file;
}

function parseMultipart(body: Buffer, contentType: string): MultipartPayload {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    throw new HttpError(400, 'Multipart boundary is missing.');
  }

  const boundary = Buffer.from(`--${boundaryMatch[1] ?? boundaryMatch[2]}`);
  const delimiter = Buffer.from(`\r\n--${boundaryMatch[1] ?? boundaryMatch[2]}`);
  const fields: Record<string, string> = {};
  const files: Record<string, UploadedFile> = {};
  let cursor = body.indexOf(boundary);

  while (cursor !== -1) {
    const partStart = cursor + boundary.length + 2;

    if (body.subarray(cursor + boundary.length, cursor + boundary.length + 2).toString() === '--') {
      break;
    }

    const next = body.indexOf(delimiter, partStart);

    if (next === -1) {
      break;
    }

    const part = body.subarray(partStart, next);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));

    if (headerEnd !== -1) {
      const rawHeaders = part.subarray(0, headerEnd).toString('utf8');
      const content = part.subarray(headerEnd + 4);
      const disposition = rawHeaders.match(/content-disposition:[^\n]+/i)?.[0] ?? '';
      const name = disposition.match(/name="([^"]+)"/)?.[1];
      const filename = disposition.match(/filename="([^"]*)"/)?.[1];
      const mimeType = rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() || 'application/octet-stream';

      if (name && filename) {
        files[name] = { data: content, filename: path.basename(filename), mimeType };
      } else if (name) {
        fields[name] = content.toString('utf8');
      }
    }

    cursor = next + 2;
  }

  return { fields, files };
}

function serveStatic(url: URL, res: typeof http.ServerResponse.prototype) {
  const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.normalize(path.join(root, requested));
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error: Error | null, data: Buffer) => {
    if (error) {
      send(res, 404, 'Not found');
      return;
    }

    send(res, 200, data, staticTypes[path.extname(filePath)] || 'application/octet-stream');
  });
}

async function readRequestBody(req: typeof http.IncomingMessage.prototype): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function readJsonBody<T>(req: typeof http.IncomingMessage.prototype): Promise<T> {
  const body = await readRequestBody(req);

  if (!body.length) {
    throw new HttpError(400, 'Request body is required.');
  }

  return JSON.parse(body.toString('utf8')) as T;
}

async function handleChat(req: typeof http.IncomingMessage.prototype) {
  const payload = await readJsonBody<ClosetChatRequest>(req);

  if (!payload.message?.trim()) {
    throw new HttpError(400, 'Message is required.');
  }

  const currentUser = payload.currentUser?.username?.trim()
    ? {
        gender: payload.currentUser.gender,
        username: payload.currentUser.username.trim(),
      }
    : null;

  if (!currentUser) {
    return {
      text: 'Create an account first, then I can answer using your own closet.',
    };
  }

  const response = await callOpenAIChatReply({
    bodyProfile: payload.bodyProfile,
    chatMode: payload.chatMode === 'shopping' ? 'shopping' : 'closet',
    closetItems: payload.closetItems ?? [],
    colorProfile: payload.colorProfile,
    currentUser,
    hasAttachedImage: Boolean(payload.hasAttachedImage),
    message: payload.message.trim(),
    selectedClosetItems: payload.selectedClosetItems ?? [],
    styleProfile: payload.styleProfile,
    wishlistItems: payload.wishlistItems ?? [],
  });

  return response;
}

async function callOpenAIChatReply(context: {
  bodyProfile?: ClosetChatRequest['bodyProfile'];
  chatMode: 'closet' | 'shopping';
  closetItems: NonNullable<ClosetChatRequest['closetItems']>;
  colorProfile?: ClosetChatRequest['colorProfile'];
  currentUser: NonNullable<ClosetChatRequest['currentUser']>;
  hasAttachedImage: boolean;
  message: string;
  selectedClosetItems: NonNullable<ClosetChatRequest['selectedClosetItems']>;
  styleProfile?: ClosetChatRequest['styleProfile'];
  wishlistItems: NonNullable<ClosetChatRequest['wishlistItems']>;
}) {
  const apiKey = requireEnv('OPENAI_API_KEY');
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-5.6-terra';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [
        {
          content: [{ text: buildChatSystemPrompt(context.chatMode), type: 'input_text' }],
          role: 'system',
        },
        {
          content: [{ text: buildChatUserPrompt(context), type: 'input_text' }],
          role: 'user',
        },
      ],
      max_output_tokens: 450,
      model,
      reasoning: { effort: 'low' },
      text: {
        format: {
          name: 'closet_chat_reply',
          schema: closetChatReplySchema,
          strict: true,
          type: 'json_schema',
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? typeof payload.error === 'object' && payload.error && 'message' in payload.error
          ? String(payload.error.message)
          : String(payload.error)
        : `OpenAI request failed with ${response.status}.`;
    throw new HttpError(502, message);
  }

  const rawText = extractResponsesApiText(payload);
  const parsed = parseClosetReply(rawText);

  if (!parsed) {
    throw new HttpError(502, 'OpenAI returned an unexpected chat response.');
  }

  return parsed;
}

function buildChatSystemPrompt(chatMode: 'closet' | 'shopping') {
  const modeGuidance =
    chatMode === 'shopping'
      ? 'The user wants shopping help when the closet is missing something.'
      : 'The user wants to rely on their existing closet first.';

  return [
    'You are BoveCloset, a practical fashion assistant.',
    'Be direct, warm, and specific. Keep replies short and useful.',
    modeGuidance,
    'Never invent items the user does not own.',
    'If you recommend an outfit, choose item ids only from the provided closet items.',
    'If no exact outfit is possible, explain what is missing and keep the outfit fields null.',
    'Use selected closet items as a strong priority if they are provided.',
    'Return only valid JSON that matches the schema.',
  ].join(' ');
}

function buildChatUserPrompt(context: {
  bodyProfile?: ClosetChatRequest['bodyProfile'];
  closetItems: NonNullable<ClosetChatRequest['closetItems']>;
  colorProfile?: ClosetChatRequest['colorProfile'];
  currentUser: NonNullable<ClosetChatRequest['currentUser']>;
  hasAttachedImage: boolean;
  message: string;
  selectedClosetItems: NonNullable<ClosetChatRequest['selectedClosetItems']>;
  styleProfile?: ClosetChatRequest['styleProfile'];
  wishlistItems: NonNullable<ClosetChatRequest['wishlistItems']>;
}) {
  return JSON.stringify(
    {
      attachedImage: context.hasAttachedImage,
      bodyProfile: context.bodyProfile ?? null,
      closetItems: context.closetItems.map(summarizeWardrobeItem),
      currentUser: context.currentUser,
      message: context.message,
      selectedClosetItems: context.selectedClosetItems.map(summarizeWardrobeItem),
      styleProfile: context.styleProfile ?? null,
      wishlistItems: context.wishlistItems.map(summarizeWardrobeItem),
      colorProfile: context.colorProfile ?? null,
    },
    null,
    2
  );
}

function summarizeWardrobeItem(item: {
  category?: string;
  color?: string;
  id?: string;
  name?: string;
  pattern?: string;
  primaryColor?: string;
  subcategory?: string;
  tags?: string[];
  texture?: string;
}) {
  return {
    category: item.category ?? null,
    color: item.color ?? null,
    id: item.id ?? null,
    name: item.name ?? null,
    pattern: item.pattern ?? null,
    primaryColor: item.primaryColor ?? null,
    subcategory: item.subcategory ?? null,
    tags: item.tags ?? [],
    texture: item.texture ?? null,
  };
}

const closetChatReplySchema = {
  additionalProperties: false,
  properties: {
    outfit: {
      additionalProperties: false,
      properties: {
        dress: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        pants: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        shirt: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        shorts: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      },
      required: ['shirt', 'dress', 'shorts', 'pants'],
      type: 'object',
    },
    text: { type: 'string' },
  },
  required: ['outfit', 'text'],
  type: 'object',
} as const;

function extractResponsesApiText(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const responsePayload = payload as {
    output?: {
      content?: { text?: string; type?: string }[];
      text?: string;
      type?: string;
    }[];
    output_text?: string;
  };

  if (typeof responsePayload.output_text === 'string' && responsePayload.output_text.trim()) {
    return responsePayload.output_text.trim();
  }

  for (const item of responsePayload.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === 'string' && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return '';
}

function parseClosetReply(rawText: string) {
  const text = rawText.trim();

  if (!text) {
    return null;
  }

  const parsed = tryParseJson<{ outfit?: Partial<Record<'shirt' | 'dress' | 'shorts' | 'pants', string | null>>; text?: string }>(text);

  if (!parsed || typeof parsed.text !== 'string') {
    return null;
  }

  const reply: { outfit?: Partial<Record<'shirt' | 'dress' | 'shorts' | 'pants', string | null>>; text: string } = {
    text: parsed.text.trim(),
  };

  if (parsed.outfit && typeof parsed.outfit === 'object') {
    reply.outfit = {
      dress: normalizeOutfitValue(parsed.outfit.dress),
      pants: normalizeOutfitValue(parsed.outfit.pants),
      shirt: normalizeOutfitValue(parsed.outfit.shirt),
      shorts: normalizeOutfitValue(parsed.outfit.shorts),
    };
  }

  return reply;
}

function normalizeOutfitValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    const match = value.match(/\{[\s\S]*\}$/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new HttpError(502, `Could not download the try-on result: ${await response.text()}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new HttpError(500, `Missing required environment variable: ${name}.`);
  }

  return value;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (require.main === module) {
  getRawDb();
  getBgWorker();
  server.listen(port, () => {
    console.log(`BoveCloset try-on API ready at http://localhost:${port}`);
    console.log(`Background-removal model: ${bgRemovalModel}`);
    console.log(`IDM-VTON space: ${idmVtonSpace}`);
  });
}

module.exports = { server };
