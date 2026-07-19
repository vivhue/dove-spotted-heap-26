import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { CategoryId, WardrobeItem } from '@/models/closet';

export type SelectedOutfit = Record<CategoryId, string | null>;

type ClosetStoreValue = {
  addItem: (item: WardrobeItem) => void;
  closetItems: WardrobeItem[];
  selectedOutfit: SelectedOutfit;
  selfieImageUrl: string;
  setSelfieImageUrl: (url: string) => void;
  toggleWornItem: (item: WardrobeItem) => void;
  wishlistItems: WardrobeItem[];
};

const ClosetStoreContext = createContext<ClosetStoreValue | undefined>(undefined);

const initialSelectedOutfit: SelectedOutfit = {
  accessories: null,
  bags: null,
  bottoms: null,
  outerwear: null,
  shoes: null,
  tops: null,
};

const initialClosetItems: WardrobeItem[] = [
  { id: 'white-polo', name: 'Pearl Rib Polo', category: 'tops', color: '#FFFDF9', accent: '#2B2118', texture: 'knit', saved: true, destination: 'closet' },
  { id: 'checkered-shirt', name: 'Check Collar Shirt', category: 'tops', color: '#D9E2EA', accent: '#8B2F2F', texture: 'classic', saved: true, destination: 'closet' },
  { id: 'mesh-tank', name: 'Cocoa Mesh Tank', category: 'tops', color: '#7A5A45', accent: '#F0C7A0', texture: 'silk', saved: true, destination: 'closet' },
  { id: 'wide-leg-denim', name: 'Wide Leg Denim', category: 'bottoms', color: '#3B5F7C', accent: '#C99A6B', texture: 'denim', saved: true, destination: 'closet' },
  { id: 'tailored-trouser', name: 'Slate Tailored Trouser', category: 'bottoms', color: '#5F6673', accent: '#EFE6D6', texture: 'classic', saved: true, destination: 'closet' },
  { id: 'midi-skirt', name: 'Ink Bias Skirt', category: 'bottoms', color: '#1F2233', accent: '#E2958A', texture: 'silk', saved: true, destination: 'closet' },
  { id: 'beige-trench', name: 'Oversized Trench', category: 'outerwear', color: '#C7A77D', accent: '#2B2118', texture: 'classic', saved: true, destination: 'closet' },
  { id: 'cropped-bomber', name: 'Sage Cropped Bomber', category: 'outerwear', color: '#8C9A7B', accent: '#FFFDF9', texture: 'classic', saved: true, destination: 'closet' },
  { id: 'moto-jacket', name: 'Black Moto Jacket', category: 'outerwear', color: '#1F1B18', accent: '#B7B7AF', texture: 'leather', saved: true, destination: 'closet' },
  { id: 'black-boots', name: 'Black Ankle Boots', category: 'shoes', color: '#211A17', accent: '#A97B4E', texture: 'leather', saved: true, destination: 'closet' },
  { id: 'mary-janes', name: 'Cherry Mary Janes', category: 'shoes', color: '#8B2F2F', accent: '#F7D7D1', texture: 'leather', saved: true, destination: 'closet' },
  { id: 'silver-sneakers', name: 'Silver Runner Sneakers', category: 'shoes', color: '#C7CDD2', accent: '#5F6673', texture: 'metal', saved: true, destination: 'closet' },
  { id: 'silk-scarf', name: 'Painted Silk Scarf', category: 'accessories', color: '#E2958A', accent: '#2F6F73', texture: 'silk', saved: true, destination: 'closet' },
  { id: 'gold-hoops', name: 'Molten Hoop Earrings', category: 'accessories', color: '#C99A6B', accent: '#FFF3D8', texture: 'metal', saved: true, destination: 'closet' },
  { id: 'oval-sunnies', name: 'Amber Oval Sunnies', category: 'accessories', color: '#6A4732', accent: '#E2B06F', texture: 'classic', saved: true, destination: 'closet' },
];

const initialWishlistItems: WardrobeItem[] = [
  { id: 'wool-coat', name: 'Graphite Wool Coat', category: 'outerwear', price: '$56', source: 'Zara', color: '#4E535C', accent: '#C99A6B', texture: 'knit', destination: 'wishlist' },
  {
    id: 'checkered-collar',
    name: 'Checkered Collar Shirt',
    category: 'tops',
    price: '$58',
    source: 'H&M',
    color: '#EEE4D8',
    accent: '#8B2F2F',
    texture: 'classic',
    destination: 'wishlist',
  },
  { id: 'wishlist-boots', name: 'Patent Platform Boots', category: 'shoes', color: '#171412', accent: '#C99A6B', texture: 'leather', destination: 'wishlist' },
  { id: 'wishlist-trench', name: 'Storm Flap Trench', category: 'outerwear', color: '#B8996E', accent: '#2B2118', texture: 'classic', destination: 'wishlist' },
  { id: 'pearl-choker', name: 'Pearl Choker', category: 'accessories', color: '#FFF8EA', accent: '#C99A6B', texture: 'metal', destination: 'wishlist' },
];

export function ClosetStoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WardrobeItem[]>([...initialClosetItems, ...initialWishlistItems]);
  const [selectedOutfit, setSelectedOutfit] = useState<SelectedOutfit>(initialSelectedOutfit);
  const [selfieImageUrl, setSelfieImageUrl] = useState('');

  const value = useMemo<ClosetStoreValue>(() => {
    const closetItems = items.filter((item) => (item.destination ?? 'closet') === 'closet');
    const wishlistItems = items.filter((item) => item.destination === 'wishlist');

    return {
      addItem: (item) => {
        setItems((currentItems) => [item, ...currentItems.filter((current) => current.id !== item.id)]);
      },
      closetItems,
      selectedOutfit,
      selfieImageUrl,
      setSelfieImageUrl,
      toggleWornItem: (item) => {
        setSelectedOutfit((currentOutfit) => ({
          ...currentOutfit,
          [item.category]: currentOutfit[item.category] === item.id ? null : item.id,
        }));
      },
      wishlistItems,
    };
  }, [items, selectedOutfit, selfieImageUrl]);

  return <ClosetStoreContext.Provider value={value}>{children}</ClosetStoreContext.Provider>;
}

export function useClosetStore() {
  const context = useContext(ClosetStoreContext);

  if (!context) {
    throw new Error('useClosetStore must be used inside ClosetStoreProvider.');
  }

  return context;
}
