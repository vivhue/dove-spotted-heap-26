import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CategoryId = 'shirts' | 'pants' | 'accessories' | 'bags';

const categories: Array<{
  id: CategoryId;
  label: string;
  items: string[];
  note: string;
}> = [
  {
    id: 'shirts',
    label: 'Shirts',
    items: ['Tee', 'Blouse', 'Crop', 'Button'],
    note: 'Wearing your last selected top',
  },
  {
    id: 'pants',
    label: 'Pants',
    items: ['Jeans', 'Wide', 'Skirt', 'Shorts'],
    note: 'Wearing your last selected bottom',
  },
  {
    id: 'accessories',
    label: 'Accessories',
    items: ['Hat', 'Chain', 'Scarf', 'Watch'],
    note: 'Trying your saved finishing touches',
  },
  {
    id: 'bags',
    label: 'Bags',
    items: ['Tote', 'Mini', 'Sling', 'Work'],
    note: 'Matching the bag you chose last',
  },
];

export default function Home() {
  const [hasEntered, setHasEntered] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('shirts');
  const { width } = useWindowDimensions();
  const active = useMemo(
    () => categories.find((category) => category.id === activeCategory) ?? categories[0],
    [activeCategory]
  );

  if (!hasEntered) {
    return <EntranceScreen onEnter={() => setHasEntered(true)} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.dashboardContent}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Closet AI</Text>
            <Text style={styles.title}>dashboard - {active.id}</Text>
          </View>
          <Pressable style={styles.resetButton} onPress={() => setHasEntered(false)}>
            <Text style={styles.resetButtonText}>Entrance</Text>
          </Pressable>
        </View>

        <View style={[styles.modelPanel, width > 700 && styles.modelPanelWide]}>
          <View style={styles.avatarStage}>
            <View style={styles.avatarHead} />
            <View style={styles.avatarNeck} />
            <View style={styles.avatarBody}>
              <TShirtIcon size={96} color="#111111" accent="#f7f2e8" />
            </View>
            <Text style={styles.modelLabel}>model</Text>
            <Text style={styles.modelNote}>{active.note}</Text>
            <Text style={styles.modelSmall}>
              First load shows plain white clothes. No border needed, just the model inside.
            </Text>
          </View>
        </View>

        <View style={styles.closetPanel}>
          <View style={styles.categoryBar}>
            {categories.map((category) => {
              const selected = category.id === active.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setActiveCategory(category.id)}
                  style={[styles.categoryButton, selected && styles.categoryButtonSelected]}>
                  <CategoryGlyph category={category.id} selected={selected} />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.itemGrid}>
            {active.items.map((item) => (
              <Pressable key={item} style={styles.itemCard}>
                <ClosetItemIcon category={active.id} />
                <Text style={styles.itemText}>{item}</Text>
              </Pressable>
            ))}
            {Array.from({ length: 8 }).map((_, index) => (
              <View key={`empty-${index}`} style={styles.emptySlot} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EntranceScreen({ onEnter }: { onEnter: () => void }) {
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(intro, {
      toValue: 1,
      friction: 7,
      tension: 62,
      useNativeDriver: true,
    }).start();
  }, [intro]);

  return (
    <SafeAreaView style={styles.entrance}>
      <View style={styles.entranceCenter}>
        <View style={styles.entranceGlow} />
        <Animated.View
          style={[
            styles.entranceBadge,
            {
              opacity: intro,
              transform: [
                {
                  scale: intro.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.68, 1],
                  }),
                },
              ],
            },
          ]}>
          <TShirtIcon size={128} color="#ffffff" accent="#d8f3dc" />
        </Animated.View>
        <Text style={styles.entranceTitle}>Closet AI</Text>
        <Text style={styles.entranceSubtitle}>Open your virtual wardrobe.</Text>
        <Pressable style={styles.enterButton} onPress={onEnter}>
          <Text style={styles.enterButtonText}>Enter closet</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CategoryGlyph({ category, selected }: { category: CategoryId; selected: boolean }) {
  const color = selected ? '#ffffff' : '#111111';
  const accent = selected ? '#dfe6dd' : '#7d7c77';

  if (category === 'shirts') {
    return <TShirtIcon size={28} color={color} accent={accent} />;
  }

  if (category === 'pants') {
    return <PantsIcon color={color} />;
  }

  if (category === 'accessories') {
    return <HatIcon color={color} />;
  }

  return <BagIcon color={color} />;
}

function ClosetItemIcon({ category }: { category: CategoryId }) {
  if (category === 'shirts') {
    return <TShirtIcon size={44} color="#101010" accent="#8f9f8f" />;
  }

  if (category === 'pants') {
    return <PantsIcon color="#101010" large />;
  }

  if (category === 'accessories') {
    return <HatIcon color="#101010" large />;
  }

  return <BagIcon color="#101010" large />;
}

function PantsIcon({ color, large = false }: { color: string; large?: boolean }) {
  const width = large ? 42 : 26;
  const height = large ? 46 : 28;

  return (
    <View style={[styles.pantsWrap, { width, height }]}>
      <View style={[styles.pantsWaist, { backgroundColor: color }]} />
      <View style={styles.pantsLegRow}>
        <View style={[styles.pantsLeg, { backgroundColor: color }]} />
        <View style={[styles.pantsLeg, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function HatIcon({ color, large = false }: { color: string; large?: boolean }) {
  return (
    <View style={[styles.hatWrap, large && styles.hatWrapLarge]}>
      <View style={[styles.hatTop, { backgroundColor: color }]} />
      <View style={[styles.hatBrim, { backgroundColor: color }]} />
    </View>
  );
}

function BagIcon({ color, large = false }: { color: string; large?: boolean }) {
  return (
    <View style={[styles.bagWrap, large && styles.bagWrapLarge]}>
      <View style={[styles.bagHandle, { borderColor: color }]} />
      <View style={[styles.bagBody, { backgroundColor: color }]} />
    </View>
  );
}

function TShirtIcon({
  size,
  color,
  accent,
}: {
  size: number;
  color: string;
  accent: string;
}) {
  const bodyWidth = size * 0.56;
  const bodyHeight = size * 0.58;
  const sleeveSize = size * 0.28;

  return (
    <View style={[styles.shirtWrap, { width: size, height: size }]}>
      <View
        style={[
          styles.shirtSleeve,
          styles.leftSleeve,
          {
            width: sleeveSize,
            height: sleeveSize * 1.2,
            backgroundColor: color,
            borderColor: accent,
          },
        ]}
      />
      <View
        style={[
          styles.shirtSleeve,
          styles.rightSleeve,
          {
            width: sleeveSize,
            height: sleeveSize * 1.2,
            backgroundColor: color,
            borderColor: accent,
          },
        ]}
      />
      <View
        style={[
          styles.shirtBody,
          {
            width: bodyWidth,
            height: bodyHeight,
            backgroundColor: color,
            borderColor: accent,
          },
        ]}>
        <View style={[styles.shirtCollar, { borderColor: accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f1ea',
  },
  dashboardContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  kicker: {
    color: '#8f8068',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#1f211d',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 3,
  },
  resetButton: {
    backgroundColor: '#1f211d',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modelPanel: {
    backgroundColor: '#fffdf8',
    borderRadius: 8,
    padding: 22,
    minHeight: 330,
    justifyContent: 'center',
    shadowColor: '#1f211d',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  modelPanelWide: {
    minHeight: 380,
  },
  avatarStage: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 420,
    minHeight: 286,
    backgroundColor: '#ddd8cf',
    borderRadius: 4,
    padding: 24,
  },
  avatarHead: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#c4a78e',
  },
  avatarNeck: {
    width: 28,
    height: 22,
    backgroundColor: '#c4a78e',
  },
  avatarBody: {
    alignItems: 'center',
    marginTop: -6,
  },
  modelLabel: {
    color: '#1f211d',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 18,
  },
  modelNote: {
    color: '#1f211d',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  modelSmall: {
    color: '#4f4f49',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    maxWidth: 260,
    textAlign: 'center',
  },
  closetPanel: {
    backgroundColor: '#ddd8cf',
    borderRadius: 8,
    padding: 14,
    gap: 14,
  },
  categoryBar: {
    flexDirection: 'row',
    backgroundColor: '#7d7c77',
    borderRadius: 6,
    padding: 4,
    gap: 4,
  },
  categoryButton: {
    flex: 1,
    height: 34,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: '#b8b6ae',
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemCard: {
    width: '23%',
    minWidth: 68,
    aspectRatio: 1,
    borderRadius: 6,
    backgroundColor: '#8c8b85',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  emptySlot: {
    width: '23%',
    minWidth: 68,
    aspectRatio: 1,
    borderRadius: 6,
    backgroundColor: '#8c8b85',
    opacity: 0.6,
  },
  entrance: {
    flex: 1,
    backgroundColor: '#161713',
  },
  entranceCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  entranceGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#5e8c61',
    opacity: 0.22,
  },
  entranceBadge: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#5d725e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b8d8be',
  },
  entranceTitle: {
    color: '#fffdf8',
    fontSize: 44,
    fontWeight: '900',
    marginTop: 28,
  },
  entranceSubtitle: {
    color: '#d7d0c5',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  enterButton: {
    backgroundColor: '#fffdf8',
    borderRadius: 999,
    marginTop: 26,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  enterButtonText: {
    color: '#161713',
    fontSize: 15,
    fontWeight: '900',
  },
  shirtWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shirtBody: {
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  shirtSleeve: {
    position: 'absolute',
    top: '24%',
    borderRadius: 8,
    borderWidth: 2,
  },
  leftSleeve: {
    left: '12%',
    transform: [{ rotate: '24deg' }],
  },
  rightSleeve: {
    right: '12%',
    transform: [{ rotate: '-24deg' }],
  },
  shirtCollar: {
    width: '36%',
    height: '20%',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
  pantsWrap: {
    alignItems: 'center',
    gap: 2,
  },
  pantsWaist: {
    width: '74%',
    height: '16%',
    borderRadius: 3,
  },
  pantsLegRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  pantsLeg: {
    width: '38%',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  hatWrap: {
    width: 30,
    height: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hatWrapLarge: {
    width: 48,
    height: 36,
  },
  hatTop: {
    width: '58%',
    height: '56%',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  hatBrim: {
    width: '88%',
    height: '18%',
    borderRadius: 999,
  },
  bagWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bagWrapLarge: {
    width: 48,
    height: 48,
  },
  bagHandle: {
    width: '42%',
    height: '32%',
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    marginBottom: -2,
  },
  bagBody: {
    width: '72%',
    height: '58%',
    borderRadius: 5,
  },
});
