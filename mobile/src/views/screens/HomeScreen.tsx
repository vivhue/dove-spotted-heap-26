import { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { CategoryId, ScreenId } from '@/models/closet';
import { AppScreen } from '@/views/components/app-chrome';

type Props = {
  activeCategory: CategoryId;
  onCategoryChange: (category: CategoryId) => void;
  onNavigate: (screen: ScreenId) => void;
};

const homeRoomImages: ImageSourcePropType[] = [
  require('../../../assets/images/home.png'),
  require('../../../assets/images/home - right.png'),
  require('../../../assets/images/image 52.png'),
];

export function HomeScreen({ onNavigate }: Props) {
  const [roomIndex, setRoomIndex] = useState(0);
  const roomOpacity = useRef(new Animated.Value(1)).current;
  const roomSlideX = useRef(new Animated.Value(0)).current;

  function openRoomTarget() {
    if (roomIndex === 1) {
      onNavigate('try-on');
      return;
    }

    if (roomIndex === 2) {
      onNavigate('calendar');
      return;
    }

    onNavigate('closet');
  }

  function showRoom(direction: -1 | 1) {
    roomSlideX.stopAnimation();
    roomOpacity.stopAnimation();
    roomSlideX.setValue(direction * 72);
    roomOpacity.setValue(0.72);
    setRoomIndex((index) => (index + direction + homeRoomImages.length) % homeRoomImages.length);

    Animated.parallel([
      Animated.timing(roomSlideX, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: false,
      }),
      Animated.timing(roomOpacity, {
        duration: 180,
        easing: Easing.out(Easing.quad),
        toValue: 1,
        useNativeDriver: false,
      }),
    ]).start();
  }

  function showPreviousRoom() {
    showRoom(-1);
  }

  function showNextRoom() {
    showRoom(1);
  }

  return (
    <AppScreen activeTab="home" bottomNavOverlay onNavigate={onNavigate} showStatus={false}>
      <View style={styles.room}>
        <Pressable style={styles.roomTapTarget} onPress={openRoomTarget}>
          <Animated.View style={[styles.roomSlide, { opacity: roomOpacity, transform: [{ translateX: roomSlideX }] }]}>
            <PixelRoom source={homeRoomImages[roomIndex]} />
          </Animated.View>
        </Pressable>
        {roomIndex === 2 && (
          <Pressable
            accessibilityLabel="Open planner"
            style={styles.calendarHotspot}
            onPress={() => onNavigate('calendar')}
          />
        )}
        <Pressable accessibilityLabel="Previous home scene" style={[styles.arrowButton, styles.arrowLeft]} onPress={showPreviousRoom}>
          <PixelArrow direction="left" />
        </Pressable>
        <Pressable accessibilityLabel="Next home scene" style={[styles.arrowButton, styles.arrowRight]} onPress={showNextRoom}>
          <PixelArrow direction="right" />
        </Pressable>
      </View>
    </AppScreen>
  );
}

function PixelRoom({ source }: { source: ImageSourcePropType }) {
  return (
    <Image source={source} resizeMode="cover" style={styles.roomImage} />
  );
}

function PixelArrow({ direction }: { direction: 'left' | 'right' }) {
  const blocks = direction === 'left'
    ? [
        { x: 2, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 3 },
        { x: 2, y: 4 },
        { x: 3, y: 2 },
      ]
    : [
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 2 },
        { x: 2, y: 3 },
        { x: 1, y: 4 },
        { x: 0, y: 2 },
      ];

  return (
    <View style={styles.pixelArrow}>
      {blocks.map((block) => (
        <View key={`${block.x}-${block.y}`} style={[styles.pixelArrowBlock, { left: block.x * 7, top: block.y * 7 }]} />
      ))}
    </View>
  );
}

function DoorPanel() {
  return (
    <>
      <View style={styles.doorPanelOuter} />
      <View style={styles.doorPanelInner} />
      <View style={styles.woodPixelOne} />
      <View style={styles.woodPixelTwo} />
      <View style={styles.woodPixelThree} />
    </>
  );
}

const wood = '#7D3300';
const woodDark = '#3A1600';
const woodMid = '#A55212';
const woodLight = '#D19558';
const gold = '#E4B94B';
const roomCream = '#F3D59E';

