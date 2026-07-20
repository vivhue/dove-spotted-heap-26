import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { WardrobeDestination, WardrobeItem } from '@/models/closet';

type ImageAsset = {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
};

type ClosetItemPayload = {
  destination: WardrobeDestination;
  image: ImageAsset;
  tag: string;
  userId?: string;
};

type TryOnPayload = {
  baseImageUrl?: string;
  category: WardrobeItem['category'];
  garmentImageUrl: string;
  garmentImageUrls?: string[];
  poseId?: string;
  productType?: string;
  provider?: 'gemini' | 'photta';
  userId?: string;
};

export type WebStyleSource = {
  snippet: string;
  title: string;
  url: string;
};

export type WebStyleSuggestion = {
  outfit: string[];
  searchQuery: string;
  stores: {
    name: string;
    query: string;
    url: string;
  }[];
  sources: WebStyleSource[];
  summary: string;
  title: string;
};

type MannequinPayload = {
  image: ImageAsset;
  provider?: 'gemini' | 'photta';
  userId?: string;
};

const apiBaseUrl = resolveApiBaseUrl();

export async function createClosetItem({
  destination,
  image,
  tag,
  userId = 'demo-user',
}: ClosetItemPayload) {
  const formData = new FormData();
  formData.append('tag', tag);
  formData.append('destination', destination === 'closet' ? 'Closet' : 'Wishlist');
  formData.append('userId', userId);
  await appendImageFile(formData, image);

  const response = await fetchWithBackendMessage(`${apiBaseUrl}/api/closet-items`, {
    body: formData,
    method: 'POST',
  });

  return readJsonResponse<WardrobeItem>(response);
}

export async function getClosetItems(userId = 'demo-user') {
  const response = await fetchWithBackendMessage(`${apiBaseUrl}/api/closet-items?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
  });

  return readJsonResponse<WardrobeItem[]>(response);
}

async function appendImageFile(formData: FormData, image: ImageAsset) {
  const fileName = image.fileName ?? `closet-item-${Date.now()}.${extensionFromMime(image.mimeType)}`;
  const mimeType = image.mimeType ?? mimeTypeFromFileName(fileName);

  if (Platform.OS === 'web') {
    const response = await fetch(image.uri);
    const blob = await response.blob();
    formData.append('image', new File([blob], fileName, { type: blob.type || mimeType }));
    return;
  }

  formData.append('image', {
    name: fileName,
    type: mimeType,
    uri: image.uri,
  } as never);
}

function extensionFromMime(mimeType?: string | null) {
  if (mimeType?.includes('webp')) return 'webp';
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('jpeg') || mimeType?.includes('jpg')) return 'jpg';

  return 'jpg';
}

function mimeTypeFromFileName(fileName: string) {
  const normalized = fileName.toLowerCase();

  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';

  return 'image/jpeg';
}

export async function createTryOn({
  baseImageUrl,
  category,
  garmentImageUrl,
  garmentImageUrls,
  poseId,
  productType,
  provider,
  userId = 'demo-user',
}: TryOnPayload) {
  const response = await fetchWithBackendMessage(`${apiBaseUrl}/api/try-on`, {
    body: JSON.stringify({
      baseImageUrl,
      category,
      garmentImageUrl,
      garmentImageUrls,
      poseId,
      productType,
      provider,
      userId,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  return readJsonResponse<{ generationId: string; outputUrl?: string; status?: string }>(response);
}

export async function getProfile(userId = 'demo-user') {
  const response = await fetchWithBackendMessage(`${apiBaseUrl}/api/profile?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
  });

  return readJsonResponse<{ mannequinId: string | null; selfieImageUrl: string | null }>(response);
}

export async function setupMannequin({ image, provider, userId = 'demo-user' }: MannequinPayload) {
  const formData = new FormData();
  formData.append('userId', userId);
  if (provider) {
    formData.append('provider', provider);
  }
  await appendImageFile(formData, image);

  const response = await fetchWithBackendMessage(`${apiBaseUrl}/api/profile/mannequin`, {
    body: formData,
    method: 'POST',
  });

  return readJsonResponse<{ mannequinId: string; selfieImageUrl: string }>(response);
}

export async function getTryOnStatus(generationId: string) {
  const response = await fetchWithBackendMessage(`${apiBaseUrl}/api/try-on/${encodeURIComponent(generationId)}`, {
    method: 'GET',
  });

  return readJsonResponse<{ error?: unknown; error_message?: string; message?: string; output_url?: string; status: string }>(response);
}

export async function getWebOutfitSuggestion(query: string) {
  const response = await fetchWithBackendMessage(`${apiBaseUrl}/api/style/web-outfit`, {
    body: JSON.stringify({ query }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  return readJsonResponse<{ text: string; webSuggestion: WebStyleSuggestion }>(response);
}

async function fetchWithBackendMessage(url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(`Cannot reach the backend at ${apiBaseUrl}. Start it from the project root with npm run dev, and keep your phone on the same Wi-Fi as this computer.`);
  }
}

function resolveApiBaseUrl() {
  const configuredUrl =
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    'http://localhost:5173';

  if (Platform.OS === 'web' || !isLocalhostUrl(configuredUrl)) {
    return configuredUrl;
  }

  const expoHost = getExpoDevHost();

  if (expoHost) {
    return replaceUrlHost(configuredUrl, expoHost);
  }

  if (Platform.OS === 'android') {
    return replaceUrlHost(configuredUrl, '10.0.2.2');
  }

  return configuredUrl;
}

function getExpoDevHost() {
  const constants = Constants as typeof Constants & {
    expoConfig?: { hostUri?: string | null };
    linkingUri?: string | null;
    manifest?: {
      debuggerHost?: string | null;
      hostUri?: string | null;
    };
    manifest2?: {
      extra?: {
        expoGo?: {
          debuggerHost?: string | null;
          hostUri?: string | null;
        };
      };
    };
  };
  const hostUri =
    constants.expoConfig?.hostUri ??
    constants.manifest?.hostUri ??
    constants.manifest?.debuggerHost ??
    constants.manifest2?.extra?.expoGo?.hostUri ??
    constants.manifest2?.extra?.expoGo?.debuggerHost ??
    constants.linkingUri;

  return extractHost(hostUri);
}

function isLocalhostUrl(value: string) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

function replaceUrlHost(value: string, host: string) {
  const url = new URL(value);
  url.hostname = host;

  return url.toString().replace(/\/$/, '');
}

function extractHost(value?: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).hostname;
  } catch {
    return value.replace(/^[a-z]+:\/\//i, '').split(':')[0];
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in payload
        ? String(payload.error)
        : `Request failed with ${response.status}.`;

    throw new Error(message);
  }

  return payload as T;
}
