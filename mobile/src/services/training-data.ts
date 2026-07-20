import labelsFile from '../../training/labels.sample.json';
import outfitsFile from '../../training/outfits.sample.json';
import occasionsFile from '../../training/occasions.sample.json';

import { CategoryId } from '@/models/closet';
import {
  TrainingLabel,
  TrainingLabelFile,
  TrainingMissingPiece,
  TrainingOccasion,
  TrainingOutfit,
  TrainingOutfitIdea,
  QueryIntent,
} from '@/models/training';

const labelFile = labelsFile as TrainingLabelFile;
const outfitExamples = outfitsFile as TrainingOutfit[];
const occasionRules = occasionsFile as TrainingOccasion[];

const labelsById = new Map(labelFile.items.map((item) => [item.id, item] as const));

export type TrainingContext = {
  intent: QueryIntent;
  occasion?: TrainingOccasion;
  outfitExample?: TrainingOutfit | TrainingOutfitIdea;
  missingPiece?: TrainingMissingPiece;
  outfitCategories: Array<CategoryId>;
  fallbackCategories: Array<CategoryId>;
  basis?: string;
  styleNotes: string[];
  avoid: string[];
};

export function getTrainingContext(query: string): TrainingContext {
  const lower = query.toLowerCase();
  const normalizedHint = parseQueryHint(lower);
  const occasion = occasionRules.find((entry) => entry.keywords.some((keyword) => lower.includes(keyword))) ?? normalizedHint.occasion;
  const outfitExample = matchOutfitExample(lower, occasion?.id);
  const missingPiece = matchMissingPiece(lower, occasion?.id);
  const outfitCategories = uniqueCategories([
    ...(occasion?.mustHave ?? []),
    ...inferCategories(outfitExample?.items ?? []),
  ]);
  const fallbackCategories = uniqueCategories([
    ...inferCategories(outfitExample?.items ?? []),
    ...(occasion?.mustHave ?? []),
    'outerwear',
    'accessories',
  ]);

  const basisParts = [];

  if (occasion) {
    basisParts.push(occasion.title);
  }

  if (outfitExample) {
    basisParts.push('training example ' + ('label' in outfitExample ? outfitExample.label : outfitExample.look));
  }

  return {
    intent: normalizedHint.intent,
    occasion,
    outfitExample,
    missingPiece,
    outfitCategories: normalizedHint.outfitCategories.length > 0 ? normalizedHint.outfitCategories : outfitCategories,
    fallbackCategories: normalizedHint.fallbackCategories.length > 0 ? normalizedHint.fallbackCategories : fallbackCategories,
    basis: buildBasisMessage(occasion, outfitExample, normalizedHint.intent),
    styleNotes: [...(occasion?.styleNotes ?? []), ...(outfitExample ? getExampleNotes(outfitExample) : [])],
    avoid: [...(occasion?.avoid ?? []), ...normalizedHint.avoid],
  };
}

function matchOutfitExample(lowerQuery: string, occasionId?: string) {
  const matchingExamples = [...outfitExamples, ...labelFile.outfitIdeas].filter((entry) => {
    const key = entry.occasion.toLowerCase();

    if (occasionId && key.includes(occasionId)) {
      return true;
    }

    return lowerQuery.includes(key) || key.includes(lowerQuery);
  });

  return matchingExamples[0];
}

function matchMissingPiece(lowerQuery: string, occasionId?: string) {
  return labelFile.missingPieces.find((entry) => {
    const key = entry.occasion.toLowerCase();

    if (occasionId && key.includes(occasionId)) {
      return true;
    }

    return lowerQuery.includes(key) || entry.searchKeywords.some((keyword) => lowerQuery.includes(keyword));
  });
}

function inferCategories(itemIds: string[]) {
  return itemIds
    .map((id) => labelsById.get(id)?.category)
    .filter((value): value is CategoryId => Boolean(value));
}

function uniqueCategories(categories: Array<CategoryId | undefined>) {
  return [...new Set(categories.filter((value): value is CategoryId => Boolean(value)))];
}

function getExampleNotes(example: TrainingOutfit | TrainingOutfitIdea) {
  return 'notes' in example ? example.notes : [example.whyItWorks];
}

