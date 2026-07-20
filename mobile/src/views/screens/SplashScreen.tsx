import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSplashAnimation } from '@/controllers/use-splash-animation';
import { ScreenId } from '@/models/closet';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon } from '@/views/components/closet-icons';

export function SplashScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { float, intro } = useSplashAnimation();
  const driftUp = float.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const driftDown = float.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const fadeItems = intro.interpolate({ inputRange: [0.2, 0.55], outputRange: [0, 1], extrapolate: 'clamp' });
  const hangerOpacity = intro.interpolate({ inputRange: [0, 0.24], outputRange: [0, 1], extrapolate: 'clamp' });
  const hangerTranslate = intro.interpolate({
    inputRange: [0, 0.45, 0.65, 0.82, 1],
    outputRange: [-90, 10, -6, 3, 0],
  });
  const hangerScale = intro.interpolate({
    inputRange: [0, 0.45, 0.65, 0.82, 1],
    outputRange: [0.4, 1.08, 0.97, 1.02, 1],
  });
  const hangerRotate = intro.interpolate({
    inputRange: [0, 0.45, 0.65, 0.82, 1],
    outputRange: ['-10deg', '6deg', '-3deg', '2deg', '0deg'],
  });
  const wordOpacity = intro.interpolate({ inputRange: [0.45, 0.7], outputRange: [0, 1], extrapolate: 'clamp' });
  const taglineOpacity = intro.interpolate({ inputRange: [0.6, 0.84], outputRange: [0, 1], extrapolate: 'clamp' });
  const tapOpacity = intro.interpolate({ inputRange: [0.78, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const wordLift = intro.interpolate({ inputRange: [0.45, 0.7], outputRange: [10, 0], extrapolate: 'clamp' });
  const tapPulse = float.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const hangerBodySway = float.interpolate({ inputRange: [0, 1], outputRange: [-4, 4] });
  const hangerBodyRotate = float.interpolate({ inputRange: [0, 1], outputRange: ['-1.4deg', '1.4deg'] });

  return (
    <Pressable style={styles.screen} onPress={() => onNavigate('home')}>
      <View pointerEvents="none" style={styles.starOne} />
      <View pointerEvents="none" style={styles.starTwo} />
      <View pointerEvents="none" style={styles.starThree} />
      <View pointerEvents="none" style={styles.starFour} />
      <View pointerEvents="none" style={styles.starFive} />
      <Animated.View
        pointerEvents="none"
        style={[styles.floatItem, styles.floatShirt, { opacity: fadeItems, transform: [{ translateY: driftUp }] }]}>
        <ClosetIcon category="tops" color="#7D92B8" size={48} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.floatItem, styles.floatShoe, { opacity: fadeItems, transform: [{ translateY: driftDown }] }]}>
        <ClosetIcon category="shoes" color={closetTheme.blush} size={42} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.floatItem, styles.floatBag, { opacity: fadeItems, transform: [{ translateY: driftUp }] }]}>
        <ClosetIcon category="bags" color={closetTheme.sage} size={42} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.floatItem, styles.floatTag, { opacity: fadeItems, transform: [{ translateY: driftDown }] }]}>
        <View style={styles.tagIcon}>
          <View style={styles.tagHole} />
        </View>
      </Animated.View>
      <View pointerEvents="none" style={styles.planet} />
      <Animated.View pointerEvents="none" style={styles.hero}>
        <Animated.View
          style={[
            styles.hangerWrap,
            {
              opacity: hangerOpacity,
              transform: [
                { translateY: hangerTranslate },
                { scale: hangerScale },
                { rotate: hangerRotate },
              ],
            },
          ]}>
          <HangerMark bodyRotate={hangerBodyRotate} bodySway={hangerBodySway} />
        </Animated.View>
        <Animated.Text style={[styles.word, { opacity: wordOpacity, transform: [{ translateY: wordLift }] }]}>
          bove closet
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          your wardrobe, worn smarter
        </Animated.Text>
      </Animated.View>
      <Animated.Text
        pointerEvents="none"
        style={[styles.tapHint, { opacity: Animated.multiply(tapOpacity, tapPulse) }]}>
        tap to open
      </Animated.Text>
    </Pressable>
  );
}

