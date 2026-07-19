export type ScreenId =
  | 'splash'
  | 'home'
  | 'dashboard'
  | 'closet'
  | 'wishlist'
  | 'add'
  | 'try-on'
  | 'account'
  | 'discover'
  | 'calendar';

export type CategoryId = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'bags';
export type WardrobeDestination = 'closet' | 'wishlist';
export const currentUserDisplayName = 'there';

export type WardrobeItem = {
  id: string;
  name: string;
  category: CategoryId;
  accent?: string;
  color?: string;
  texture?: 'classic' | 'denim' | 'knit' | 'leather' | 'metal' | 'silk';
  source?: string;
  price?: string;
  saved?: boolean;
  destination?: WardrobeDestination;
  imageUrl?: string;
  pattern?: string;
  primaryColor?: string;
  subcategory?: string;
  tags?: string[];
  userId?: string;
  createdAt?: string;
};

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
  'account',
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
];

export const homeSwatches: CategoryId[] = ['tops', 'bottoms', 'outerwear', 'shoes'];

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

export const categoryFilters = ['All', 'Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];
