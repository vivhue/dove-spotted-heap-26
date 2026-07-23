import { BodyMeasurements, CategoryId, ClosetAccount, WardrobeItem } from '@/models/closet';
import type { SelectedOutfit } from '@/stores/closet-store';
import { getClosetChatReplyFromModel } from '@/services/closet-api';
import { getWeatherOutfitRecommendation } from '@/services/weather-recommendation';

export type BodyShape = 'hourglass' | 'pear' | 'inverted triangle' | 'rectangle' | 'apple';
export type LegTorsoRatio = 'longer legs' | 'shorter legs' | 'balanced';
export type Undertone = 'warm' | 'cool' | 'neutral';
export type ContrastLevel = 'low contrast' | 'high contrast';
export type FitPreference = 'fitted' | 'relaxed' | 'balanced';

export type BodyProfile = {
  chestCm: number | null;
  derivedShape: BodyShape | null;
  heightCm: number | null;
  hipsCm: number | null;
  inseamCm: number | null;
  legTorsoRatio: LegTorsoRatio | null;
  waistCm: number | null;
};

export type ColorProfile = {
  avoidPalette: string[];
  contrastLevel: ContrastLevel | null;
  recommendedPalette: string[];
  undertone: Undertone | null;
};

export type StyleProfile = {
  bottomFitPref: FitPreference | null;
  tags: string[];
  topFitPref: FitPreference | null;
};

type ChatContext = {
  bodyProfile?: BodyProfile;
  colorProfile?: ColorProfile;
  closetItems: WardrobeItem[];
  currentUser: ClosetAccount | null;
  hasAttachedImage?: boolean;
  message: string;
  selectedClosetItems?: WardrobeItem[];
  styleProfile?: StyleProfile;
  wishlistItems: WardrobeItem[];
};

export type ClosetChatReply = {
  outfit?: Partial<SelectedOutfit>;
  text: string;
};

const categoryOrder: CategoryId[] = ['shirt', 'dress', 'shorts', 'pants'];
const fashionTrends2026 = [
  {
    name: 'Polka dots for clean/minimal outfits',
    keywords: ['polka', 'dot', 'spotted', 'spot print'],
    vibe: 'Minimalist, clean, and a little playful. Keep the base neutral so the dots feel intentional instead of loud.',
    styling: 'Try a polka-dot top or dress with black, white, beige, or denim. If you want it quieter, make the dots the only pattern.',
  },
  {
    name: 'Capris and pedal pushers',
    keywords: ['capri', 'pedal pusher', 'cropped pant', 'cropped trouser'],
    vibe: 'Very 2026 cool-girl: simple, slightly retro, and easy to dress up or down.',
    styling: 'Style capris with a fitted tank, button-down, ballet flats, sandals, or a small statement bag.',
  },
  {
    name: 'Breezy button-downs',
    keywords: ['button down', 'button-down', 'shirt', 'linen shirt', 'stripe'],
    vibe: 'Clean, relaxed, and polished without trying too hard.',
    styling: 'Wear open over a tank, tucked into relaxed pants, or layered with shorts for a school/campus-friendly fit.',
  },
  {
    name: 'Midi skirts and soft movement',
    keywords: ['midi', 'skirt', 'silk', 'flowy', 'slip skirt'],
    vibe: 'Soft, feminine, and wearable for both casual and dressed-up plans.',
    styling: 'Pair with a simple tee or tank for daytime, or a fitted top and sandals for dinner.',
  },
  {
    name: 'Eyelet and lace textures',
    keywords: ['eyelet', 'lace', 'embroidered', 'broderie'],
    vibe: 'Romantic but still fresh when balanced with simple basics.',
    styling: 'Keep the rest plain: a tank, straight pants, denim, or clean sandals so the texture can stand out.',
  },
  {
    name: 'Sporty influence',
    keywords: ['sporty', 'jersey', 'track', 'soccer', 'athletic', 'polo'],
    vibe: 'Casual, youthful, and practical. Good if you want a fit that feels current but comfortable.',
    styling: 'Try a jersey, polo, track pant, or sporty layer with one cleaner piece so it does not look like gym wear.',
  },
  {
    name: 'Statement sandals and flip-flops',
    keywords: ['flip flop', 'flip-flop', 'sandal', 'strappy', 'toe ring'],
    vibe: 'Summer 2026 is making easy sandals look intentional.',
    styling: 'Use them with linen pants, capris, midi skirts, or a simple dress. Cleaner materials make them look more polished.',
  },
  {
    name: 'Balloon pants',
    keywords: ['balloon', 'barrel', 'harem', 'voluminous'],
    vibe: 'A more directional pant shape: relaxed but still fashion-aware.',
    styling: 'Balance the volume with a fitted or cropped top. For school, keep colors simple so the shape does the work.',
  },
  {
    name: 'Small statement details',
    keywords: ['brooch', 'scarf', 'fringe', 'teal', 'turquoise', 'statement'],
    vibe: 'Easy way to make basic outfits feel updated without changing the whole look.',
    styling: 'Add a scarf, brooch, teal accent, fringe detail, or bold accessory to a simple base outfit.',
  },
  {
    name: 'Soft sky-blue and mint accents',
    keywords: ['sky blue', 'baby blue', 'powder blue', 'mint', 'aqua'],
    vibe: 'Fresh and clean without feeling too loud.',
    styling: 'Use the color as one accent: shoes, bag, top, cardigan, or nails with an otherwise neutral outfit.',
  },
  {
    name: 'Board shorts and surfer ease',
    keywords: ['board short', 'surfer', 'long short', 'bermuda'],
    vibe: 'Relaxed, practical, and a bit sporty. Good when you want casual but still intentional.',
    styling: 'Pair longer shorts with a fitted tank, crisp shirt, simple sandals, or a cleaner bag to keep the outfit balanced.',
  },
] as const;

