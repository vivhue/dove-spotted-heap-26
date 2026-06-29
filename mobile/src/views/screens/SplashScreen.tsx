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
          <HangerMark />
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

function HangerMark() {
  return (
    <View style={styles.logoTile}>
      <View style={styles.hanger}>
        <View style={styles.hookArc} />
        <View style={styles.hookStem} />
        <View style={styles.neckDot} />
        <View style={styles.hangerJoint} />
        <View style={styles.hangerLeftArm} />
        <View style={styles.hangerRightArm} />
        <View style={styles.hangerBottomRail} />
        <View style={styles.hangerPegLeft} />
        <View style={styles.hangerPegRight} />
      </View>
    </View>
  );
}

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
    backgroundColor: 'rgba(17, 14, 25, 0.32)',
    height: 124,
    justifyContent: 'center',
    width: 144,
  },
  hanger: {
    height: 116,
    position: 'relative',
    width: 132,
  },
  hookArc: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 0,
    borderColor: closetTheme.camel,
    borderLeftWidth: 6,
    borderRadius: 24,
    borderRightWidth: 6,
    borderTopWidth: 6,
    height: 42,
    left: 51,
    position: 'absolute',
    top: 0,
    transform: [{ rotate: '18deg' }],
    width: 42,
  },
  hookStem: {
    backgroundColor: closetTheme.camel,
    borderRadius: 4,
    height: 24,
    left: 64,
    position: 'absolute',
    top: 48,
    width: 8,
  },
  neckDot: {
    backgroundColor: closetTheme.camel,
    borderRadius: 8,
    height: 16,
    left: 60,
    position: 'absolute',
    top: 65,
    width: 16,
  },
  hangerJoint: {
    backgroundColor: closetTheme.camel,
    borderRadius: 6,
    height: 11,
    left: 58,
    position: 'absolute',
    top: 78,
    transform: [{ rotate: '45deg' }],
    width: 20,
  },
  hangerLeftArm: {
    backgroundColor: closetTheme.camel,
    borderRadius: 5,
    height: 7,
    left: 4,
    position: 'absolute',
    top: 93,
    transform: [{ rotate: '-28deg' }],
    width: 65,
  },
  hangerRightArm: {
    backgroundColor: closetTheme.camel,
    borderRadius: 5,
    height: 7,
    left: 63,
    position: 'absolute',
    top: 93,
    transform: [{ rotate: '28deg' }],
    width: 65,
  },
  hangerBottomRail: {
    backgroundColor: closetTheme.camel,
    borderRadius: 4,
    height: 7,
    left: 7,
    position: 'absolute',
    top: 105,
    width: 118,
  },
  hangerPegLeft: {
    backgroundColor: closetTheme.camel,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    height: 17,
    left: 8,
    position: 'absolute',
    top: 105,
    width: 7,
  },
  hangerPegRight: {
    backgroundColor: closetTheme.camel,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    height: 17,
    position: 'absolute',
    right: 8,
    top: 105,
    width: 7,
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
