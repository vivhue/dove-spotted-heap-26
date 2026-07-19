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
  userId?: string;
};

type MannequinPayload = {
  image: ImageAsset;
  userId?: string;
};

const apiBaseUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:5173';

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
      userId,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  return readJsonResponse<{ generationId: string }>(response);
}

export async function getProfile(userId = 'demo-user') {
  const response = await fetchWithBackendMessage(`${apiBaseUrl}/api/profile?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
  });

  return readJsonResponse<{ mannequinId: string | null; selfieImageUrl: string | null }>(response);
}

export async function setupMannequin({ image, userId = 'demo-user' }: MannequinPayload) {
  const formData = new FormData();
  formData.append('userId', userId);
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

async function fetchWithBackendMessage(url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw new Error(`Cannot reach the backend at ${apiBaseUrl}. Start it from the project root with npm run dev.`);
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