// The wardrobe used to carry broad 'tops'/'bottoms' buckets. Try-on only accepts
// the four categories above, so the fit heuristics below ask these instead.
const isTop = (category: CategoryId) => category === 'shirt';
const isBottom = (category: CategoryId) => category === 'pants' || category === 'shorts';

export async function getClosetChatReply(context: ChatContext): Promise<ClosetChatReply> {
  if (!context.currentUser) {
    return { text: 'Create an account first, then I can answer using your own closet.' };
  }

  try {
    const reply = await getClosetChatReplyFromModel({
      bodyProfile: context.bodyProfile,
      closetItems: context.closetItems,
      colorProfile: context.colorProfile,
      currentUser: context.currentUser,
      hasAttachedImage: Boolean(context.hasAttachedImage),
      message: context.message,
      selectedClosetItems: context.selectedClosetItems ?? [],
      styleProfile: context.styleProfile,
      wishlistItems: context.wishlistItems,
    });

    if (reply.text.trim()) {
      return reply;
    }
  } catch {
    // Fall back to the local rules engine if the model route is unavailable.
  }

  return getLocalClosetChatReply(context);
}

async function getLocalClosetChatReply({
  bodyProfile,
  colorProfile,
  closetItems,
  currentUser,
  message,
  styleProfile,
  wishlistItems,
}: ChatContext): Promise<ClosetChatReply> {
  // getClosetChatReply already rejects signed-out users, but narrow the type
  // here too so this stays safe if called directly.
  if (!currentUser) {
    return { text: 'Create an account first, then I can answer using your own closet.' };
  }

  const text = message.trim();
  const lower = text.toLowerCase();

  if (isGreeting(lower)) {
    return {
      text: `Hi ${currentUser.username}. What are we dressing for today - school, work, a date, errands, or just a cute everyday fit?`,
    };
  }

  if (asksOpenEndedStyleHelp(lower)) {
    return {
      text: closetItems.length
        ? 'I got you. What is the occasion and mood: casual, polished, comfy, dressed-up, or something more bold? I can pull from your closet once I know the vibe.'
        : 'I got you. What is the occasion and mood: casual, polished, comfy, dressed-up, or something more bold? Add a few closet items and I can make it more personal.',
    };
  }

  if (!isClosetQuestion(lower)) {
    return { text: 'I can help. Are you planning an outfit for a specific occasion, or do you want me to suggest a general vibe from your closet?' };
  }

  if (asksAboutSpending(lower)) {
    return {
      text: 'I do not have purchase history for your account yet, so I cannot calculate spending without guessing.',
    };
  }

  if (asksAboutWearStats(lower)) {
    return {
      text: 'Wear counts are not tracked yet, so I cannot honestly say what you wear most or least.',
    };
  }

  if (asksAboutWishlistSales(lower)) {
    if (wishlistItems.length === 0) {
      return { text: 'Your wishlist is empty right now, so there are no saved items for me to check.' };
    }

    return {
      text: `You have ${wishlistItems.length} wishlist item${wishlistItems.length === 1 ? '' : 's'}, but live sale checking is not connected yet.`,
    };
  }

  if (asksBodyProportionQuestion(lower)) {
    return { text: bodyProportionReply(closetItems, bodyProfile) };
  }

  if (asksColorProfileQuestion(lower)) {
    return { text: colorProfileReply(closetItems, colorProfile) };
  }

  if (asksStyleProfileQuestion(lower)) {
    return { text: styleProfileReply(closetItems, styleProfile) };
  }

  if (asksShoppingGapQuestion(lower)) {
    return { text: shoppingGapReply(closetItems, bodyProfile) };
  }

  if (asksTrendQuestion(lower)) {
    return { text: trendReply(closetItems, wishlistItems, lower) };
  }

  if (asksForSummary(lower)) {
    return { text: summarizeWardrobe(closetItems, lower) };
  }

  if (asksForOutfit(lower)) {
    return getOutfitReply(text, closetItems, bodyProfile, styleProfile, currentUser.gender);
  }

  if (asksShoppingQuestion(lower)) {
    return { text: shoppingReply(closetItems, wishlistItems, lower) };
  }

  return { text: styleGuidanceReply(closetItems, lower) };
}

