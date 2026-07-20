import { CategoryId, ClosetAccount, WardrobeItem } from '@/models/closet';
import type { SelectedOutfit } from '@/stores/closet-store';
import { getWeatherOutfitRecommendation } from '@/services/weather-recommendation';

type ChatContext = {
  closetItems: WardrobeItem[];
  currentUser: ClosetAccount | null;
  message: string;
  wishlistItems: WardrobeItem[];
};

export type ClosetChatReply = {
  outfit?: Partial<SelectedOutfit>;
  text: string;
};

const categoryOrder: CategoryId[] = ['shirt', 'dress', 'shorts', 'pants'];

export async function getClosetChatReply({
  closetItems,
  currentUser,
  message,
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

  if (asksForSummary(lower)) {
    return { text: summarizeWardrobe(closetItems, lower) };
  }

  if (asksForOutfit(lower)) {
    return getOutfitReply(text, closetItems);
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

async function getOutfitReply(message: string, items: WardrobeItem[]): Promise<ClosetChatReply> {
  if (items.length === 0) {
    return { text: 'Your closet is empty for this account, so I need you to add clothes before I can suggest an outfit you own.' };
  }

  const lower = message.toLowerCase();

  if (hasAny(lower, ['today', 'weather', 'rain', 'hot', 'cold'])) {
    try {
      const recommendation = await getWeatherOutfitRecommendation('Singapore', items);
      const names = recommendation.selectedItems.map(formatOwnedItem).join(', ');

      if (!names) {
        return { text: 'I checked your closet, but I need at least a shirt, dress, shorts, or pants saved before I can build a weather outfit.' };
      }

      return {
        outfit: recommendation.outfit,
        text: `In ${recommendation.weather.locationName}, it is ${recommendation.weather.temperatureC}°C and ${recommendation.weather.conditionLabel}. Try ${names}.`,
      };
    } catch {
      const fallback = buildLocalOutfit(items, lower);
      return {
        outfit: fallback.outfit,
        text: `I could not load live weather, so based on your closet I would try ${fallback.names}.`,
      };
    }
  }

  const outfit = buildLocalOutfit(items, lower);

  return {
    outfit: outfit.outfit,
    text: `Based on your closet, try ${outfit.names}.`,
  };
}

function buildLocalOutfit(items: WardrobeItem[], lower: string) {
  const selectedItems = categoryOrder
    .map((category) => pickItem(items, category, lower))
    .filter((item): item is WardrobeItem => Boolean(item))
    .slice(0, 5);
  const outfit = selectedItems.reduce<Partial<SelectedOutfit>>((nextOutfit, item) => {
    nextOutfit[item.category] = item.id;
    return nextOutfit;
  }, {});

  return {
    names: selectedItems.map(formatOwnedItem).join(', ') || 'one of your saved shirts with your favorite pants',
    outfit,
  };
}

function pickItem(items: WardrobeItem[], category: CategoryId, lower: string) {
  const candidates = items.filter((item) => item.category === category);

  if (candidates.length === 0) {
    return undefined;
  }

  return [...candidates].sort((left, right) => scoreForPrompt(right, lower) - scoreForPrompt(left, lower))[0];
}

function scoreForPrompt(item: WardrobeItem, lower: string) {
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

  return score;
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
    shirt: 'shirts',
    dress: 'dresses',
    shorts: 'shorts',
    pants: 'pants',
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
