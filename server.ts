const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');

type ClosetCategory = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'bags';
type ClosetDestination = 'closet' | 'wishlist';

type UploadedFile = {
  data: Buffer;
  filename: string;
  mimeType: string;
};

type MultipartPayload = {
  fields: Record<string, string>;
  files: Record<string, UploadedFile>;
};

type CleanedImage = UploadedFile;

type Classification = {
  category: ClosetCategory;
  pattern: string;
  primary_color: string;
  subcategory: string;
};

type WardrobeItem = {
  id: string;
  name: string;
  category: ClosetCategory;
  color?: string;
  createdAt?: string;
  destination: ClosetDestination;
  imageUrl: string;
  pattern?: string;
  primaryColor?: string;
  subcategory?: string;
  tags: string[];
  userId?: string;
};

type SupabaseRecord = {
  id?: string;
  category?: string;
  created_at?: string;
  destination?: string;
  image_url?: string;
  pattern?: string;
  primary_color?: string;
  subcategory?: string;
  tags?: string[];
  user_id?: string;
};

type SupabaseProfile = {
  id: string;
  photta_mannequin_id?: string | null;
  mannequin_image_url?: string | null;
  updated_at?: string | null;
};

type TryOnProvider = 'gemini' | 'photta';

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const staticTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.svg': 'image/svg+xml',
};
let cachedPhottaPoseId: string | undefined;
const geminiTryOnCache = new Map<string, string>();
const GEMINI_DAILY_TRY_ON_LIMIT = Number(process.env.GEMINI_DAILY_TRY_ON_LIMIT || 5);
const geminiUsageByUser = new Map<string, { count: number; date: string }>();
const geminiTryOnPrompt = [
  'Edit the first image only. The first image is the user/model photo.',
  'Use the following reference garment image or images as the exact clothing products to apply.',
  'Update the person in the first image so they are wearing the specific garment products shown in the reference image or images.',
  "Maintain the user's pose, face, identity, hair, skin tone, body shape, camera angle, and original background as closely as possible.",
  'Preserve the garments color, neckline, sleeve shape, hem length, fabric texture, buttons, pattern, silhouette, and styling details.',
  'Make the result look like a realistic Taobao-style fashion try-on photo: clean, polished, flattering, commercial, and natural.',
  'Replace only the relevant clothing area. Do not alter unrelated clothing, accessories, the face, or the background unless needed for realistic garment fit.',
  'Return only the final edited image.',
].join(' ');

function send(res: typeof http.ServerResponse.prototype, status: number, body: string | Buffer, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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

    if (req.method === 'GET' && url.pathname === '/api/closet-items') {
      const userId = url.searchParams.get('userId')?.trim() || 'demo-user';
      const items = await listClosetItems(userId);
      sendJson(res, 200, items);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/closet-items') {
      const item = await handleCreateClosetItem(req);
      sendJson(res, 201, item);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/profile/mannequin') {
      const result = await handleCreateMannequin(req);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/profile') {
      const userId = url.searchParams.get('userId')?.trim() || 'demo-user';
      const profile = await getSupabaseProfile(userId);
      sendJson(res, 200, {
        mannequinId: profile?.photta_mannequin_id ?? null,
        selfieImageUrl: profile?.mannequin_image_url ?? null,
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/try-on') {
      const result = await handleTryOn(req);
      sendJson(res, 200, result);
      return;
    }

    const tryOnStatusMatch = url.pathname.match(/^\/api\/try-on\/([^/]+)$/);

    if (req.method === 'GET' && tryOnStatusMatch) {
      const result = await getPhottaTryOnStatus(tryOnStatusMatch[1]);
      sendJson(res, 200, result);
      return;
    }

    serveStatic(url, res);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    sendJson(res, status, { error: message });
  }
});

async function handleCreateClosetItem(req: typeof http.IncomingMessage.prototype): Promise<WardrobeItem> {
  const contentType = String(req.headers['content-type'] ?? '');

  if (!contentType.includes('multipart/form-data')) {
    throw new HttpError(415, 'POST /api/closet-items expects multipart form data.');
  }

  const body = await readRequestBody(req);
  const multipart = parseMultipart(body, contentType);
  const image = multipart.files.image;
  const tag = multipart.fields.tag?.trim() || 'Closet item';
  const destination = normalizeDestination(multipart.fields.destination);
  const userId = multipart.fields.userId?.trim() || 'demo-user';

  if (!image) {
    throw new HttpError(400, 'Missing image file.');
  }

  const cleanedImage = await cleanImage(image);
  const classification = await classifyImage(cleanedImage, tag);
  const imageUrl = await uploadToSupabase(cleanedImage, userId);
  const savedRecord = await insertClosetItem({
    classification,
    destination,
    imageUrl,
    tag,
    userId,
  });

  return recordToWardrobeItem(savedRecord, {
    classification,
    destination,
    imageUrl,
    tag,
    userId,
  });
}