function isClosetQuestion(lower: string) {
  return hasAny(lower, [
    'wear',
    'outfit',
    'style',
    'fashion',
    'closet',
    'wardrobe',
    'clothes',
    'clothing',
    'shirt',
    'top',
    'pants',
    'jeans',
    'skirt',
    'dress',
    'shoes',
    'jacket',
    'coat',
    'color',
    'colour',
    'undertone',
    'palette',
    'pattern',
    'polka',
    'capri',
    'pedal pusher',
    'button down',
    'button-down',
    'eyelet',
    'lace',
    'balloon pants',
    'barrel pants',
    'board shorts',
    'proportion',
    'body',
    'shape',
    'silhouette',
    'fit preference',
    'quiz',
    'gap',
    'missing',
    'need',
    'buy',
    'shop',
    'wishlist',
    'sale',
    'trend',
    'aesthetic',
    'date',
    'interview',
    'school',
    'work',
    'weather',
    'rain',
    'hot',
    'cold',
  ]);
}

function asksAboutSpending(lower: string) {
  return hasAny(lower, ['spend', 'spent', 'cost', 'money', 'budget']);
}

function asksAboutWearStats(lower: string) {
  return hasAny(lower, ['most worn', 'least worn', 'wear most', 'wear least', 'worn']);
}

function asksAboutWishlistSales(lower: string) {
  return lower.includes('sale') || lower.includes('discount');
}

function asksForSummary(lower: string) {
  return hasAny(lower, ['own', 'have', 'most of', 'how many', 'summary', 'breakdown', 'colors', 'colours', 'categories']);
}

function asksForOutfit(lower: string) {
  return hasAny(lower, ['what should i wear', 'outfit', 'wear today', 'date', 'interview', 'school', 'work', 'rain', 'hot', 'cold']);
}

function isGreeting(lower: string) {
  return /^(hi|hello|hey|heyy|hii|yo|sup)\b[!.\s]*$/i.test(lower.trim());
}

function asksOpenEndedStyleHelp(lower: string) {
  return hasAny(lower, [
    'idk what to wear',
    'idk how i should dress',
    'how should i dress',
    'how do i dress',
    'what should i wear',
    'help me dress',
    'help me style',
    'dress up',
    'no idea what to wear',
    'dont know what to wear',
    "don't know what to wear",
  ]);
}

function asksShoppingQuestion(lower: string) {
  return hasAny(lower, ['buy', 'shop', 'similar', 'duplicate', 'wishlist']);
}

function asksShoppingGapQuestion(lower: string) {
  return hasAny(lower, ['what should i buy', 'missing', 'wardrobe gap', 'gap', 'complete my closet', 'round things out', 'need in my closet']);
}

function asksTrendQuestion(lower: string) {
  return (
    hasAny(lower, ['trend', 'trending', 'viral', '2026', 'current fashion', 'in style', 'popular right now', 'aesthetic']) ||
    fashionTrends2026.some((trend) => hasAny(lower, trend.keywords))
  );
}

function asksBodyProportionQuestion(lower: string) {
  return hasAny(lower, ['body shape', 'body proportion', 'measurements', 'flatter my body', 'suit my body', 'for my shape']);
}

