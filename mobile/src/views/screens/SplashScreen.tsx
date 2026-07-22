import { useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSplashAnimation } from '@/controllers/use-splash-animation';
import { ScreenId } from '@/models/closet';

export function SplashScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { intro } = useSplashAnimation();
  const doorProgress = useRef(new Animated.Value(0)).current;
  const opening = useRef(false);
  const [isOpening, setIsOpening] = useState(false);
  const wardrobeOpacity = intro.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' });
  const leftDoorRotation = doorProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-76deg'] });
  const rightDoorRotation = doorProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '76deg'] });
  const interiorOpacity = doorProgress.interpolate({ inputRange: [0, 0.38, 1], outputRange: [0.2, 0.5, 1] });

  function openWardrobe() {
    if (opening.current) return;

    opening.current = true;
    setIsOpening(true);
    Animated.timing(doorProgress, {
      duration: 1050,
      toValue: 1,
      useNativeDriver: true,
    }).start(() => onNavigate('home'));
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open wardrobe" style={styles.screen} onPress={openWardrobe}>
      <Animated.View style={[styles.hero, { opacity: wardrobeOpacity }]}>
        <Text style={styles.kicker}>WELCOME TO</Text>
        <Text style={styles.wordmark}>bove closet</Text>
        <View style={styles.wardrobeScene}>
          <View style={styles.wardrobeFrame}>
            <Animated.View style={[styles.interior, { opacity: interiorOpacity }]}>
              <View style={styles.rail} />
              <View style={[styles.hanger, styles.hangerOne]}><View style={styles.hook} /><View style={[styles.garment, styles.blueGarment]} /></View>
              <View style={[styles.hanger, styles.hangerTwo]}><View style={styles.hook} /><View style={[styles.garment, styles.darkGarment]} /></View>
              <View style={styles.shelf} />
              <View style={[styles.shoe, styles.shoeOne]} />
              <View style={[styles.shoe, styles.shoeTwo]} />
            </Animated.View>
          </View>
          <Image pointerEvents="none" source={require('../../../assets/images/wardrobe-shell.png')} style={styles.referenceImage} />
          <Animated.Image
            pointerEvents="none"
            source={require('../../../assets/images/wardrobe-left-door.png')}
            style={[styles.referenceDoor, styles.referenceLeftDoor, { transform: [{ perspective: 900 }, { rotateY: leftDoorRotation }] }]}
          />
          <Animated.Image
            pointerEvents="none"
            source={require('../../../assets/images/wardrobe-right-door.png')}
            style={[styles.referenceDoor, styles.referenceRightDoor, { transform: [{ perspective: 900 }, { rotateY: rightDoorRotation }] }]}
          />
        </View>
      </Animated.View>
      <Text style={styles.hint}>{isOpening ? 'opening your wardrobe...' : 'tap the handles to open'}</Text>
    </Pressable>
  );
}

const wood = '#7A3100';
const woodDark = '#4B1D00';
const woodLight = '#9A4100';

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#FFFFFF', flex: 1, justifyContent: 'center', overflow: 'hidden' },
  hero: { alignItems: 'center', marginTop: -34 },
  kicker: { color: woodLight, fontSize: 10, fontWeight: '900', letterSpacing: 2.8 },
  wordmark: { color: woodDark, fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 24, marginTop: 5 },
  wardrobeScene: { height: 416, overflow: 'hidden', position: 'relative', width: 316 },
  referenceImage: { height: 416, left: -50, position: 'absolute', top: 0, width: 416, zIndex: 3 },
  referenceDoor: { height: 265, position: 'absolute', top: 91, width: 124, zIndex: 4 },
  referenceLeftDoor: { left: 28, transformOrigin: 'left center' as never },
  referenceRightDoor: { left: 164, transformOrigin: 'right center' as never },
  wardrobeFrame: { backgroundColor: woodDark, borderColor: wood, borderWidth: 12, height: 286, left: 24, overflow: 'visible', position: 'absolute', right: 24, top: 106 },
  interior: { backgroundColor: '#321300', bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 0 },
  rail: { backgroundColor: '#C58B55', height: 7, left: 28, position: 'absolute', right: 28, top: 47 },
  hanger: { alignItems: 'center', position: 'absolute', top: 48 },
  hangerOne: { left: 48 },
  hangerTwo: { left: 119 },
  hook: { borderColor: '#E8D1B8', borderLeftWidth: 4, borderTopWidth: 4, height: 16, width: 14 },
  garment: { height: 106, marginTop: 3, width: 42 },
  blueGarment: { backgroundColor: '#5370B4' },
  darkGarment: { backgroundColor: '#313131' },
  shelf: { backgroundColor: wood, bottom: 54, height: 9, left: 17, position: 'absolute', right: 17 },
  shoe: { backgroundColor: '#6B5951', bottom: 25, height: 19, position: 'absolute', width: 62 },
  shoeOne: { left: 38 },
  shoeTwo: { right: 28 },
  hint: { bottom: 58, color: woodLight, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, position: 'absolute', textTransform: 'uppercase' },
});
