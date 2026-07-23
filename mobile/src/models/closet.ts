export type ScreenId =
  | 'splash'
  | 'home'
  | 'dashboard'
  | 'closet'
  | 'wishlist'
  | 'add'
  | 'try-on'
  | 'look-history'
  | 'trip-planner'
  | 'account'
  | 'discover'
  | 'calendar';

// Try-on garment categories. Single source of truth, mirrored server-side in
// lib/garments.ts. Only these four are supported by IDM-VTON try-on.
export type CategoryId = 'shirt' | 'dress' | 'shorts' | 'pants';
export type WardrobeDestination = 'closet' | 'wishlist';
// Optional fit attribute; mirrored server-side in lib/garments.ts and matched
// by the wishlist fit filter.
export type WardrobeFit = 'fitted' | 'relaxed' | 'structured';

export const wardrobeFitOptions: { id: WardrobeFit; label: string }[] = [
  { id: 'fitted', label: 'Fitted' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'structured', label: 'Structured' },
];
// Bag/shoe avatars went away with the broad browse categories; these are the
// shapes ClosetIcon can actually draw.
export type AvatarChoice = 'initial' | 'hanger' | 'shirt' | 'dress' | 'shorts' | 'pants';
export const currentUserDisplayName = 'there';

export type PixelAvatarConfig = {
  body: 'slim' | 'classic' | 'strong' | 'curvy';
  ears: 'small' | 'round' | 'pointed';
  eyes: 'calm' | 'bright' | 'wink';
  face: 'soft' | 'sharp' | 'round';
  hair: 'bob' | 'short' | 'waves' | 'spikes' | 'cap';
  mouth: 'smile' | 'neutral' | 'open';
  nose: 'dot' | 'line' | 'button';
  outfitColor: string;
  skinColor: string;
};

export const defaultPixelAvatar: PixelAvatarConfig = {
  body: 'classic',
  ears: 'small',
  eyes: 'bright',
  face: 'soft',
  hair: 'bob',
  mouth: 'smile',
  nose: 'dot',
  outfitColor: '#2F5F8F',
  skinColor: '#C8895C',
};

export const pixelAvatarOptions = {
  bodies: ['slim', 'classic', 'strong', 'curvy'] as const,
  ears: ['small', 'round', 'pointed'] as const,
  eyes: ['calm', 'bright', 'wink'] as const,
  faces: ['soft', 'sharp', 'round'] as const,
  hair: ['bob', 'short', 'waves', 'spikes', 'cap'] as const,
  mouths: ['smile', 'neutral', 'open'] as const,
  noses: ['dot', 'line', 'button'] as const,
  outfitColors: ['#2F5F8F', '#E18A39', '#9B5BC4', '#4E8B57', '#D96A77', '#1F2937'] as const,
  skinColors: ['#7A4A2A', '#A96B43', '#C8895C', '#E2B184', '#6F86B5', '#7AA36A'] as const,
};

export type ClosetAccount = {
  avatar?: AvatarChoice;
  guidedMode?: boolean;
  id: string;
  username: string;
  password: string;
  createdAt: string;
  gender?: 'female' | 'male';
  pixelAvatar?: PixelAvatarConfig;
};

export type WardrobeItem = {
  id: string;
  name: string;
  category: CategoryId;
  accent?: string;
  color?: string;
  imageUrl?: string;
  texture?: 'classic' | 'denim' | 'knit' | 'leather' | 'metal' | 'silk';
  source?: string;
  price?: string;
  saved?: boolean;
  destination?: WardrobeDestination;
  fit?: WardrobeFit;
  notes?: string;
  pattern?: string;
  primaryColor?: string;
  subcategory?: string;
  tags?: string[];
  userId?: string;
  createdAt?: string;
};

export type SavedTrip = {
  dateRange: string;
  id: string;
  looks: {
    id: string;
    itemIds: string[];
    title: string;
  }[];
  packedItems: WardrobeItem[];
  title: string;
};

export type InventoryState = {
  closet: WardrobeItem[];
  wishlist: WardrobeItem[];
};

export type InventoryLocation = keyof InventoryState;

export type BodyMeasurements = {
  chest: string;
  height: string;
  hips: string;
  inseam: string;
  waist: string;
};

export type BodyProportions = {
  armLength: number;
  hipWidth: number;
  legLength: number;
  shoulderWidth: number;
  torsoLength: number;
  torsoWidth: number;
};