function asksStyleProfileQuestion(lower: string) {
  return hasAny(lower, ['style archetype', 'fit preference', 'style quiz', 'what style am i', 'silhouette']);
}

function asksColorProfileQuestion(lower: string) {
  return hasAny(lower, ['undertone', 'color palette', 'colour palette', 'what colors suit', 'what colours suit', 'patterns suit', 'pattern should i']);
}

function summarizeWardrobe(items: WardrobeItem[], lower: string) {
  if (items.length === 0) {
    return 'Your closet is empty for this account, so I do not have wardrobe data to summarize yet.';
  }

  const groupByCategory = hasAny(lower, ['category', 'categories', 'type', 'types']);
  const counts = groupByCategory
    ? countBy(items, (item) => labelForCategory(item.category))
    : countBy(items, (item) => item.primaryColor || item.color || 'unknown color');
  const topCounts = Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([label, count]) => `${label}: ${count}`)
    .join(', ');

  return groupByCategory
    ? `Based on your closet, your biggest categories are ${topCounts}.`
    : `Based on your closet, your most common colors are ${topCounts}.`;
}

async function getOutfitReply(
  message: string,
  items: WardrobeItem[],
  bodyProfile?: BodyProfile,
  styleProfile?: StyleProfile,
  gender?: ClosetAccount['gender']
): Promise<ClosetChatReply> {
  const lower = message.toLowerCase();

  if (items.length === 0) {
    return {
      text: generalOutfitReply(lower),
    };
  }

  if (hasAny(lower, ['today', 'weather', 'rain', 'hot', 'cold'])) {
    try {
      const recommendation = await getWeatherOutfitRecommendation('Singapore', items);
      const names = recommendation.selectedItems.map(formatOwnedItem).join(', ');

      if (!names) {
        return { text: 'I checked your closet, but I need at least a top, bottom, or shoes saved before I can build a weather outfit.' };
      }

      return {
        outfit: recommendation.outfit,
        text: `In ${recommendation.weather.locationName}, it is ${recommendation.weather.temperatureC}°C and ${recommendation.weather.conditionLabel}. Try ${names}.`,
      };
    } catch {
      const fallback = buildLocalOutfit(items, lower, bodyProfile, styleProfile, gender);
      return {
        outfit: fallback.outfit,
        text: `I could not load live weather, so based on your closet I would try ${fallback.names}.`,
      };
    }
  }

  const outfit = buildLocalOutfit(items, lower, bodyProfile, styleProfile, gender);

  return {
    outfit: outfit.outfit,
    text: `Based on your closet, try ${outfit.names}.`,
  };
}

function buildLocalOutfit(
  items: WardrobeItem[],
  lower: string,
  bodyProfile?: BodyProfile,
  styleProfile?: StyleProfile,
  gender?: ClosetAccount['gender']
) {
  const selectedItems = categoryOrder
    .map((category) => pickItem(items, category, lower, bodyProfile, styleProfile, gender))
    .filter((item): item is WardrobeItem => Boolean(item))
    .slice(0, 5);
  const outfit = selectedItems.reduce<Partial<SelectedOutfit>>((nextOutfit, item) => {
    nextOutfit[item.category] = item.id;
    return nextOutfit;
  }, {});

  return {
    names: selectedItems.map(formatOwnedItem).join(', ') || 'one of your saved tops with your easiest shoes',
    outfit,
  };
}

function pickItem(
  items: WardrobeItem[],
  category: CategoryId,
  lower: string,
  bodyProfile?: BodyProfile,
  styleProfile?: StyleProfile,
  gender?: ClosetAccount['gender']
) {
  const candidates = items.filter((item) => item.category === category);

  if (candidates.length === 0) {
    return undefined;
  }

  return [...candidates].sort(
    (left, right) =>
      scoreForPrompt(right, lower, bodyProfile, styleProfile, gender) - scoreForPrompt(left, lower, bodyProfile, styleProfile, gender)
  )[0];
}

