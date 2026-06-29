import { useMemo, useState } from 'react';

import {
  BodyMeasurements,
  browseCategories,
  defaultMeasurements,
  getBodyProportions,
  ScreenId,
  screenOrder,
} from '@/models/closet';

export function useClosetApp() {
  const [screen, setScreen] = useState<ScreenId>('splash');
  const [activeCategory, setActiveCategory] = useState(browseCategories[0].id);
  const [measurements, setMeasurements] = useState<BodyMeasurements>(defaultMeasurements);

  const activeBrowseCategory = useMemo(
    () => browseCategories.find((category) => category.id === activeCategory) ?? browseCategories[0],
    [activeCategory]
  );
  const bodyProportions = useMemo(() => getBodyProportions(measurements), [measurements]);

  function updateMeasurement(field: keyof BodyMeasurements, value: string) {
    setMeasurements((current) => ({
      ...current,
      [field]: value.replace(/[^\d.,]/g, ''),
    }));
  }

  function goTo(nextScreen: ScreenId) {
    setScreen(nextScreen);
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
    goTo,
    isForward,
    measurements,
    screen,
    setActiveCategory,
    updateMeasurement,
  };
}
