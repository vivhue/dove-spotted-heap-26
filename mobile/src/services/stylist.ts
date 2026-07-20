import { InventoryState, WardrobeItem } from '@/models/closet';
import { getTrainingContext } from '@/services/training-data';

export type ChatMode = 'outfit' | 'buy' | 'adjust';

export type StyleRecommendation = {
  mode: ChatMode;
  title: string;
  summary: string;
  basis?: string;
  showPanel: boolean;
  outfit: WardrobeItem[];
  fallback: WardrobeItem[];
  tips: string[];
};

type OccasionProfile = {
  keywords: string[];
  title: string;
  summary: string;
  outfitCategories: Array<WardrobeItem['category']>;
  fallbackCategories: Array<WardrobeItem['category']>;
  tips: string[];
};

const occasionProfiles: OccasionProfile[] = [
  {
    keywords: ['presentation', 'presentations', 'pitch', 'seminar', 'talk', 'demo'],
    title: 'Presentation-ready',
    summary: 'I would keep it polished, structured, and easy to move in.',
    outfitCategories: ['shirt', 'pants'],
    fallbackCategories: ['shirt', 'pants', 'dress'],
    tips: ['Tuck the shirt in and keep the silhouette clean and simple.'],
  },
  {
    keywords: ['interview', 'meeting', 'office', 'work', 'client'],
    title: 'Work-ready',
    summary: 'I would go for confident, neat, and low-noise pieces.',
    outfitCategories: ['shirt', 'pants'],
    fallbackCategories: ['shirt', 'pants', 'dress'],
    tips: ['Avoid loud prints and let one clean shirt-and-pants pairing do the work.'],
  },
  {
    keywords: ['date', 'dinner', 'night out', 'party', 'event'],
    title: 'Date-night',
    summary: 'I would make it a little softer and more intentional.',
    outfitCategories: ['dress', 'shirt', 'pants'],
    fallbackCategories: ['dress', 'shirt', 'pants'],
    tips: ['Pick one focal point, then keep the rest simple so the outfit feels deliberate.'],
  },
  {
    keywords: ['casual', 'weekend', 'coffee', 'brunch', 'travel', 'airport'],
    title: 'Easy casual',
    summary: 'I would keep it comfortable but still put together.',
    outfitCategories: ['shirt', 'shorts'],
    fallbackCategories: ['shirt', 'pants', 'shorts'],
    tips: ['Use the most relaxed item as the base and one cleaner item to sharpen the look.'],
  },
];

const fallbackProfile: OccasionProfile = {
  keywords: [],
  title: 'Everyday',
  summary: 'I would start with the cleanest matching pieces in your closet.',
  outfitCategories: ['shirt', 'pants'],
  fallbackCategories: ['shirt', 'pants', 'dress', 'shorts'],
  tips: ['If you are unsure, keep the colors close and let fit do the work.'],
};

export function buildStyleRecommendation(query: string, inventory: InventoryState): StyleRecommendation {
  const training = getTrainingContext(query);
  if (training.intent === 'greeting') {
    return {
      mode: 'adjust',
      title: 'Tell me the vibe',
      summary: 'Give me the occasion, dress code, or mood and I will pull a look from your closet.',
      showPanel: false,
      outfit: [],
      fallback: [],
      tips: [],
    };
  }

  const profile = matchOccasion(query, training);
  const outfitCategories = training.outfitCategories.length > 0 ? training.outfitCategories : profile.outfitCategories;
  const fallbackCategories = training.fallbackCategories.length > 0 ? training.fallbackCategories : profile.fallbackCategories;
  const outfit = pickWardrobeSet(outfitCategories, inventory.closet, query);
  const fallback = pickWardrobeSet(fallbackCategories, inventory.wishlist, query);
  const isSleepQuery = training.intent === 'sleep';
  const isFormalComfortQuery = isFormalComfortQueryText(query);
  const mode: ChatMode = isSleepQuery ? 'buy' : outfit.length >= 3 ? 'outfit' : fallback.length > 0 ? 'buy' : 'adjust';

  const tips = [...profile.tips, ...training.styleNotes];

  if (training.missingPiece) {
    tips.push(training.missingPiece.reason);
  }

  if (isSleepQuery && outfit.length === 0 && fallback.length === 0) {
    tips.unshift('I do not see sleepwear in your closet yet, so I would buy a soft pajama or lounge set.');
  }

  if (isFormalComfortQuery) {
    tips.unshift('Keep the outfit formal, but choose the softest polished pieces so you can move comfortably.');
  }

  if (mode === 'adjust') {
    tips.push('I could not find a full match, so I would modify what you already own before buying anything.');
  } else if (mode === 'buy') {
    tips.push('Your closet is light on this category, so I would use your wishlist as the shopping shortlist.');
  }

  if (outfit.length > 0) {
    tips.push(`Start with ${outfit[0].name}${outfit[1] ? ` and ${outfit[1].name}` : ''}.`);
  }

  return {
    mode,
    title: profile.title,
    summary: profile.summary,
    basis: training.basis,
    showPanel: true,
    outfit,
    fallback,
    tips,
  };
}