function scoreForPrompt(item: WardrobeItem, lower: string, bodyProfile?: BodyProfile, styleProfile?: StyleProfile, gender?: ClosetAccount['gender']) {
  const text = searchableText(item);
  let score = 0;

  if (hasAny(lower, ['interview', 'work', 'formal'])) {
    if (hasAny(text, ['blazer', 'shirt', 'trouser', 'coat', 'loafer', 'black', 'white', 'navy'])) score += 8;
  }

  if (hasAny(lower, ['date', 'dinner', 'party'])) {
    if (hasAny(text, ['dress', 'silk', 'black', 'boot', 'skirt', 'jacket'])) score += 7;
  }

  if (hasAny(lower, ['school', 'casual', 'class'])) {
    if (hasAny(text, ['tee', 'jeans', 'sneaker', 'hoodie', 'denim'])) score += 7;
  }

  if (hasAny(lower, ['rain'])) {
    if (hasAny(text, ['trench', 'jacket', 'coat', 'boot', 'leather', 'waterproof'])) score += 7;
  }

  if (hasAny(lower, ['hot', 'warm'])) {
    if (hasAny(text, ['tee', 'tank', 'linen', 'short', 'skirt', 'sandal'])) score += 7;
  }

  if (hasAny(lower, ['cold', 'warm outfit'])) {
    if (hasAny(text, ['coat', 'jacket', 'knit', 'sweater', 'boot', 'denim'])) score += 7;
  }

  if (gender === 'male' && hasAny(text, ['shirt', 'tee', 'polo', 'trouser', 'pants', 'jeans', 'loafer', 'sneaker', 'jacket'])) score += 5;
  if (gender === 'female' && hasAny(text, ['blouse', 'top', 'skirt', 'dress', 'camisole', 'wide leg', 'heels', 'flats', 'bag'])) score += 5;

  if (styleProfile?.topFitPref === 'fitted' && isTop(item.category) && hasAny(text, ['fitted', 'wrap', 'ribbed', 'tailored'])) score += 4;
  if (styleProfile?.topFitPref === 'relaxed' && isTop(item.category) && hasAny(text, ['oversized', 'relaxed', 'boxy', 'loose'])) score += 4;
  if (styleProfile?.bottomFitPref === 'fitted' && isBottom(item.category) && hasAny(text, ['slim', 'skinny', 'straight'])) score += 4;
  if (styleProfile?.bottomFitPref === 'relaxed' && isBottom(item.category) && hasAny(text, ['wide', 'baggy', 'cargo', 'pleated'])) score += 4;

  const shape = bodyProfile?.derivedShape;
  if (shape === 'hourglass' && hasAny(text, ['fitted', 'wrap', 'waist', 'belted'])) score += 3;
  if (shape === 'pear' && ((isTop(item.category) && hasAny(text, ['structured', 'boat', 'jacket'])) || (isBottom(item.category) && hasAny(text, ['straight', 'wide', 'dark'])))) score += 3;
  if (shape === 'inverted triangle' && ((isTop(item.category) && hasAny(text, ['soft', 'drape', 'simple'])) || (isBottom(item.category) && hasAny(text, ['full', 'pattern', 'wide', 'pleated'])))) score += 3;
  if (shape === 'rectangle' && hasAny(text, ['peplum', 'belted', 'layered', 'pleat', 'cargo'])) score += 3;
  if (shape === 'apple' && hasAny(text, ['empire', 'v-neck', 'flowy', 'straight', 'mid-rise', 'structured'])) score += 3;

  return score;
}

function shoppingGapReply(items: WardrobeItem[], bodyProfile?: BodyProfile) {
  if (items.length === 0) {
    return 'Your closet is empty right now. A neutral shirt, a pair of pants, and a versatile dress would give you a useful base.';
  }

  const counts = countBy(items, (item) => labelForCategory(item.category));
  const colors = countBy(items, (item) => item.primaryColor || item.color || 'unknown color');
  // Keys must match labelForCategory's output exactly, which is lower case.
  const gaps = [
    { category: 'shirts', count: counts.shirts ?? 0, label: 'simple neutral shirt' },
    { category: 'pants', count: counts.pants ?? 0, label: 'pair of neutral pants' },
    { category: 'dresses', count: counts.dresses ?? 0, label: 'versatile dress' },
    { category: 'shorts', count: counts.shorts ?? 0, label: 'pair of shorts for warm days' },
  ];
  const missing = gaps.find((gap) => gap.count === 0);

  if (missing) {
    const shapeNote = bodyProfile?.derivedShape ? ` For your proportions, I would lean ${shapeLookup(bodyProfile.derivedShape).bottoms.toLowerCase()}.` : '';
    return `Based on your closet, you have no ${missing.category} saved yet. Adding a ${missing.label} would round things out.${shapeNote}`;
  }

  const neutralCount = (colors.Black ?? 0) + (colors.White ?? 0) + (colors.Beige ?? 0) + (colors.Navy ?? 0) + (colors.Grey ?? 0) + (colors.Gray ?? 0);

  if (neutralCount < Math.ceil(items.length * 0.25)) {
    return 'Based on your closet, your categories are covered, but neutrals look light. A black, white, beige, or navy basic would make more outfits easier.';
  }

  return 'Your core wardrobe gaps are not obvious from the saved items. I would avoid buying more until you add wear counts or wishlist prices.';
}

