import { useEffect, useMemo, useState } from 'react';

import {
  BodyMeasurements,
  browseCategories,
  cloneInventoryState,
  defaultMeasurements,
  createWardrobeItem,
  InventoryLocation,
  InventoryState,
  getBodyProportions,
  ScreenId,
  screenOrder,
  WardrobeItem,
} from '@/models/closet';
import { loadInventoryState, saveInventoryState } from '@/services/inventory-storage';

export function useClosetApp() {
  const [screen, setScreen] = useState<ScreenId>('splash');
  const [activeCategory, setActiveCategory] = useState(browseCategories[0].id);
  const [measurements, setMeasurements] = useState<BodyMeasurements>(defaultMeasurements);
  const [inventory, setInventory] = useState<InventoryState>(() => loadInventoryState());

  const activeBrowseCategory = useMemo(
    () => browseCategories.find((category) => category.id === activeCategory) ?? browseCategories[0],
    [activeCategory]
  );
  const bodyProportions = useMemo(() => getBodyProportions(measurements), [measurements]);

  useEffect(() => {
    saveInventoryState(inventory);
  }, [inventory]);

  function updateMeasurement(field: keyof BodyMeasurements, value: string) {
    setMeasurements((current) => ({
      ...current,
      [field]: value.replace(/[^\d.,]/g, ''),
    }));
  }

  function goTo(nextScreen: ScreenId) {
    setScreen(nextScreen);
  }

  function addItem({
    destination,
    item,
  }: {
    destination: InventoryLocation;
    item: Omit<WardrobeItem, 'id' | 'saved'>;
  }) {
    const nextItem = createWardrobeItem({
      category: item.category,
      destination,
      name: item.name,
      color: item.color,
      accent: item.accent,
      imageUrl: item.imageUrl,
      texture: item.texture,
      source: item.source,
      price: item.price,
    });

    setInventory((current) => {
      const nextState = cloneInventoryState(current);

      nextState[destination] = [nextItem, ...nextState[destination]];

      return nextState;
    });

    setActiveCategory(item.category);
  }

  function isForward(nextScreen: ScreenId) {
    const currentIndex = screenOrder.indexOf(screen);
    const nextIndex = screenOrder.indexOf(nextScreen);

    if (currentIndex === -1) {
      return true;
    }

    return nextIndex > currentIndex;
  }

  return {
    activeBrowseCategory,
    activeCategory,
    bodyProportions,
    closetItems: inventory.closet,
    wishlistItems: inventory.wishlist,
    addItem,
    goTo,
    isForward,
    measurements,
    screen,
    setActiveCategory,
    updateMeasurement,
  };
}