const styles = StyleSheet.create({
  room: {
    backgroundColor: roomCream,
    flex: 1,
    minHeight: 690,
    overflow: 'hidden',
    position: 'relative',
  },
  roomTapTarget: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  roomSlide: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  roomImage: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
    ...(Platform.OS === 'web'
      ? {
          imageRendering: 'pixelated',
        }
      : null),
  },
  arrowButton: {
    alignItems: 'center',
    backgroundColor: '#FFF4DF',
    borderColor: '#774530',
    borderRadius: 4,
    borderWidth: 4,
    height: 50,
    justifyContent: 'center',
    marginTop: -25,
    position: 'absolute',
    top: '52%',
    width: 38,
    zIndex: 40,
  },
  arrowLeft: {
    left: 10,
  },
  arrowRight: {
    right: 10,
  },
  calendarHotspot: {
    height: '22%',
    left: '14%',
    position: 'absolute',
    top: '22%',
    width: '44%',
    zIndex: 45,
  },
  pixelArrow: {
    height: 35,
    position: 'relative',
    width: 28,
  },
  pixelArrowBlock: {
    backgroundColor: '#774530',
    height: 7,
    position: 'absolute',
    width: 7,
  },
  wall: {
    backgroundColor: '#F4DCA9',
    height: 296,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  ceiling: {
    backgroundColor: '#E7BE75',
    borderBottomColor: '#C28A49',
    borderBottomWidth: 4,
    height: 58,
    left: -20,
    position: 'absolute',
    right: -20,
    top: 0,
    transform: [{ skewX: '-28deg' }],
  },
  ceilingLineOne: {
    backgroundColor: '#B97937',
    height: 3,
    left: 18,
    position: 'absolute',
    right: -12,
    top: 18,
    transform: [{ skewX: '-28deg' }],
  },
  ceilingLineTwo: {
    backgroundColor: '#F7E4BC',
    height: 4,
    left: -24,
    position: 'absolute',
    right: 60,
    top: 42,
    transform: [{ skewX: '-28deg' }],
  },
  cornerColumn: {
    backgroundColor: '#E9C58D',
    borderLeftColor: '#CA955F',
    borderLeftWidth: 4,
    height: 250,
    position: 'absolute',
    right: 102,
    top: 46,
    width: 24,
  },
  wallPanelLeft: {
    borderColor: '#C9955C',
    borderWidth: 3,
    height: 96,
    left: 176,
    position: 'absolute',
    top: 92,
    width: 56,
  },
  wallPanelRight: {
    borderColor: '#D7A96B',
    borderWidth: 3,
    height: 104,
    position: 'absolute',
    right: 32,
    top: 76,
    width: 74,
  },
  wallStripe: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    height: 290,
    position: 'absolute',
    top: 12,
    transform: [{ skewX: '-22deg' }],
    width: 3,
  },
  window: {
    borderColor: '#D0A06B',
    borderWidth: 4,
    height: 116,
    position: 'absolute',
    right: -8,
    top: 74,
    width: 84,
  },
  windowLightOne: {
    backgroundColor: 'rgba(255,252,226,0.7)',
    height: 72,
    left: 8,
    position: 'absolute',
    top: 12,
    width: 24,
  },
  windowLightTwo: {
    backgroundColor: 'rgba(255,246,190,0.52)',
    height: 90,
    position: 'absolute',
    right: 10,
    top: 8,
    width: 18,
  },
  windowCrossHorizontal: {
    backgroundColor: '#D0A06B',
    height: 4,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 52,
  },
  windowCrossVertical: {
    backgroundColor: '#D0A06B',
    bottom: 0,
    left: 38,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  lamp: {
    height: 124,
    left: 242,
    position: 'absolute',
    top: 150,
    width: 44,
  },
  lampShade: {
    backgroundColor: '#F1D594',
    borderColor: '#7D4A28',
    borderWidth: 3,
    height: 28,
    left: 7,
    position: 'absolute',
    top: 0,
    transform: [{ skewX: '-8deg' }],
    width: 30,
    zIndex: 2,
  },
  lampGlow: {
    backgroundColor: 'rgba(255,232,159,0.28)',
    height: 42,
    left: 0,
    position: 'absolute',
    top: 18,
    transform: [{ skewX: '-10deg' }],
    width: 44,
  },
  lampPole: {
    backgroundColor: '#5B382A',
    height: 86,
    left: 20,
    position: 'absolute',
    top: 25,
    width: 4,
  },
  lampBase: {
    backgroundColor: '#5B382A',
    height: 5,
    left: 8,
    position: 'absolute',
    top: 108,
    width: 30,
  },
  floor: {
    backgroundColor: '#A76530',
    bottom: 0,
    height: 432,
    left: -42,
    overflow: 'hidden',
    position: 'absolute',
    right: -42,
    top: 258,
    transform: [{ skewY: '-8deg' }],
  },
  floorBoard: {
    backgroundColor: '#6A2D0D',
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  floorSlant: {
    backgroundColor: '#6F3211',
    height: 520,
    position: 'absolute',
    top: -42,
    transform: [{ rotateZ: '-22deg' }],
    width: 3,
  },
  floorHighlight: {
    backgroundColor: 'rgba(238,177,91,0.42)',
    height: 5,
    left: 160,
    position: 'absolute',
    top: 92,
    transform: [{ rotateZ: '-19deg' }],
    width: 210,
  },
  tinyPaper: {
    backgroundColor: '#D4C4B1',
    height: 18,
    left: 292,
    position: 'absolute',
    top: 210,
    transform: [{ rotateZ: '-17deg' }],
    width: 22,
  },
  wardrobeShadow: {
    backgroundColor: 'rgba(45,25,9,0.28)',
    height: 54,
    left: 14,
    position: 'absolute',
    top: 386,
    transform: [{ skewX: '-36deg' }],
    width: 230,
    zIndex: 2,
  },
  rug: {
    backgroundColor: '#182D63',
    borderColor: '#08172A',
    borderWidth: 4,
    height: 72,
    left: 8,
    position: 'absolute',
    top: 390,
    transform: [{ skewX: '-28deg' }],
    width: 136,
    zIndex: 3,
  },
  rugLineOne: {
    borderColor: '#446AA2',
    borderWidth: 3,
    bottom: 14,
    left: 18,
    position: 'absolute',
    right: 18,
    top: 14,
  },
  rugLineTwo: {
    backgroundColor: '#284E85',
    height: 3,
    left: 28,
    position: 'absolute',
    top: 34,
    width: 76,
  },
  wardrobe: {
    height: 360,
    left: 26,
    position: 'absolute',
    top: 112,
    width: 210,
    zIndex: 8,
  },
  wardrobeTop: {
    backgroundColor: woodMid,
    borderColor: woodDark,
    borderWidth: 4,
    height: 34,
    left: 26,
    position: 'absolute',
    top: 18,
    width: 132,
    zIndex: 6,
  },
  wardrobeCrownLeft: {
    backgroundColor: wood,
    borderColor: woodDark,
    borderWidth: 4,
    height: 62,
    left: 18,
    position: 'absolute',
    top: -6,
    transform: [{ rotateZ: '-18deg' }],
    width: 54,
    zIndex: 7,
  },
  wardrobeCrownCenter: {
    backgroundColor: wood,
    borderColor: woodDark,
    borderWidth: 4,
    height: 76,
    left: 66,
    position: 'absolute',
    top: -18,
    transform: [{ rotateZ: '8deg' }],
    width: 72,
    zIndex: 8,
  },
  wardrobeCrownRight: {
    backgroundColor: wood,
    borderColor: woodDark,
    borderWidth: 4,
    height: 56,
    left: 128,
    position: 'absolute',
    top: 0,
    transform: [{ rotateZ: '18deg' }],
    width: 50,
    zIndex: 7,
  },
  wardrobeBody: {
    backgroundColor: wood,
    borderColor: woodDark,
    borderWidth: 5,
    height: 264,
    left: 36,
    position: 'absolute',
    top: 52,
    width: 136,
    zIndex: 5,
  },
  innerDark: {
    backgroundColor: '#1D0C05',
    bottom: 14,
    left: 14,
    position: 'absolute',
    right: 14,
    top: 18,
  },
  closetRail: {
    backgroundColor: gold,
    height: 5,
    left: 25,
    position: 'absolute',
    top: 42,
    width: 90,
    zIndex: 3,
  },
  coatBrown: {
    backgroundColor: '#60331D',
    borderColor: '#170A05',
    borderWidth: 3,
    height: 102,
    left: 20,
    position: 'absolute',
    top: 48,
    transform: [{ skewY: '-8deg' }],
    width: 28,
    zIndex: 4,
  },
  shirtBlue: {
    backgroundColor: '#B7D4F3',
    borderColor: '#2C4F7E',
    borderWidth: 3,
    height: 112,
    left: 50,
    position: 'absolute',
    top: 44,
    width: 50,
    zIndex: 6,
  },
  shirtCollarLeft: {
    borderBottomColor: '#F8F4E7',
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderLeftWidth: 12,
    height: 0,
    left: 6,
    position: 'absolute',
    top: 0,
    width: 0,
  },
  shirtCollarRight: {
    borderBottomColor: '#F8F4E7',
    borderBottomWidth: 16,
    borderRightColor: 'transparent',
    borderRightWidth: 12,
    height: 0,
    position: 'absolute',
    right: 6,
    top: 0,
    width: 0,
  },
  greenTie: {
    backgroundColor: '#1A6A3C',
    height: 70,
    left: 22,
    position: 'absolute',
    top: 14,
    width: 8,
  },
  coatGray: {
    backgroundColor: '#333A3A',
    borderColor: '#15191A',
    borderWidth: 3,
    height: 104,
    left: 96,
    position: 'absolute',
    top: 52,
    transform: [{ skewY: '-8deg' }],
    width: 24,
    zIndex: 5,
  },
  stackShelf: {
    backgroundColor: woodLight,
    borderColor: woodDark,
    borderWidth: 3,
    height: 18,
    left: 18,
    position: 'absolute',
    top: 174,
    width: 98,
    zIndex: 5,
  },
  foldedGreen: {
    backgroundColor: '#315B3E',
    height: 12,
    left: 30,
    position: 'absolute',
    top: 156,
    width: 52,
    zIndex: 6,
  },
  foldedRust: {
    backgroundColor: '#B75C32',
    height: 16,
    left: 36,
    position: 'absolute',
    top: 142,
    width: 50,
    zIndex: 7,
  },
  foldedBlue: {
    backgroundColor: '#244F84',
    height: 18,
    left: 72,
    position: 'absolute',
    top: 198,
    width: 48,
    zIndex: 7,
  },
  foldedWhite: {
    backgroundColor: '#F4EFE6',
    height: 14,
    left: 94,
    position: 'absolute',
    top: 216,
    width: 34,
    zIndex: 7,
  },
  shoeLeft: {
    backgroundColor: '#482219',
    borderColor: '#170A05',
    borderWidth: 2,
    borderRadius: 8,
    bottom: 12,
    height: 12,
    left: 30,
    position: 'absolute',
    transform: [{ rotateZ: '-12deg' }],
    width: 34,
    zIndex: 7,
  },
  shoeRight: {
    backgroundColor: '#482219',
    borderColor: '#170A05',
    borderWidth: 2,
    borderRadius: 8,
    bottom: 14,
    height: 12,
    left: 62,
    position: 'absolute',
    transform: [{ rotateZ: '-7deg' }],
    width: 34,
    zIndex: 7,
  },
  leftDoor: {
    backgroundColor: woodMid,
    borderColor: woodDark,
    borderWidth: 4,
    height: 250,
    left: -10,
    position: 'absolute',
    top: 66,
    transform: [{ skewY: '-18deg' }],
    width: 70,
    zIndex: 9,
  },
  rightDoor: {
    backgroundColor: woodMid,
    borderColor: woodDark,
    borderWidth: 4,
    height: 250,
    left: 164,
    position: 'absolute',
    top: 68,
    transform: [{ skewY: '16deg' }],
    width: 62,
    zIndex: 10,
  },
  doorPanelOuter: {
    borderColor: woodLight,
    borderWidth: 3,
    bottom: 18,
    left: 10,
    position: 'absolute',
    right: 10,
    top: 22,
  },
  doorPanelInner: {
    borderColor: '#7A321F',
    borderWidth: 3,
    bottom: 58,
    left: 20,
    position: 'absolute',
    right: 18,
    top: 54,
  },
  woodPixelOne: {
    backgroundColor: '#6C2D0C',
    height: 88,
    left: 16,
    position: 'absolute',
    top: 34,
    width: 3,
  },
  woodPixelTwo: {
    backgroundColor: '#C17436',
    height: 64,
    position: 'absolute',
    right: 14,
    top: 40,
    width: 3,
  },
  woodPixelThree: {
    backgroundColor: '#C17436',
    bottom: 24,
    height: 8,
    position: 'absolute',
    right: 10,
    width: 8,
  },
  leftDoorHandle: {
    backgroundColor: gold,
    borderColor: '#7B4A09',
    borderWidth: 2,
    borderRadius: 7,
    height: 20,
    position: 'absolute',
    right: 2,
    top: 100,
    width: 10,
  },
  rightDoorHandle: {
    backgroundColor: gold,
    borderColor: '#7B4A09',
    borderWidth: 2,
    borderRadius: 7,
    height: 18,
    left: 2,
    position: 'absolute',
    top: 104,
    width: 10,
  },
  hinge: {
    backgroundColor: gold,
    height: 18,
    position: 'absolute',
    width: 10,
  },
  leftHingeTop: {
    right: -9,
    top: 34,
  },
  leftHingeBottom: {
    bottom: 54,
    right: -9,
  },
  rightHingeTop: {
    left: -9,
    top: 34,
  },
  rightHingeBottom: {
    bottom: 54,
    left: -9,
  },
});
