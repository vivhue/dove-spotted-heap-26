import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import { View } from 'react-native';

import '@/views/components/app-font-defaults';
import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    'Silkscreen-Regular': require('../../assets/fonts/Silkscreen-Regular.ttf'),
    'Silkscreen-Bold': require('../../assets/fonts/Silkscreen-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <AnimatedSplashOverlay />
      <Slot />
    </View>
  );
}
