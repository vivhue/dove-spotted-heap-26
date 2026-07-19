import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { CategoryId, WardrobeItem } from '@/models/closet';
import { getClosetItems } from '@/services/closet-api';

export type SelectedOutfit = Record<CategoryId, string | null>;

type ClosetStoreValue = {
  addItem: (item: WardrobeItem) => void;
  applyOutfit: (outfit: Partial<SelectedOutfit>) => void;
  closetItems: WardrobeItem[];
  isLoadingItems: boolean;
  itemsError: string;
  refreshItems: () => Promise<void>;
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

export function ClosetStoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState('');
  const [selectedOutfit, setSelectedOutfit] = useState<SelectedOutfit>(initialSelectedOutfit);
  const [selfieImageUrl, setSelfieImageUrl] = useState('');

  const refreshItems = useCallback(async () => {
    setIsLoadingItems(true);
    setItemsError('');

    try {
      setItems(await getClosetItems());
    } catch (error) {
      setItemsError(error instanceof Error ? error.message : 'Could not load saved items.');
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  const value = useMemo<ClosetStoreValue>(() => {
    const closetItems = items.filter((item) => (item.destination ?? 'closet') === 'closet');
    const wishlistItems = items.filter((item) => item.destination === 'wishlist');

    return {
      addItem: (item) => {
        setItems((currentItems) => [item, ...currentItems.filter((current) => current.id !== item.id)]);
      },
      applyOutfit: (outfit) => {
        setSelectedOutfit((currentOutfit) => ({
          ...currentOutfit,
          ...outfit,
        }));
      },
      closetItems,
      isLoadingItems,
      itemsError,
      refreshItems,
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
  }, [items, isLoadingItems, itemsError, refreshItems, selectedOutfit, selfieImageUrl]);

  return <ClosetStoreContext.Provider value={value}>{children}</ClosetStoreContext.Provider>;
}

export function useClosetStore() {
  const context = useContext(ClosetStoreContext);

  if (!context) {
    throw new Error('useClosetStore must be used inside ClosetStoreProvider.');
  }

  return context;
}
