import { Slot } from 'expo-router';
import { View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import '@/views/components/app-font-defaults';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AnimatedSplashOverlay />
      <Slot />
    </View>
  );
}