async function handleCreateMannequin(req: typeof http.IncomingMessage.prototype): Promise<{ mannequinId: string; selfieImageUrl: string }> {
  const contentType = String(req.headers['content-type'] ?? '');
  let phottaImage = '';
  let provider: TryOnProvider = 'photta';
  let userId = 'demo-user';
  let selfieImageUrl = '';

  if (contentType.includes('multipart/form-data')) {
    const body = await readRequestBody(req);
    const multipart = parseMultipart(body, contentType);
    const image = multipart.files.image;
    provider = normalizeTryOnProvider(multipart.fields.provider);
    userId = multipart.fields.userId?.trim() || userId;
    selfieImageUrl = multipart.fields.selfieImageUrl?.trim() || '';

    if (image) {
      phottaImage = imageToDataUri(image);
      selfieImageUrl = await uploadToSupabase(image, `${userId}/mannequin`);
    }
  } else {
    const body = await readJsonBody<{ provider?: string; selfieImageUrl?: string; userId?: string }>(req);
    provider = normalizeTryOnProvider(body.provider);
    userId = body.userId?.trim() || userId;
    selfieImageUrl = body.selfieImageUrl?.trim() || '';
    phottaImage = selfieImageUrl;
  }

  if (!isHttpUrl(selfieImageUrl)) {
    throw new HttpError(400, 'A public selfie image URL or uploaded image file is required.');
  }

  const mannequinId = provider === 'photta' && process.env.PHOTTA_API_KEY?.trim() ? await createPhottaMannequin(phottaImage || selfieImageUrl) : '';
  const profileUpdate: SupabaseProfile = {
    id: userId,
    mannequin_image_url: selfieImageUrl,
    updated_at: new Date().toISOString(),
  };

  if (mannequinId) {
    profileUpdate.photta_mannequin_id = mannequinId;
  }

  await upsertSupabaseProfile(profileUpdate);

  return { mannequinId, selfieImageUrl };
}

async function handleTryOn(req: typeof http.IncomingMessage.prototype): Promise<{ generationId: string }> {
  const body = await readJsonBody<{
    baseImageUrl?: string;
    category?: string;
    garmentImageUrl?: string;
    garmentImageUrls?: string[];
    poseId?: string;
    productType?: string;
    provider?: string;
    userId?: string;
  }>(req);
  const userId = body.userId?.trim() || 'demo-user';
  const baseImageUrl = body.baseImageUrl?.trim();
  const garmentImageUrls = normalizeImageUrls(body.garmentImageUrls, body.garmentImageUrl);
  const productType = body.productType?.trim() || productTypeFromCategory(normalizeCategory(body.category ?? 'tops'));
  const provider = normalizeTryOnProvider(body.provider);

  if (garmentImageUrls.length === 0) {
    throw new HttpError(400, 'At least one garment image URL is required.');
  }

  if (garmentImageUrls.some((imageUrl) => !isHttpUrl(imageUrl))) {
    throw new HttpError(400, 'Virtual try-on requires public http(s) garment image URLs.');
  }

  if (provider === 'gemini') {
    return createGeminiTryOnResponse({
      baseImageUrl,
      garmentImageUrls,
      productType,
      userId,
    });
  }

  const poseId = await resolvePhottaPoseId(body.poseId ?? process.env.PHOTTA_DEFAULT_POSE_ID);
  let mannequinId = '';

  if (baseImageUrl) {
    if (!isHttpUrl(baseImageUrl)) {
      throw new HttpError(400, 'baseImageUrl must be a public http(s) URL.');
    }

    mannequinId = await createPhottaMannequin(baseImageUrl);
  } else {
    const profile = await getSupabaseProfile(userId);
    mannequinId = profile?.photta_mannequin_id?.trim() ?? '';
  }

  if (!mannequinId) {
    throw new HttpError(400, 'No mannequin set up yet. Upload a full-body selfie first.');
  }

  return {
    generationId: await createPhottaTryOn({
      garmentImageUrls,
      mannequinId,
      poseId,
      productType,
    }),
  };
}

async function createGeminiTryOnResponse({
  baseImageUrl,
  garmentImageUrls,
  productType,
  userId,
}: {
  baseImageUrl?: string;
  garmentImageUrls: string[];
  productType: string;
  userId: string;
}): Promise<{ generationId: string; outputUrl: string; status: 'completed' }> {
  let resolvedBaseImageUrl = baseImageUrl?.trim() || '';

  if (!resolvedBaseImageUrl) {
    const profile = await getSupabaseProfile(userId);
    resolvedBaseImageUrl = profile?.mannequin_image_url?.trim() ?? '';
  }

  if (!isHttpUrl(resolvedBaseImageUrl)) {
    throw new HttpError(400, 'Upload a full-body selfie before using Gemini try-on.');
  }

  const cacheKey = JSON.stringify({
    baseImageUrl: resolvedBaseImageUrl,
    garmentImageUrls,
    model: process.env.GEMINI_TRY_ON_MODEL?.trim() || 'gemini-3.1-flash-image',
    productType,
    prompt: geminiTryOnPrompt,
  });
  const cachedUrl = geminiTryOnCache.get(cacheKey);

  if (cachedUrl) {
    return {
      generationId: `gemini:${Buffer.from(cachedUrl).toString('base64url')}`,
      outputUrl: cachedUrl,
      status: 'completed',
    };
  }

  enforceGeminiDailyLimit(userId);

  const outputImage = await createGeminiTryOnImage({
    baseImageUrl: resolvedBaseImageUrl,
    garmentImageUrls,
    productType,
  });
  const outputUrl = await uploadToSupabase(outputImage, `${userId}/try-ons/gemini`);

  geminiTryOnCache.set(cacheKey, outputUrl);

  return {
    generationId: `gemini:${Buffer.from(outputUrl).toString('base64url')}`,
    outputUrl,
    status: 'completed',
  };
}