function parseQueryHint(lowerQuery: string): {
  intent: QueryIntent;
  occasion?: TrainingOccasion;
  outfitCategories: Array<CategoryId>;
  fallbackCategories: Array<CategoryId>;
  avoid: string[];
} {
  const categories: Array<CategoryId> = [];
  const fallbackCategories: Array<CategoryId> = [];
  const avoid: string[] = [];
  let intent: QueryIntent = 'general';
  let occasion: TrainingOccasion | undefined;

  if (/^(hi|hello|hey|yo|sup|help)[!.?\s]*$/i.test(lowerQuery.trim()) || lowerQuery.trim().length <= 3) {
    return {
      intent: 'greeting',
      occasion: undefined,
      outfitCategories: [],
      fallbackCategories: [],
      avoid: [],
    };
  }

  if (lowerQuery.includes('sleep') || lowerQuery.includes('bed') || lowerQuery.includes('pajama') || lowerQuery.includes('pajamas') || lowerQuery.includes('lounge')) {
    intent = 'sleep';
    occasion = occasionRules.find((entry) => entry.id === 'sleepwear') ?? occasion;
    avoid.push('stiff fabrics', 'tight waistbands');
  }

  if (lowerQuery.includes('more casual') || lowerQuery.includes('casualize')) {
    intent = 'styling';
    occasion = occasionRules.find((entry) => entry.id === 'casual') ?? occasion;
    categories.push('tops', 'bottoms', 'shoes');
    fallbackCategories.push('outerwear', 'accessories');
  }

  if (
    lowerQuery.includes('more formal') ||
    lowerQuery.includes('dress it up') ||
    lowerQuery.includes('formal') ||
    lowerQuery.includes('scholarship') ||
    lowerQuery.includes('ceremony') ||
    lowerQuery.includes('gala') ||
    lowerQuery.includes('award')
  ) {
    intent = 'styling';
    occasion = occasionRules.find((entry) => entry.id === 'formal-event') ?? occasion;
    categories.push('tops', 'bottoms', 'shoes', 'outerwear');
    fallbackCategories.push('accessories');
  }

  if (lowerQuery.includes('presentation') || lowerQuery.includes('pitch') || lowerQuery.includes('seminar')) {
    intent = 'styling';
    occasion = occasionRules.find((entry) => entry.id === 'presentation') ?? occasion;
    categories.push('tops', 'bottoms', 'shoes');
    fallbackCategories.push('outerwear');
    avoid.push('too much contrast');
  }

  if (lowerQuery.includes('interview') || lowerQuery.includes('meeting') || lowerQuery.includes('work')) {
    intent = 'styling';
    occasion = occasionRules.find((entry) => entry.id === 'interview') ?? occasion;
    categories.push('tops', 'bottoms', 'shoes');
    fallbackCategories.push('outerwear');
    avoid.push('loud prints');
  }

  if (lowerQuery.includes('buy') || lowerQuery.includes('shop') || lowerQuery.includes('purchase')) {
    intent = 'shopping';
    fallbackCategories.push('outerwear', 'accessories', 'shoes', 'bottoms', 'tops');
  }

  return {
    intent,
    occasion,
    outfitCategories: [...new Set(categories)],
    fallbackCategories: [...new Set(fallbackCategories)],
    avoid,
  };
}

function buildBasisMessage(
  occasion: TrainingOccasion | undefined,
  outfitExample: TrainingOutfit | TrainingOutfitIdea | undefined,
  intent: QueryIntent
) {
  if (intent === 'greeting') {
    return undefined;
  }

  if (!occasion && !outfitExample) {
    return undefined;
  }

  const occasionLabel = occasion?.title.toLowerCase();
  const exampleLabel = outfitExample ? ('label' in outfitExample ? outfitExample.label : outfitExample.look) : undefined;

  if (occasionLabel && exampleLabel) {
    return `I matched this to ${occasionLabel} using your ${exampleLabel.toLowerCase()} example.`;
  }

  if (occasionLabel) {
    return `I matched this to ${occasionLabel}.`;
  }

  if (exampleLabel) {
    return `I matched this to your ${exampleLabel.toLowerCase()} example.`;
  }

  return undefined;
}