export function buildReply(query: string, recommendation: StyleRecommendation): string {
  const lower = query.toLowerCase();

  if (recommendation.showPanel === false) {
    return recommendation.summary;
  }

  if (lower.includes('save')) {
    return 'I can frame this as a saved look. I would keep the current outfit and move it into the calendar once you confirm it.';
  }

  if (lower.includes('another') || lower.includes('try')) {
    return 'I can swap the mood. I would either soften the top, switch the shoe, or add a cleaner outer layer.';
  }

  if (lower.includes('sleep') || lower.includes('pajama') || lower.includes('pajamas') || lower.includes('bed') || lower.includes('lounge')) {
    return recommendation.outfit.length > 0 || recommendation.fallback.length > 0
      ? 'I would keep this soft and breathable, but I do not see a dedicated sleepwear option in the closet yet.'
      : 'I would buy a soft pajama or lounge set for this.';
  }

  if (lower.includes('soft') || lower.includes('softer') || lower.includes('not too stiff') || lower.includes('less stiff')) {
    return recommendation.mode === 'outfit'
      ? 'I would keep the look polished, but soften the shape so it feels less stiff.'
      : 'I would soften this with the pieces below and keep the silhouette easy.';
  }

  if (recommendation.mode === 'buy') {
    return 'I do not have a full outfit in the closet, so I would use the shopping suggestions below.';
  }

  if (recommendation.mode === 'adjust') {
    return 'I would tweak what you already have first and keep it simple.';
  }

  return 'I would use the pieces below from your closet.';
}

function matchOccasion(query: string, training: ReturnType<typeof getTrainingContext>): OccasionProfile {
  const lower = query.toLowerCase();

  if (training.occasion) {
    return {
      keywords: training.occasion.keywords,
      title: buildOccasionTitle(training, lower),
      summary: buildOccasionSummary(training, lower),
      outfitCategories: training.outfitCategories,
      fallbackCategories: training.fallbackCategories,
      tips: training.occasion.styleNotes,
    };
  }

  return occasionProfiles.find((profile) => profile.keywords.some((keyword) => lower.includes(keyword))) ?? fallbackProfile;
}

function pickWardrobeSet(
  categories: Array<WardrobeItem['category']>,
  items: WardrobeItem[],
  query: string
) {
  const lower = query.toLowerCase();
  const picked: WardrobeItem[] = [];
  const usedIds = new Set<string>();

  categories.forEach((category) => {
    const match = pickBestItem(items, category, lower, usedIds);
    if (match) {
      picked.push(match);
      usedIds.add(match.id);
    }
  });

  return picked;
}

function pickBestItem(
  items: WardrobeItem[],
  category: WardrobeItem['category'],
  lowerQuery: string,
  usedIds: Set<string>
) {
  const pool = items.filter((item) => item.category === category && !usedIds.has(item.id));

  if (pool.length === 0) {
    return null;
  }

  const scored = pool
    .map((item) => ({ item, score: scoreItem(item, lowerQuery) }))
    .sort((left, right) => right.score - left.score);

  return scored[0]?.item ?? null;
}

function scoreItem(item: WardrobeItem, query: string) {
  const label = `${item.name} ${item.category} ${item.texture ?? ''}`.toLowerCase();
  let score = 0;

  if (query.includes('presentation') || query.includes('interview') || query.includes('work')) {
    if (label.includes('shirt') || label.includes('trouser') || label.includes('jacket') || label.includes('trench')) {
      score += 3;
    }
    if (label.includes('boots') || label.includes('polo')) {
      score += 2;
    }
  }

  if (query.includes('date') || query.includes('dinner')) {
    if (label.includes('skirt') || label.includes('tank') || label.includes('mary') || label.includes('scarf')) {
      score += 3;
    }
  }

  if (query.includes('casual') || query.includes('weekend') || query.includes('travel') || query.includes('coffee')) {
    if (label.includes('sneaker') || label.includes('polo') || label.includes('denim') || label.includes('bomber')) {
      score += 3;
    }
  }

  if (query.includes('sleep') || query.includes('bed') || query.includes('pajama') || query.includes('lounge')) {
    if (label.includes('tank') || label.includes('tee') || label.includes('knit') || label.includes('soft')) {
      score += 3;
    }
  }

  if (label.includes('white') || label.includes('black') || label.includes('slate') || label.includes('beige')) {
    score += 1;
  }

  if (item.saved) {
    score += 0.5;
  }

  return score;
}

function isFormalComfortQueryText(query: string) {
  const lower = query.toLowerCase();
  return (
    (lower.includes('formal') || lower.includes('scholarship') || lower.includes('ceremony') || lower.includes('gala')) &&
    (lower.includes('comfortable') || lower.includes('comfort') || lower.includes('sports') || lower.includes('movement') || lower.includes('move') || lower.includes('soft') || lower.includes('softer') || lower.includes('not too stiff') || lower.includes('less stiff'))
  );
}

function buildOccasionTitle(training: ReturnType<typeof getTrainingContext>, lower: string) {
  if (training.intent === 'sleep') {
    return 'Sleepwear';
  }

  if (isFormalComfortQueryText(lower)) {
    return 'Formal but comfortable';
  }

  return training.occasion?.title ?? 'Everyday';
}

function buildOccasionSummary(training: ReturnType<typeof getTrainingContext>, lower: string) {
  if (training.intent === 'sleep') {
    return 'Soft, breathable, and comfortable.';
  }

  if (isFormalComfortQueryText(lower)) {
    return 'Polished enough for the event, but soft enough to move in comfortably.';
  }

  if (lower.includes('soft') || lower.includes('softer') || lower.includes('not too stiff') || lower.includes('less stiff')) {
    return 'Polished, but softened so it feels less stiff.';
  }

  if (training.occasion?.id === 'interview') {
    return 'Confident, polished, and low-noise.';
  }

  if (training.occasion?.id === 'presentation') {
    return 'Polished and clean, without feeling stiff.';
  }

  if (training.occasion?.id === 'formal-event') {
    return 'Formal, polished, and comfortable enough to move in.';
  }

  return training.occasion?.styleNotes.join(', ') || 'A clean outfit for the occasion.';
}
