import { BodyMeasurements, CategoryId, ClosetAccount, WardrobeItem } from '@/models/closet';
import type { SelectedOutfit } from '@/stores/closet-store';
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
  message: string;
  styleProfile?: StyleProfile;
  wishlistItems: WardrobeItem[];
};

export type ClosetChatReply = {
  outfit?: Partial<SelectedOutfit>;
  text: string;
};

const categoryOrder: CategoryId[] = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories', 'bags'];

export async function getClosetChatReply({
  bodyProfile,
  colorProfile,
  closetItems,
  currentUser,
  message,
  styleProfile,
  wishlistItems,
}: ChatContext): Promise<ClosetChatReply> {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (!currentUser) {
    return { text: 'Create an account first, then I can answer using your own closet.' };
  }

  if (!isClosetQuestion(lower)) {
    return { text: 'I can help with outfits, your wardrobe, shopping, and style. Ask me what to wear or what you own most of.' };
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

function asksShoppingQuestion(lower: string) {
  return hasAny(lower, ['buy', 'shop', 'similar', 'duplicate', 'wishlist']);
}

function asksShoppingGapQuestion(lower: string) {
  return hasAny(lower, ['what should i buy', 'missing', 'wardrobe gap', 'gap', 'complete my closet', 'round things out', 'need in my closet']);
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
  if (items.length === 0) {
    return { text: 'Your closet is empty for this account, so I need you to add clothes before I can suggest an outfit you own.' };
  }

  const lower = message.toLowerCase();

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

  if (styleProfile?.topFitPref === 'fitted' && item.category === 'tops' && hasAny(text, ['fitted', 'wrap', 'ribbed', 'tailored'])) score += 4;
  if (styleProfile?.topFitPref === 'relaxed' && item.category === 'tops' && hasAny(text, ['oversized', 'relaxed', 'boxy', 'loose'])) score += 4;
  if (styleProfile?.bottomFitPref === 'fitted' && item.category === 'bottoms' && hasAny(text, ['slim', 'skinny', 'straight'])) score += 4;
  if (styleProfile?.bottomFitPref === 'relaxed' && item.category === 'bottoms' && hasAny(text, ['wide', 'baggy', 'cargo', 'pleated'])) score += 4;

  const shape = bodyProfile?.derivedShape;
  if (shape === 'hourglass' && hasAny(text, ['fitted', 'wrap', 'waist', 'belted'])) score += 3;
  if (shape === 'pear' && ((item.category === 'tops' && hasAny(text, ['structured', 'boat', 'jacket'])) || (item.category === 'bottoms' && hasAny(text, ['straight', 'wide', 'dark'])))) score += 3;
  if (shape === 'inverted triangle' && ((item.category === 'tops' && hasAny(text, ['soft', 'drape', 'simple'])) || (item.category === 'bottoms' && hasAny(text, ['full', 'pattern', 'wide', 'pleated'])))) score += 3;
  if (shape === 'rectangle' && hasAny(text, ['peplum', 'belted', 'layered', 'pleat', 'cargo'])) score += 3;
  if (shape === 'apple' && hasAny(text, ['empire', 'v-neck', 'flowy', 'straight', 'mid-rise', 'structured'])) score += 3;

  return score;
}

function shoppingGapReply(items: WardrobeItem[], bodyProfile?: BodyProfile) {
  if (items.length === 0) {
    return 'Your closet is empty right now. A neutral top, relaxed bottom, versatile shoe, and light layer would give you a useful base.';
  }

  const counts = countBy(items, (item) => labelForCategory(item.category));
  const colors = countBy(items, (item) => item.primaryColor || item.color || 'unknown color');
  const gaps = [
    { category: 'tops', count: counts.Tops ?? 0, label: 'simple neutral top' },
    { category: 'bottoms', count: counts.Bottoms ?? 0, label: 'neutral bottom' },
    { category: 'outerwear', count: counts.Outerwear ?? 0, label: 'light layering piece' },
    { category: 'shoes', count: counts.Shoes ?? 0, label: 'versatile everyday shoe' },
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
    return 'Here is an idea to explore: start with a simple capsule of a neutral top, relaxed bottoms, and one statement layer.';
  }

  const categoryCounts = countBy(items, (item) => labelForCategory(item.category));
  const topCategory = Object.entries(categoryCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'pieces';

  if (hasAny(lower, ['trend', 'trending'])) {
    return `General style idea: try soft tailoring, sporty flats, or tonal layering. Based on your closet, you can start by styling one of your ${topCategory.toLowerCase()} in a cleaner, more intentional silhouette.`;
  }

  return `Based on your closet, you have the most depth in ${topCategory.toLowerCase()}. An idea to explore is mixing that with one sharper piece, like a structured jacket or cleaner shoe.`;
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
    accessories: 'accessories',
    bags: 'bags',
    bottoms: 'bottoms',
    outerwear: 'outerwear',
    shoes: 'shoes',
    tops: 'tops',
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

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}
