export type ScreenId =
  | 'splash'
  | 'home'
  | 'dashboard'
  | 'closet'
  | 'wishlist'
  | 'add'
  | 'discover'
  | 'calendar';

export type CategoryId = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'bags';

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
  'discover',
  'calendar',
];

export const browseCategories: {
  id: CategoryId;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'tops', label: 'Tops', shortLabel: 'Tops' },
  { id: 'bottoms', label: 'Bottoms', shortLabel: 'Bottoms' },
  { id: 'outerwear', label: 'Outerwear', shortLabel: 'Outerwear' },
  { id: 'shoes', label: 'Shoes', shortLabel: 'Shoes' },
  { id: 'accessories', label: 'Accessories', shortLabel: 'Accessories' },
  { id: 'bags', label: 'Bags', shortLabel: 'Bags' },
];

export const homeSwatches: CategoryId[] = ['tops', 'bottoms', 'outerwear', 'shoes'];

export const closetItems: WardrobeItem[] = [
  { id: 'white-polo', name: 'Pearl Rib Polo', category: 'tops', color: '#FFFDF9', accent: '#2B2118', texture: 'knit', saved: true },
  { id: 'checkered-shirt', name: 'Check Collar Shirt', category: 'tops', color: '#D9E2EA', accent: '#8B2F2F', texture: 'classic', saved: true },
  { id: 'mesh-tank', name: 'Cocoa Mesh Tank', category: 'tops', color: '#7A5A45', accent: '#F0C7A0', texture: 'silk', saved: true },
  { id: 'wide-leg-denim', name: 'Wide Leg Denim', category: 'bottoms', color: '#3B5F7C', accent: '#C99A6B', texture: 'denim', saved: true },
  { id: 'tailored-trouser', name: 'Slate Tailored Trouser', category: 'bottoms', color: '#5F6673', accent: '#EFE6D6', texture: 'classic', saved: true },
  { id: 'midi-skirt', name: 'Ink Bias Skirt', category: 'bottoms', color: '#1F2233', accent: '#E2958A', texture: 'silk', saved: true },
  { id: 'beige-trench', name: 'Oversized Trench', category: 'outerwear', color: '#C7A77D', accent: '#2B2118', texture: 'classic', saved: true },
  { id: 'cropped-bomber', name: 'Sage Cropped Bomber', category: 'outerwear', color: '#8C9A7B', accent: '#FFFDF9', texture: 'classic', saved: true },
  { id: 'moto-jacket', name: 'Black Moto Jacket', category: 'outerwear', color: '#1F1B18', accent: '#B7B7AF', texture: 'leather', saved: true },
  { id: 'black-boots', name: 'Black Ankle Boots', category: 'shoes', color: '#211A17', accent: '#A97B4E', texture: 'leather', saved: true },
  { id: 'mary-janes', name: 'Cherry Mary Janes', category: 'shoes', color: '#8B2F2F', accent: '#F7D7D1', texture: 'leather', saved: true },
  { id: 'silver-sneakers', name: 'Silver Runner Sneakers', category: 'shoes', color: '#C7CDD2', accent: '#5F6673', texture: 'metal', saved: true },
  { id: 'silk-scarf', name: 'Painted Silk Scarf', category: 'accessories', color: '#E2958A', accent: '#2F6F73', texture: 'silk', saved: true },
  { id: 'gold-hoops', name: 'Molten Hoop Earrings', category: 'accessories', color: '#C99A6B', accent: '#FFF3D8', texture: 'metal', saved: true },
  { id: 'oval-sunnies', name: 'Amber Oval Sunnies', category: 'accessories', color: '#6A4732', accent: '#E2B06F', texture: 'classic', saved: true },
];

export const wishlistItems: WardrobeItem[] = [
  { id: 'wool-coat', name: 'Graphite Wool Coat', category: 'outerwear', price: '$56', source: 'Zara', color: '#4E535C', accent: '#C99A6B', texture: 'knit' },
  {
    id: 'checkered-collar',
    name: 'Checkered Collar Shirt',
    category: 'tops',
    price: '$58',
    source: 'H&M',
    color: '#EEE4D8',
    accent: '#8B2F2F',
    texture: 'classic',
  },
  { id: 'wishlist-boots', name: 'Patent Platform Boots', category: 'shoes', color: '#171412', accent: '#C99A6B', texture: 'leather' },
  { id: 'wishlist-trench', name: 'Storm Flap Trench', category: 'outerwear', color: '#B8996E', accent: '#2B2118', texture: 'classic' },
  { id: 'pearl-choker', name: 'Pearl Choker', category: 'accessories', color: '#FFF8EA', accent: '#C99A6B', texture: 'metal' },
];

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

export const categoryFilters = ['All', 'Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories', 'Bags'];

export const initialInventoryState: InventoryState = {
  closet: closetItems.map((item) => ({ ...item })),
  wishlist: wishlistItems.map((item) => ({ ...item, saved: false })),
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