async function cleanImage(image: UploadedFile): Promise<CleanedImage> {
  const removedBackground = await removeBackground(image);
  return removeWrinkles(removedBackground);
}

async function removeBackground(image: UploadedFile): Promise<CleanedImage> {
  const apiKey = requireEnv('PHOTOROOM_API_KEY');
  const url = process.env.PHOTOROOM_BACKGROUND_REMOVAL_URL || 'https://sdk.photoroom.com/v1/segment';

  return postImageForBinaryResult({
    apiKey,
    authMode: 'x-api-key',
    fieldName: process.env.PHOTOROOM_BACKGROUND_FIELD || 'image_file',
    image,
    stageName: 'background removal',
    url,
  });
}

async function removeWrinkles(image: UploadedFile): Promise<CleanedImage> {
  const url = (process.env.PHOTOROOM_WRINKLE_REMOVER_URL || process.env.WRINKLE_REMOVER_API_URL || '').trim();
  const apiKey = (process.env.PHOTOROOM_API_KEY || process.env.WRINKLE_REMOVER_API_KEY || '').trim();

  if (!url || !isHttpUrl(url)) {
    return image;
  }

  if (!apiKey) {
    throw new HttpError(500, 'Set PHOTOROOM_API_KEY or WRINKLE_REMOVER_API_KEY for wrinkle removal.');
  }

  return postImageForBinaryResult({
    apiKey,
    authMode: process.env.WRINKLE_REMOVER_API_KEY?.trim() ? 'bearer' : 'x-api-key',
    fieldName: process.env.WRINKLE_REMOVER_FIELD || 'image_file',
    image,
    stageName: 'wrinkle removal',
    url,
  });
}