function bodyProportionReply(items: WardrobeItem[], bodyProfile?: BodyProfile) {
  if (!bodyProfile || !hasCompleteBodyProfile(bodyProfile)) {
    return "I'd need your height, chest, waist, hips, and inseam to give shape-based suggestions - want to add those to your profile?";
  }

  const shape = bodyProfile.derivedShape;

  if (!shape) {
    return "I'd need your height, chest, waist, hips, and inseam to give shape-based suggestions - want to add those to your profile?";
  }

  const lookup = shapeLookup(shape);
  const matchingItem = findShapeItem(items, shape);
  const legNote = legLengthNote(bodyProfile, items);

  return `Based on your measurements, your proportions read as ${shape}. For tops, ${lookup.tops.toLowerCase()}. For bottoms, ${lookup.bottoms.toLowerCase()}. From your closet, ${matchingItem} is a good place to start.${legNote ? ` ${legNote}` : ''}`;
}

function styleProfileReply(items: WardrobeItem[], styleProfile?: StyleProfile) {
  if (!styleProfile?.topFitPref || !styleProfile.bottomFitPref || styleProfile.tags.length === 0) {
    return "I don't know your fit preference yet - want to do a quick 6-question style quiz? I'll show you outfit pairs and you pick what you'd actually wear.";
  }

  const combo = buildLocalOutfit(items, `${styleProfile.topFitPref} top ${styleProfile.bottomFitPref} bottom`, undefined, styleProfile);

  return `You tend to go for ${styleProfile.topFitPref} tops with ${styleProfile.bottomFitPref} bottoms - that's a ${styleProfile.tags.join(', ')} look. Based on your closet, try ${combo.names}.`;
}

function colorProfileReply(items: WardrobeItem[], colorProfile?: ColorProfile) {
  if (!colorProfile?.undertone || !colorProfile.contrastLevel) {
    return "I don't have your undertone yet - want to do a quick 4-question quiz? Takes about 30 seconds.";
  }

  const colorCounts = countBy(items, (item) => item.primaryColor || item.color || 'unknown color');
  const dominant = Object.entries(colorCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'your saved colors';
  const patternAdvice =
    colorProfile.contrastLevel === 'high contrast'
      ? 'bolder or graphic patterns can work well'
      : 'tonal or subtle patterns will usually feel more harmonious';

  return `You're a ${colorProfile.undertone} undertone with ${colorProfile.contrastLevel}. Colors worth buying: ${colorProfile.recommendedPalette.join(', ')}. I'd steer away from ${colorProfile.avoidPalette.join(', ')}. For patterns, ${patternAdvice}. Looking at your closet, it skews toward ${dominant}.`;
}

function shoppingReply(closetItems: WardrobeItem[], wishlistItems: WardrobeItem[], lower: string) {
  if (lower.includes('wishlist')) {
    return wishlistItems.length
      ? `Based on your wishlist, you have ${wishlistItems.length} saved item${wishlistItems.length === 1 ? '' : 's'}; live prices are not connected yet.`
      : 'Your wishlist is empty for this account right now.';
  }

  if (closetItems.length === 0) {
    return 'I cannot check duplicates yet because this account has no closet items saved.';
  }

  return 'I can help check duplicates from your closet once the item image or product link is attached.';
}

export function buildBodyProfile(measurements: BodyMeasurements): BodyProfile {
  const heightCm = measurementNumber(measurements.height);
  const chestCm = measurementNumber(measurements.chest);
  const waistCm = measurementNumber(measurements.waist);
  const hipsCm = measurementNumber(measurements.hips);
  const inseamCm = measurementNumber(measurements.inseam);
  const complete = Boolean(heightCm && chestCm && waistCm && hipsCm && inseamCm);
  const legRatio = heightCm && inseamCm ? inseamCm / heightCm : null;

  return {
    chestCm,
    derivedShape: complete ? deriveBodyShape(chestCm!, waistCm!, hipsCm!) : null,
    heightCm,
    hipsCm,
    inseamCm,
    legTorsoRatio: legRatio ? legRatioLabel(legRatio) : null,
    waistCm,
  };
}

function measurementNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(',', '.'));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function deriveBodyShape(chest: number, waist: number, hips: number): BodyShape {
  const bustHipDiff = hips - chest;
  const waistHipDiff = hips - waist;
  const waistBustDiff = chest - waist;

  if (Math.abs(bustHipDiff) <= 5 && waistBustDiff >= 20 && waistHipDiff >= 20) return 'hourglass';
  if (hips - chest >= 8) return 'pear';
  if (chest - hips >= 8) return 'inverted triangle';
  if (waistBustDiff < 10 && waistHipDiff < 10) return 'rectangle';
  return 'apple';
}

