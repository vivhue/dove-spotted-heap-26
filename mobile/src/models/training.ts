import { CategoryId, WardrobeItem } from '@/models/closet';

export type TrainingLabel = {
  id: string;
  image: string;
  imageRole?: 'single-item' | 'composite-look';
  category: CategoryId;
  subtype?: string;
  color?: string;
  formality?: 'casual' | 'smart' | 'formal';
  occasions: string[];
  seasons: string[];
  fitNotes: string[];
  styleNotes?: string[];
  buyLater?: boolean;
};

export type TrainingOutfit = {
  id: string;
  occasion: string;
  label: string;
  items: string[];
  notes: string[];
};

export type TrainingOutfitIdea = {
  occasion: string;
  look: string;
  items: string[];
  whyItWorks: string;
};

export type TrainingMissingPiece = {
  occasion: string;
  recommendedItem: string;
  reason: string;
  searchKeywords: string[];
};

export type TrainingOccasion = {
  id: string;
  title: string;
  keywords: string[];
  priority: 'relaxed' | 'smart' | 'formal';
  mustHave: Array<WardrobeItem['category']>;
  avoid: string[];
  styleNotes: string[];
};

export type TrainingDataset = {
  labels: TrainingLabel[];
  outfits: TrainingOutfit[];
  occasions: TrainingOccasion[];
};

export type TrainingLabelFile = {
  items: TrainingLabel[];
  outfitIdeas: TrainingOutfitIdea[];
  missingPieces: TrainingMissingPiece[];
};

export type QueryIntent = 'greeting' | 'sleep' | 'styling' | 'shopping' | 'general';