async function postImageForBinaryResult({
  apiKey,
  authMode,
  fieldName,
  image,
  stageName,
  url,
}: {
  apiKey: string;
  authMode: 'bearer' | 'x-api-key';
  fieldName: string;
  image: UploadedFile;
  stageName: string;
  url: string;
}): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append(fieldName, new Blob([image.data], { type: image.mimeType }), image.filename);

  const response = await fetch(url, {
    body: formData,
    headers: authMode === 'bearer' ? { Authorization: `Bearer ${apiKey}` } : { 'x-api-key': apiKey },
    method: 'POST',
  });

  if (!response.ok) {
    throw new HttpError(502, `${stageName} failed: ${await response.text()}`);
  }

  const responseType = response.headers.get('content-type') ?? '';

  if (responseType.includes('application/json')) {
    const payload = await response.json();
    const imageUrl = payload.image_url || payload.result_url || payload.output_url || payload.url;
    const base64 = payload.image_base64 || payload.result_base64;

    if (typeof imageUrl === 'string') {
      return downloadImage(imageUrl, image.filename);
    }

    if (typeof base64 === 'string') {
      return {
        data: Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
        filename: image.filename,
        mimeType: image.mimeType,
      };
    }

    throw new HttpError(502, `${stageName} returned JSON without an image URL or base64 image.`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  return {
    data,
    filename: image.filename.replace(/\.\w+$/, '.png'),
    mimeType: responseType.includes('image/') ? responseType.split(';')[0] : image.mimeType,
  };
}

async function classifyImage(image: UploadedFile, tag: string): Promise<Classification> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return fallbackClassificationFromTag(tag);
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    body: JSON.stringify({
      input: [
        {
          content: [
            {
              text:
                `Classify this wardrobe item. The user tag is "${tag}". ` +
                'Return only the most specific truthful values.',
              type: 'input_text',
            },
            {
              image_url: `data:${image.mimeType};base64,${image.data.toString('base64')}`,
              type: 'input_image',
            },
          ],
          role: 'user',
        },
      ],
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
      text: {
        format: {
          name: 'wardrobe_classification',
          schema: {
            additionalProperties: false,
            properties: {
              category: {
                enum: ['top', 'bottom', 'outerwear', 'shoes', 'accessory'],
                type: 'string',
              },
              pattern: { type: 'string' },
              primary_color: { type: 'string' },
              subcategory: { type: 'string' },
            },
            required: ['category', 'subcategory', 'primary_color', 'pattern'],
            type: 'object',
          },
          strict: true,
          type: 'json_schema',
        },
      },
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new HttpError(502, `OpenAI classification failed: ${await response.text()}`);
  }

  const payload = await response.json();
  const text = extractOpenAIText(payload);
  const parsed = JSON.parse(text) as {
    category: string;
    pattern: string;
    primary_color: string;
    subcategory: string;
  };

  return {
    category: normalizeCategory(parsed.category),
    pattern: parsed.pattern,
    primary_color: parsed.primary_color,
    subcategory: parsed.subcategory,
  };
}

function fallbackClassificationFromTag(tag: string): Classification {
  const category = normalizeCategory(tag);

  return {
    category,
    pattern: 'unknown',
    primary_color: 'unknown',
    subcategory: labelFromCategory(category),
  };
}

function labelFromCategory(category: ClosetCategory) {
  const labels: Record<ClosetCategory, string> = {
    accessories: 'accessory',
    bags: 'bag',
    bottoms: 'bottom',
    outerwear: 'outerwear',
    shoes: 'shoes',
    tops: 'top',
  };

  return labels[category];
}

async function uploadToSupabase(image: UploadedFile, userId: string): Promise<string> {
  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const bucket = requireEnv('SUPABASE_STORAGE_BUCKET');
  const extension = extensionFromMime(image.mimeType);
  const objectPath = `${userId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;

  const response = await fetch(uploadUrl, {
    body: image.data,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': image.mimeType,
      'x-upsert': 'false',
    },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new HttpError(502, `Supabase Storage upload failed: ${await response.text()}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
}

async function insertClosetItem({
  classification,
  destination,
  imageUrl,
  tag,
  userId,
}: {
  classification: Classification;
  destination: ClosetDestination;
  imageUrl: string;
  tag: string;
  userId: string;
}): Promise<SupabaseRecord> {
  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${supabaseUrl}/rest/v1/closet_items`, {
    body: JSON.stringify({
      category: classification.category,
      created_at: new Date().toISOString(),
      destination,
      image_url: imageUrl,
      pattern: classification.pattern,
      primary_color: classification.primary_color,
      subcategory: classification.subcategory,
      tags: [tag],
      user_id: userId,
    }),
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new HttpError(502, `Supabase insert failed: ${await response.text()}`);
  }

  const records = await response.json();
  return Array.isArray(records) ? records[0] : records;
}

async function listClosetItems(userId: string): Promise<WardrobeItem[]> {
  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const searchParams = new URLSearchParams({
    order: 'created_at.desc',
    select: 'id,category,created_at,destination,image_url,pattern,primary_color,subcategory,tags,user_id',
    user_id: `eq.${userId}`,
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/closet_items?${searchParams.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!response.ok) {
    throw new HttpError(502, `Supabase closet item lookup failed: ${await response.text()}`);
  }

  const records = await response.json();

  if (!Array.isArray(records)) {
    return [];
  }

  return records.map((record: SupabaseRecord) => {
    const category = normalizeCategory(record.category ?? 'tops');
    const subcategory = record.subcategory ?? labelFromCategory(category);
    const primaryColor = record.primary_color ?? 'unknown';

    return recordToWardrobeItem(record, {
      classification: {
        category,
        pattern: record.pattern ?? 'unknown',
        primary_color: primaryColor,
        subcategory,
      },
      destination: normalizeDestination(record.destination ?? 'closet'),
      imageUrl: record.image_url ?? '',
      tag: subcategory,
      userId,
    });
  });
}

async function getSupabaseProfile(userId: string): Promise<SupabaseProfile | undefined> {
  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,photta_mannequin_id,mannequin_image_url,updated_at`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new HttpError(502, `Supabase profile lookup failed: ${await response.text()}`);
  }

  const records = await response.json();
  return Array.isArray(records) ? records[0] : undefined;
}

async function upsertSupabaseProfile(profile: SupabaseProfile): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
    body: JSON.stringify(profile),
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new HttpError(502, `Supabase profile save failed: ${await response.text()}`);
  }
}