function legRatioLabel(ratio: number): LegTorsoRatio {
  if (ratio > 0.47) return 'longer legs';
  if (ratio < 0.43) return 'shorter legs';
  return 'balanced';
}

function hasCompleteBodyProfile(profile: BodyProfile) {
  return Boolean(profile.heightCm && profile.chestCm && profile.waistCm && profile.hipsCm && profile.inseamCm);
}

function shapeLookup(shape: BodyShape) {
  const lookup: Record<BodyShape, { bottoms: string; tops: string }> = {
    apple: {
      bottoms: 'Straight leg, mid-rise, structured',
      tops: 'Empire line, V-neck, flowy',
    },
    hourglass: {
      bottoms: "Match top's fit, avoid boxy",
      tops: 'Fitted, wrap, defined waist',
    },
    'inverted triangle': {
      bottoms: 'Fuller, patterned, lighter tone',
      tops: 'Simple, soft draping',
    },
    pear: {
      bottoms: 'Straight/wide leg, darker tone',
      tops: 'Structured shoulders, boat neck',
    },
    rectangle: {
      bottoms: 'Pleats or cargo detail to add shape',
      tops: 'Peplum, belted, layered',
    },
  };

  return lookup[shape];
}

function findShapeItem(items: WardrobeItem[], shape: BodyShape) {
  const keywords: Record<BodyShape, string[]> = {
    apple: ['v-neck', 'flowy', 'straight', 'mid-rise', 'structured'],
    hourglass: ['fitted', 'wrap', 'belted', 'waist'],
    'inverted triangle': ['soft', 'drape', 'wide', 'pleated', 'pattern'],
    pear: ['structured', 'boat', 'straight', 'wide', 'dark'],
    rectangle: ['peplum', 'belted', 'layered', 'pleat', 'cargo'],
  };
  const match = items.find((item) => hasAny(searchableText(item), keywords[shape]));

  return match ? formatOwnedItem(match) : 'a saved piece that follows that silhouette';
}

function legLengthNote(profile: BodyProfile, items: WardrobeItem[]) {
  if (!profile.legTorsoRatio) {
    return '';
  }

  if (profile.legTorsoRatio === 'shorter legs') {
    const example = items.find((item) => hasAny(searchableText(item), ['high rise', 'ankle', 'long', 'straight']));
    return `Your leg-to-torso ratio suggests higher-rise or longer hems work well${example ? ` - ${formatOwnedItem(example)} is a useful example` : ''}.`;
  }

  if (profile.legTorsoRatio === 'longer legs') {
    return 'Your leg-to-torso ratio suggests most rises and lengths should be easy to style.';
  }

  return 'Your leg-to-torso ratio reads balanced, so rise and hem choices can be led by the outfit mood.';
}