export const defaultMeasurements: BodyMeasurements = {
  chest: '92',
  height: '168',
  hips: '96',
  inseam: '76',
  waist: '74',
};

const defaultNumericMeasurements = {
  chest: 92,
  height: 168,
  hips: 96,
  inseam: 76,
  waist: 74,
};

function toMeasurementNumber(value: string, fallback: number) {
  const parsed = Number.parseFloat(value.replace(',', '.'));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getBodyProportions(measurements: BodyMeasurements): BodyProportions {
  const height = toMeasurementNumber(measurements.height, defaultNumericMeasurements.height);
  const chest = toMeasurementNumber(measurements.chest, defaultNumericMeasurements.chest);
  const waist = toMeasurementNumber(measurements.waist, defaultNumericMeasurements.waist);
  const hips = toMeasurementNumber(measurements.hips, defaultNumericMeasurements.hips);
  const inseam = toMeasurementNumber(measurements.inseam, defaultNumericMeasurements.inseam);

  const heightScale = clamp(height / defaultNumericMeasurements.height, 0.86, 1.16);
  const chestScale = clamp(chest / defaultNumericMeasurements.chest, 0.78, 1.28);
  const waistScale = clamp(waist / defaultNumericMeasurements.waist, 0.76, 1.32);
  const hipScale = clamp(hips / defaultNumericMeasurements.hips, 0.78, 1.3);
  const legScale = clamp(inseam / defaultNumericMeasurements.inseam, 0.82, 1.22);
  const torsoScale = clamp((heightScale * 1.4 + (2 - legScale) * 0.6) / 2, 0.88, 1.14);

  return {
    armLength: clamp((heightScale + torsoScale) / 2, 0.86, 1.16),
    hipWidth: hipScale,
    legLength: legScale,
    shoulderWidth: clamp(chestScale * 0.82 + heightScale * 0.18, 0.82, 1.22),
    torsoLength: torsoScale,
    torsoWidth: clamp((chestScale * 0.56 + waistScale * 0.44), 0.78, 1.28),
  };
}

export const screenOrder: ScreenId[] = [
  'home',
  'dashboard',
  'closet',
  'wishlist',
  'add',
  'try-on',
  'trip-planner',
  'account',
  'discover',
  'calendar',
];

export const browseCategories: {
  id: CategoryId;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'shirt', label: 'Shirts', shortLabel: 'Shirts' },
  { id: 'dress', label: 'Dresses', shortLabel: 'Dresses' },
  { id: 'shorts', label: 'Shorts', shortLabel: 'Shorts' },
  { id: 'pants', label: 'Pants', shortLabel: 'Pants' },
];

export const homeSwatches: CategoryId[] = ['shirt', 'dress', 'shorts', 'pants'];

export const chatMessages = [
  {
    id: 'bot-intro',
    role: 'bot',
    text: "Hey! Tell me the vibe or the event and I'll pull an outfit from your closet.",
  },
  { id: 'user-interview', role: 'user', text: 'What should I wear for an interview?' },
  {
    id: 'bot-answer',
    role: 'bot',
    text:
      'For a confident, polished look: your beige trench coat over the white polo, with the black ankle boots. Want me to save this as an outfit?',
  },
] as const;

export const calendarLooks = [
  { day: 2, hasLook: true },
  { day: 4, hasLook: true },
  { day: 7, hasLook: true },
  { day: 10, hasLook: true },
  { day: 15, hasLook: true },
  { day: 28, selected: true },
];

export const categoryFilters = ['All', 'Shirts', 'Dresses', 'Shorts', 'Pants'];

// Starts empty; real items load from the backend via the closet store. (The
// legacy local inventory in use-closet-app.ts is seeded from this.)
export const initialInventoryState: InventoryState = {
  closet: [],
  wishlist: [],
};

export function cloneInventoryState(state: InventoryState): InventoryState {
  return {
    closet: state.closet.map((item) => ({ ...item })),
    wishlist: state.wishlist.map((item) => ({ ...item })),
  };
}

export function createWardrobeItem(input: {
  category: CategoryId;
  destination: InventoryLocation;
  name: string;
  color?: string;
  accent?: string;
  imageUrl?: string;
  texture?: WardrobeItem['texture'];
  source?: string;
  price?: string;
}): WardrobeItem {
  return {
    id: `${input.destination}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    category: input.category,
    color: input.color,
    accent: input.accent,
    imageUrl: input.imageUrl,
    texture: input.texture,
    source: input.source,
    price: input.price,
    saved: input.destination === 'closet',
  };
}