async function createPhottaMannequin(selfieImageUrl: string): Promise<string> {
  const apiKey = requireEnv('PHOTTA_API_KEY');
  const uploadUrl = process.env.PHOTTA_MANNEQUIN_UPLOAD_URL?.trim() || 'https://api.photta.app/api/v1/mannequins';
  const response = await fetch(uploadUrl, {
    body: JSON.stringify({ image: selfieImageUrl }),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const payload = await readProviderJson(response, {
    envVar: 'PHOTTA_MANNEQUIN_UPLOAD_URL',
    provider: 'Photta',
    stage: 'mannequin upload',
  });
  const mannequinId = extractNestedString(payload, ['data', 'id']) || payload.id || payload.mannequin_id;

  if (typeof mannequinId !== 'string' || !mannequinId.trim()) {
    throw new HttpError(502, `Photta mannequin response did not include an id: ${JSON.stringify(payload)}`);
  }

  return mannequinId.trim();
}

async function createPhottaTryOn({
  garmentImageUrls,
  mannequinId,
  poseId,
  productType,
}: {
  garmentImageUrls: string[];
  mannequinId: string;
  poseId: string;
  productType: string;
}): Promise<string> {
  const apiKey = requireEnv('PHOTTA_API_KEY');
  const tryOnUrl = requireEnv('PHOTTA_TRY_ON_URL');
  const requestBody: Record<string, unknown> = {
    aspect_ratio: process.env.PHOTTA_ASPECT_RATIO?.trim() || '3:4',
    mannequin_id: mannequinId,
    pose_id: poseId,
    product_type: productType,
    resolution: process.env.PHOTTA_RESOLUTION?.trim() || '2K',
  };

  if (productType === 'top_and_bottom') {
    const [topImage, bottomImage] = garmentImageUrls;

    if (!topImage || !bottomImage) {
      throw new HttpError(400, 'Top and bottom try-on requires both a top image and a bottom image.');
    }

    requestBody.top_image = topImage;
    requestBody.bottom_image = bottomImage;
  } else {
    requestBody.product_images = garmentImageUrls;
  }

  const response = await fetch(tryOnUrl, {
    body: JSON.stringify(requestBody),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const payload = await readProviderJson(response, {
    envVar: 'PHOTTA_TRY_ON_URL',
    provider: 'Photta',
    stage: 'try-on request',
  });
  const generationId = extractNestedString(payload, ['data', 'id']) || payload.id || payload.generation_id || payload.run_id;

  if (typeof generationId !== 'string' || !generationId.trim()) {
    throw new HttpError(502, `Photta try-on response did not include a generation id: ${JSON.stringify(payload)}`);
  }

  return generationId.trim();
}

async function resolvePhottaPoseId(preferredPoseId?: string): Promise<string> {
  const normalized = normalizePhottaPoseId(preferredPoseId);

  if (normalized) {
    return normalized;
  }

  if (cachedPhottaPoseId) {
    return cachedPhottaPoseId;
  }

  const apiKey = requireEnv('PHOTTA_API_KEY');
  const posesUrl = process.env.PHOTTA_POSES_URL?.trim() || 'https://api.photta.app/api/v1/poses';
  const response = await fetch(posesUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const payload = await readProviderJson(response, {
    envVar: 'PHOTTA_POSES_URL',
    provider: 'Photta',
    stage: 'pose lookup',
  });
  const poseId = findBestPoseId(payload);

  if (!poseId) {
    throw new HttpError(502, `Photta pose lookup did not return a usable pose id: ${JSON.stringify(payload).slice(0, 500)}`);
  }

  cachedPhottaPoseId = poseId;
  return poseId;
}

async function getPhottaTryOnStatus(generationId: string) {
  if (generationId.startsWith('gemini:')) {
    const encodedUrl = generationId.slice('gemini:'.length);
    const outputUrl = Buffer.from(encodedUrl, 'base64url').toString('utf8');

    return {
      output_url: outputUrl,
      status: 'completed',
    };
  }

  const apiKey = requireEnv('PHOTTA_API_KEY');
  const tryOnUrl = requireEnv('PHOTTA_TRY_ON_URL').replace(/\/$/, '');
  const statusUrl = buildPhottaStatusUrl(generationId, tryOnUrl);
  const response = await fetch(statusUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const payload = await readProviderJson(response, {
    envVar: 'PHOTTA_STATUS_URL',
    provider: 'Photta',
    stage: 'status check',
  });
  const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;
  const status = normalizeTryOnStatus(data.status ?? payload.status ?? data.state ?? payload.state);
  const outputUrl = extractTryOnUrl(data as Record<string, unknown>) || extractTryOnUrl(payload);

  return {
    ...data,
    output_url: typeof outputUrl === 'string' ? outputUrl : undefined,
    status,
  };
}

function enforceGeminiDailyLimit(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const entry = geminiUsageByUser.get(userId);

  if (!entry || entry.date !== today) {
    geminiUsageByUser.set(userId, { count: 1, date: today });
    return;
  }

  if (entry.count >= GEMINI_DAILY_TRY_ON_LIMIT) {
    throw new HttpError(429, `You've used all ${GEMINI_DAILY_TRY_ON_LIMIT} try-ons for today. Try again tomorrow.`);
  }

  entry.count += 1;
}

async function createGeminiTryOnImage({
  baseImageUrl,
  garmentImageUrls,
  productType,
}: {
  baseImageUrl: string;
  garmentImageUrls: string[];
  productType: string;
}): Promise<UploadedFile> {
  const apiKey = requireEnv('GEMINI_API_KEY');
  const model = process.env.GEMINI_TRY_ON_MODEL?.trim() || 'gemini-3.1-flash-image';
  const baseImage = await downloadImage(baseImageUrl, 'user-photo');
  const garmentImages = await Promise.all(
    garmentImageUrls.map((imageUrl, index) => downloadImage(imageUrl, `garment-${index + 1}`))
  );
  const response = await fetchWithRetry('https://generativelanguage.googleapis.com/v1beta/interactions', {
    body: JSON.stringify({
      input: [
        {
          text: `${geminiTryOnPrompt}\n\nProduct type: ${productType}.`,
          type: 'text',
        },
        {
          data: baseImage.data.toString('base64'),
          mime_type: baseImage.mimeType,
          type: 'image',
        },
        ...garmentImages.map((image) => ({
          data: image.data.toString('base64'),
          mime_type: image.mimeType,
          type: 'image',
        })),
      ],
      model,
    }),
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    method: 'POST',
  });

  const payload = await readProviderJson(response, {
    envVar: 'GEMINI_API_KEY',
    provider: 'Gemini',
    stage: 'try-on image edit',
  });
  const generatedImage = extractGeminiOutputImage(payload);

  if (!generatedImage) {
    throw new HttpError(502, `Gemini try-on response did not include an output image: ${JSON.stringify(payload).slice(0, 800)}`);
  }

  return {
    data: Buffer.from(generatedImage.data.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
    filename: `gemini-try-on-${Date.now()}${extensionFromMime(generatedImage.mimeType)}`,
    mimeType: generatedImage.mimeType,
  };
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;

  while (true) {
    const response = await fetch(url, init);

    if (response.ok || (response.status !== 429 && response.status !== 503)) {
      return response;
    }

    const bodyText = await response.clone().text();

    if (!isRetryableGeminiError(bodyText) || attempt >= maxRetries) {
      return response;
    }

    attempt += 1;
    const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
    console.log(`Gemini rate-limited, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})`);
    await sleep(delayMs);
  }
}

function isRetryableGeminiError(bodyText: string): boolean {
  const lower = bodyText.toLowerCase();

  if (lower.includes('per day') || lower.includes('perday') || lower.includes('generaterequestsperday')) {
    return false;
  }

  return lower.includes('quota') || lower.includes('rate') || lower.includes('resource_exhausted') || lower.includes('unavailable');
}

function extractGeminiOutputImage(payload: unknown): { data: string; mimeType: string } | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const direct = imageFromRecord(record.output_image) || imageFromRecord(record.outputImage);

  if (direct) {
    return direct;
  }

  for (const key of ['outputs', 'output', 'steps', 'candidates', 'content', 'parts']) {
    const nested = extractGeminiOutputImage(record[key]);

    if (nested) {
      return nested;
    }
  }

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const nested = extractGeminiOutputImage(entry);

      if (nested) {
        return nested;
      }
    }
  }

  return imageFromRecord(record);
}

function imageFromRecord(value: unknown): { data: string; mimeType: string } | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const inlineData = record.inline_data || record.inlineData;

  if (inlineData && typeof inlineData === 'object') {
    const nested = inlineData as Record<string, unknown>;

    if (typeof nested.data === 'string') {
      return {
        data: nested.data,
        mimeType: typeof nested.mime_type === 'string' ? nested.mime_type : typeof nested.mimeType === 'string' ? nested.mimeType : 'image/png',
      };
    }
  }

  if (typeof record.data === 'string') {
    const mimeType =
      typeof record.mime_type === 'string'
        ? record.mime_type
        : typeof record.mimeType === 'string'
          ? record.mimeType
          : typeof record.media_type === 'string'
            ? record.media_type
            : 'image/png';

    if (mimeType.startsWith('image/')) {
      return {
        data: record.data,
        mimeType,
      };
    }
  }

  return undefined;
}

async function readProviderJson(
  response: Response,
  {
    envVar,
    provider,
    stage,
  }: {
    envVar: string;
    provider: string;
    stage: string;
  }
): Promise<Record<string, unknown>> {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  const label = `${provider} ${stage}`;

  if (!response.ok) {
    throw new HttpError(502, `${label} failed (${response.status}): ${summarizeProviderBody(text, provider, envVar)}`);
  }

  if (!contentType.toLowerCase().includes('json')) {
    throw new HttpError(
      502,
      `${label} returned ${contentType || 'non-JSON'} instead of JSON. ${providerEndpointHint(text, provider, envVar)}`
    );
  }

  try {
    const payload = JSON.parse(text);

    if (payload && typeof payload === 'object') {
      return payload as Record<string, unknown>;
    }
  } catch {
    throw new HttpError(502, `${label} returned invalid JSON. ${providerEndpointHint(text, provider, envVar)}`);
  }

  throw new HttpError(502, `${label} returned JSON that was not an object.`);
}

function summarizeProviderBody(body: string, provider: string, envVar: string) {
  const providerMessage = extractProviderErrorMessage(body);

  if (providerMessage) {
    return providerMessage;
  }

  if (looksLikeHtml(body)) {
    return providerEndpointHint(body, provider, envVar);
  }

  return body.replace(/\s+/g, ' ').trim().slice(0, 500) || providerEndpointHint(body, provider, envVar);
}

function extractProviderErrorMessage(body: string) {
  try {
    const payload = JSON.parse(body);
    const error = payload?.error;
    const message = error?.message ?? payload?.message ?? payload?.error_message;
    const code = error?.code ?? payload?.code;

    if (typeof message === 'string') {
      if (code === 'too_many_requests' || /quota|rate limit|too many requests/i.test(message)) {
        return 'Gemini quota is used up or rate-limited for this API key. Wait for quota to reset, add billing/credits, or use a different Gemini key/model.';
      }

      return message;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function providerEndpointHint(body: string, provider: string, envVar: string) {
  const htmlHint = looksLikeHtml(body)
    ? 'It returned an HTML webpage, which usually means the URL is a dashboard/web-app route or an old API path.'
    : 'The response did not look like the expected API JSON.';

  return `${htmlHint} Check ${envVar} in .env and use the current ${provider} API endpoint from their docs.`;
}

function looksLikeHtml(body: string) {
  return /<!doctype html|<html[\s>]/i.test(body);
}

function buildPhottaStatusUrl(generationId: string, tryOnUrl: string) {
  const statusTemplate = process.env.PHOTTA_STATUS_URL?.trim();

  if (!statusTemplate) {
    return `${tryOnUrl}/${encodeURIComponent(generationId)}`;
  }

  if (statusTemplate.includes('{id}')) {
    return statusTemplate.replace('{id}', encodeURIComponent(generationId));
  }

  return `${statusTemplate.replace(/\/$/, '')}/${encodeURIComponent(generationId)}`;
}

function extractTryOnUrl(payload: Record<string, unknown>): string | undefined {
  const output =
    payload.output ??
    payload.outputs ??
    payload.output_url ??
    payload.output_urls ??
    payload.outputUrl ??
    payload.outputUrls ??
    payload.image ??
    payload.images ??
    payload.image_url ??
    payload.image_urls ??
    payload.result ??
    payload.result_url;

  if (typeof payload.image_url === 'string') return payload.image_url;
  if (typeof payload.result_url === 'string') return payload.result_url;
  if (typeof payload.output_url === 'string') return payload.output_url;
  if (typeof output === 'string') return output;
  if (Array.isArray(output) && typeof output[0] === 'string') return output[0];
  if (Array.isArray(output) && output[0] && typeof output[0] === 'object') {
    return extractTryOnUrl(output[0] as Record<string, unknown>);
  }
  if (output && typeof output === 'object' && 'url' in output && typeof output.url === 'string') return output.url;
  if (output && typeof output === 'object') return extractTryOnUrl(output as Record<string, unknown>);

  return undefined;
}

function normalizeTryOnStatus(value: unknown) {
  const status = String(value ?? 'processing').toLowerCase();

  if (['completed', 'complete', 'succeeded', 'success', 'done', 'finished'].includes(status)) {
    return 'completed';
  }

  if (['failed', 'failure', 'error', 'cancelled', 'canceled'].includes(status)) {
    return 'failed';
  }

  return status;
}

function normalizeTryOnProvider(value?: string): TryOnProvider {
  const provider = value?.toLowerCase().trim();

  if (provider === 'gemini') return 'gemini';
  if (provider === 'photta') return 'photta';

  return process.env.GEMINI_API_KEY?.trim() ? 'gemini' : 'photta';
}

function extractNestedString(payload: unknown, pathParts: string[]) {
  let current = payload;

  for (const part of pathParts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : undefined;
}

function recordToWardrobeItem(
  record: SupabaseRecord,
  fallback: {
    classification: Classification;
    destination: ClosetDestination;
    imageUrl: string;
    tag: string;
    userId: string;
  }
): WardrobeItem {
  const category = normalizeCategory(record.category ?? fallback.classification.category);
  const subcategory = record.subcategory ?? fallback.classification.subcategory;
  const primaryColor = record.primary_color ?? fallback.classification.primary_color;

  return {
    category,
    color: colorNameToHex(primaryColor),
    createdAt: record.created_at ?? new Date().toISOString(),
    destination: normalizeDestination(record.destination ?? fallback.destination),
    id: record.id ?? crypto.randomUUID(),
    imageUrl: record.image_url ?? fallback.imageUrl,
    name: titleCase(subcategory || fallback.tag),
    pattern: record.pattern ?? fallback.classification.pattern,
    primaryColor,
    saved: true,
    subcategory,
    tags: record.tags ?? [fallback.tag],
    userId: record.user_id ?? fallback.userId,
  };
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
        files[name] = {
          data: content,
          filename: path.basename(filename),
          mimeType,
        };
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

async function downloadImage(url: string, filename: string): Promise<UploadedFile> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new HttpError(502, `Could not download processed image: ${await response.text()}`);
  }

  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'image/png';

  return {
    data: Buffer.from(await response.arrayBuffer()),
    filename,
    mimeType,
  };
}

function extractOpenAIText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];

  for (const entry of output) {
    if (!entry || typeof entry !== 'object' || !('content' in entry) || !Array.isArray(entry.content)) {
      continue;
    }

    for (const content of entry.content) {
      if (content && typeof content === 'object' && 'text' in content && typeof content.text === 'string') {
        return content.text;
      }
    }
  }

  throw new HttpError(502, 'OpenAI response did not include classification text.');
}

function normalizeCategory(category: string): ClosetCategory {
  const normalized = category.toLowerCase().trim();

  if (['top', 'tops', 'shirt', 'blouse', 'sweater'].includes(normalized)) return 'tops';
  if (['bottom', 'bottoms', 'pants', 'trousers', 'skirt', 'shorts'].includes(normalized)) return 'bottoms';
  if (['outerwear', 'jacket', 'coat'].includes(normalized)) return 'outerwear';
  if (['shoe', 'shoes', 'sneaker', 'boots'].includes(normalized)) return 'shoes';
  if (['accessory', 'accessories', 'jewelry', 'scarf'].includes(normalized)) return 'accessories';
  if (['bag', 'bags', 'purse'].includes(normalized)) return 'bags';

  return 'tops';
}

function normalizeImageUrls(imageUrls?: string[], fallbackImageUrl?: string) {
  const urls = [
    ...(Array.isArray(imageUrls) ? imageUrls : []),
    fallbackImageUrl,
  ]
    .map((imageUrl) => imageUrl?.trim())
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));

  return [...new Set(urls)];
}

function normalizeDestination(destination?: string): ClosetDestination {
  return destination?.toLowerCase() === 'wishlist' ? 'wishlist' : 'closet';
}

function productTypeFromCategory(category: ClosetCategory) {
  const productTypes: Record<ClosetCategory, string> = {
    accessories: 'accessory',
    bags: 'bag',
    bottoms: 'bottom',
    outerwear: 'outerwear',
    shoes: 'shoes',
    tops: 'top',
  };

  return productTypes[category];
}

function normalizePhottaPoseId(value?: string) {
  const poseId = value?.trim();

  if (!poseId || poseId === 'pose_standing_front') {
    return undefined;
  }

  return poseId;
}

function findBestPoseId(payload: unknown): string | undefined {
  const candidates: Array<{ category?: string; id: string; name?: string }> = [];
  collectPoseCandidates(payload, candidates);
  candidates.sort((a, b) => scorePoseCandidate(b) - scorePoseCandidate(a));

  return candidates[0]?.id;
}

function collectPoseCandidates(payload: unknown, candidates: Array<{ category?: string; id: string; name?: string }>): void {
  if (Array.isArray(payload)) {
    for (const item of payload) {
      collectPoseCandidates(item, candidates);
    }

    return;
  }

  if (!payload || typeof payload !== 'object') {
    return;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.id === 'string') {
    const poseId = normalizePhottaPoseId(record.id);

    if (poseId) {
      candidates.push({
        category: typeof record.category === 'string' ? record.category : undefined,
        id: poseId,
        name: typeof record.name === 'string' ? record.name : undefined,
      });
    }
  }

  for (const key of ['data', 'poses', 'items', 'results']) {
    collectPoseCandidates(record[key], candidates);
  }
}

function scorePoseCandidate(candidate: { category?: string; name?: string }) {
  const text = `${candidate.category ?? ''} ${candidate.name ?? ''}`.toLowerCase();
  let score = 0;

  if (text.includes('fullbody')) score += 100;
  if (text.includes('front')) score += 80;
  if (text.includes('standing')) score += 40;
  if (text.includes('straight')) score += 30;
  if (text.includes('relaxed')) score += 15;
  if (text.includes('halfbody')) score -= 20;
  if (text.includes('closeup')) score -= 60;
  if (text.includes('back')) score -= 500;
  if (text.includes('twist-away')) score -= 120;
  if (text.includes('look-over')) score -= 120;

  return score;
}

function colorNameToHex(color: string) {
  const key = color.toLowerCase().replace(/[^a-z]/g, '');
  const palette: Record<string, string> = {
    beige: '#C7A77D',
    black: '#211A17',
    blue: '#3B5F7C',
    brown: '#7A5A45',
    cream: '#FFF8EA',
    gold: '#C99A6B',
    gray: '#5F6673',
    green: '#8C9A7B',
    grey: '#5F6673',
    ivory: '#FFFDF9',
    navy: '#1F2233',
    pink: '#E2958A',
    red: '#8B2F2F',
    silver: '#C7CDD2',
    white: '#FFFDF9',
  };

  return palette[key];
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('png')) return '.png';

  return '.png';
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function imageToDataUri(image: UploadedFile) {
  return `data:${image.mimeType};base64,${image.data.toString('base64')}`;
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

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

if (require.main === module) {
  server.listen(port, () => {
    console.log(`BoveCloset API and prototype are ready at http://localhost:${port}`);
    console.log(`Gemini try-on model: ${process.env.GEMINI_TRY_ON_MODEL?.trim() || 'gemini-3.1-flash-image'}`);
    console.log(`Gemini key loaded: ${maskSecret(process.env.GEMINI_API_KEY)}`);
  });
}

module.exports = { server };

function maskSecret(value?: string) {
  const secret = value?.trim();

  if (!secret) {
    return 'not set';
  }

  return `${secret.slice(0, 6)}...${secret.slice(-4)}`;
}