function styleGuidanceReply(items: WardrobeItem[], lower: string) {
  if (items.length === 0) {
    return 'Tell me the occasion first - school, work, date, errands, dinner, or just everyday? Then I can suggest a fit direction instead of guessing.';
  }

  const categoryCounts = countBy(items, (item) => labelForCategory(item.category));
  const topCategory = Object.entries(categoryCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'pieces';

  if (hasAny(lower, ['trend', 'trending'])) {
    return trendReply(items, [], lower);
  }

  return `You have the most depth in ${topCategory.toLowerCase()}. What occasion are you dressing for? I can make it casual, polished, comfy, or more statement depending on the vibe.`;
}

function trendReply(closetItems: WardrobeItem[], wishlistItems: WardrobeItem[], lower: string) {
  const matchedTrend = findRequestedTrend(lower);

  if (matchedTrend) {
    const matchingItems = findTrendItems(closetItems, matchedTrend.keywords);
    const matchingWishlistItems = findTrendItems(wishlistItems, matchedTrend.keywords);
    const closetNote = matchingItems.length
      ? `From your closet, I would start with ${matchingItems.slice(0, 2).map(formatOwnedItem).join(' or ')}.`
      : 'I do not see a saved item for this trend yet, but you can still use it as a shopping or upload reference.';
    const wishlistNote = matchingWishlistItems.length
      ? `You also have ${matchingWishlistItems.slice(0, 2).map(formatOwnedItem).join(' or ')} in your wishlist, which fits this direction.`
      : '';

    return `${matchedTrend.name}: ${matchedTrend.vibe} ${matchedTrend.styling} ${closetNote} ${wishlistNote} Do you want to blend it into a clean everyday fit, or make it more standout?`.replace(/\s+/g, ' ');
  }

  const trendNames = fashionTrends2026
    .slice(0, 6)
    .map((trend) => trend.name)
    .join(', ');

  return `For 2026, I would track these: ${trendNames}. Tell me which vibe you want - clean/minimal, sporty, romantic, bold, or school-friendly - and I can turn it into an outfit formula.`;
}

function findRequestedTrend(lower: string) {
  const wantsCleanMinimal = hasAny(lower, ['minimal', 'minimalist', 'clean', 'simple']);

  return (
    fashionTrends2026.find((trend) => hasAny(lower, trend.keywords)) ??
    (wantsCleanMinimal ? fashionTrends2026[0] : undefined)
  );
}

function findTrendItems(items: WardrobeItem[], keywords: readonly string[]) {
  return items.filter((item) => hasAny(searchableText(item), [...keywords]));
}

function generalOutfitReply(lower: string) {
  if (hasAny(lower, ['school', 'class', 'campus', 'uni', 'university', 'college'])) {
    return [
      'For school, a safe general formula is a clean top with relaxed jeans or straight pants, then sneakers or flats so it still feels practical.',
      'If you want to blend in, keep the colors neutral and the silhouette simple.',
      'If you want to stand out, add one statement piece, like a brighter top, layered jacket, interesting bag, or accessories.',
      'Do you want your school fit to feel comfy, polished, cute, or more standout?',
    ].join(' ');
  }

  if (hasAny(lower, ['work', 'interview', 'presentation'])) {
    return [
      'For a more polished setting, I would start with a neat top, straight pants or a simple skirt, and one structured layer.',
      'Keep colors quieter if you want to look professional, or add one stronger color/detail if you want more personality.',
      'Is this for work, an interview, or a presentation?',
    ].join(' ');
  }

  if (hasAny(lower, ['date', 'dinner', 'party'])) {
    return [
      'For going out, I would choose one focal point: either a nicer top, a dress, or a statement layer, then keep the rest easy.',
      'Do you want the outfit to feel soft and cute, confident, or low-key?',
    ].join(' ');
  }

  return [
    'I can still suggest a general direction even before you upload closet items.',
    'A reliable base is a clean top, comfortable bottoms, and one piece that sets the mood, like a jacket, bag, shoe, or accessory.',
    'Do you want to blend in, stand out, look polished, or stay comfy?',
  ].join(' ');
}

function countBy(items: WardrobeItem[], getKey: (item: WardrobeItem) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = titleCase(getKey(item));
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function formatOwnedItem(item: WardrobeItem) {
  const color = item.primaryColor || item.color;
  const name = item.name || labelForCategory(item.category);

  return color && !name.toLowerCase().includes(color.toLowerCase())
    ? `your ${color} ${name}`
    : `your ${name}`;
}

function searchableText(item: WardrobeItem) {
  return [
    item.name,
    item.category,
    item.color,
    item.primaryColor,
    item.pattern,
    item.subcategory,
    item.texture,
    ...(item.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function labelForCategory(category: CategoryId) {
  const labels: Record<CategoryId, string> = {
    dress: 'dresses',
    pants: 'pants',
    shirt: 'shirts',
    shorts: 'shorts',
  };

  return labels[category];
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Unknown';
}

function hasAny(text: string, needles: readonly string[]) {
  return needles.some((needle) => text.includes(needle));
}