function HangerMark({
  bodyRotate,
  bodySway,
}: {
  bodyRotate: Animated.AnimatedInterpolation<string>;
  bodySway: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <View style={styles.logoTile}>
      <View style={styles.hanger}>
        {hookBlocks.map((block) => (
          <View
            key={`hook-${block.x}-${block.y}-${block.w ?? 1}`}
            style={[
              styles.pixelBlock,
              {
                height: hangerPixelSize,
                left: block.x * hangerPixelSize,
                top: block.y * hangerPixelSize,
                width: (block.w ?? 1) * hangerPixelSize,
              },
            ]}
          />
        ))}
        <Animated.View
          style={[
            styles.hangerBody,
            {
              transform: [{ translateY: -66 }, { translateX: bodySway }, { rotate: bodyRotate }, { translateY: 66 }],
            },
          ]}>
          {bodyBlocks.map((block) => (
            <View
              key={`body-${block.x}-${block.y}-${block.w ?? 1}`}
              style={[
                styles.pixelBlock,
                {
                  height: hangerPixelSize,
                  left: block.x * hangerPixelSize,
                  opacity: block.opacity ?? 1,
                  top: block.y * hangerPixelSize,
                  width: (block.w ?? 1) * hangerPixelSize,
                },
              ]}
            />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const hangerPixelSize = 6;

const hookBlocks: { w?: number; x: number; y: number }[] = [
  { x: 17, y: 0, w: 5 },
  { x: 17, y: 1 },
  { x: 21, y: 1 },
  { x: 17, y: 2 },
  { x: 21, y: 2 },
  { x: 16, y: 3 },
  { x: 17, y: 3 },
  { x: 16, y: 4 },
  { x: 17, y: 4 },
  { x: 17, y: 5 },
  { x: 17, y: 6 },
];

const bodyBlocks: { opacity?: number; w?: number; x: number; y: number }[] = [
  { x: 15, y: 7, w: 7 },
  { x: 14, y: 8, w: 9 },
  { x: 14, y: 9, w: 3 },
  { x: 20, y: 9, w: 3 },
  { x: 15, y: 10 },
  { x: 21, y: 10 },
  { x: 14, y: 11 },
  { x: 15, y: 11 },
  { x: 21, y: 11 },
  { x: 22, y: 11 },
  { x: 13, y: 12 },
  { x: 14, y: 12 },
  { x: 22, y: 12 },
  { x: 23, y: 12 },
  { x: 12, y: 13 },
  { x: 13, y: 13 },
  { x: 23, y: 13 },
  { x: 24, y: 13 },
  { x: 11, y: 14 },
  { x: 12, y: 14 },
  { x: 24, y: 14 },
  { x: 25, y: 14 },
  { x: 10, y: 15 },
  { x: 11, y: 15 },
  { x: 25, y: 15 },
  { x: 26, y: 15 },
  { x: 9, y: 16 },
  { x: 10, y: 16 },
  { x: 26, y: 16 },
  { x: 27, y: 16 },
  { x: 8, y: 17 },
  { x: 9, y: 17 },
  { x: 27, y: 17 },
  { x: 28, y: 17 },
  { x: 7, y: 18 },
  { x: 8, y: 18 },
  { x: 28, y: 18 },
  { x: 29, y: 18 },
  { x: 6, y: 19 },
  { x: 7, y: 19 },
  { x: 29, y: 19 },
  { x: 30, y: 19 },
  { x: 5, y: 20 },
  { x: 6, y: 20 },
  { x: 30, y: 20 },
  { x: 31, y: 20 },
  { x: 4, y: 21 },
  { x: 5, y: 21 },
  { x: 31, y: 21 },
  { x: 32, y: 21 },
  { x: 3, y: 22 },
  { x: 4, y: 22 },
  { x: 32, y: 22 },
  { x: 33, y: 22 },
  { x: 2, y: 23, w: 34, opacity: 0.88 },
  { x: 1, y: 24, w: 36, opacity: 0.62 },
  { x: 0, y: 23, w: 3 },
  { x: 35, y: 23, w: 3 },
  { x: 0, y: 24 },
  { x: 37, y: 24 },
  { x: 0, y: 25 },
  { x: 37, y: 25 },
];

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: closetTheme.night,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  starOne: {
    backgroundColor: closetTheme.white,
    borderRadius: 2,
    height: 4,
    left: '18%',
    opacity: 0.75,
    position: 'absolute',
    top: '15%',
    width: 4,
  },
  starTwo: {
    backgroundColor: closetTheme.white,
    borderRadius: 2,
    height: 3,
    opacity: 0.55,
    position: 'absolute',
    right: '22%',
    top: '24%',
    width: 3,
  },
  starThree: {
    backgroundColor: closetTheme.white,
    borderRadius: 2,
    height: 3,
    left: '62%',
    opacity: 0.65,
    position: 'absolute',
    top: '36%',
    width: 3,
  },
  starFour: {
    backgroundColor: closetTheme.white,
    borderRadius: 1,
    height: 2,
    left: '50%',
    opacity: 0.5,
    position: 'absolute',
    top: '11%',
    width: 2,
  },
  starFive: {
    backgroundColor: closetTheme.white,
    borderRadius: 2,
    height: 4,
    left: '12%',
    opacity: 0.45,
    position: 'absolute',
    top: '31%',
    width: 4,
  },
  floatItem: {
    position: 'absolute',
  },
  floatShirt: {
    left: '12%',
    top: '21%',
  },
  floatShoe: {
    right: '13%',
    top: '17%',
  },
  floatBag: {
    right: '8%',
    top: '43%',
  },
  floatTag: {
    left: '10%',
    top: '47%',
  },
  tagIcon: {
    backgroundColor: closetTheme.camel,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    height: 30,
    transform: [{ rotate: '-15deg' }],
    width: 24,
  },
  tagHole: {
    backgroundColor: closetTheme.night,
    borderRadius: 3,
    height: 6,
    left: 6,
    position: 'absolute',
    top: 6,
    width: 6,
  },
  planet: {
    backgroundColor: '#2D2538',
    borderRadius: 210,
    bottom: -135,
    height: 420,
    opacity: 0.82,
    position: 'absolute',
    width: 420,
  },
  hero: {
    alignItems: 'center',
    zIndex: 2,
  },
  hangerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  logoTile: {
    alignItems: 'center',
    height: 182,
    justifyContent: 'center',
    width: 252,
  },
  hanger: {
    height: 156,
    position: 'relative',
    width: 228,
  },
  hangerBody: {
    height: 156,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 228,
  },
  pixelBlock: {
    backgroundColor: closetTheme.camel,
    borderColor: 'rgba(247, 241, 231, 0.28)',
    borderWidth: 1,
    position: 'absolute',
  },
  word: {
    color: closetTheme.camel,
    fontFamily: 'serif',
    fontSize: 42,
    fontWeight: '600',
    marginTop: 18,
    textAlign: 'center',
  },
  tagline: {
    color: '#9890A8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  tapHint: {
    bottom: 58,
    color: '#9B94AB',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    position: 'absolute',
    textTransform: 'uppercase',
  },
});
