import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  browseCategories,
  CategoryId,
  ScreenId,
} from '@/models/closet';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen, AvatarButton } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';

type Props = {
  activeCategory: CategoryId;
  onCategoryChange: (category: CategoryId) => void;
  onNavigate: (screen: ScreenId) => void;
};

export function HomeScreen({
  onCategoryChange,
  onNavigate,
}: Props) {
  const [surpriseIndex, setSurpriseIndex] = useState(0);
  const { closetItems, selectedOutfit, toggleWornItem } = useClosetStore();
  const featuredItems = closetItems;
  const categoriesWithItems = useMemo(
    () =>
      browseCategories
        .map((category) => ({
          ...category,
          items: closetItems.filter((item) => item.category === category.id),
        }))
        .filter((category) => category.items.length > 0),
    [closetItems]
  );
  function surpriseMe() {
    if (featuredItems.length === 0) {
      return;
    }

    const nextIndex = (surpriseIndex + 1) % featuredItems.length;
    setSurpriseIndex(nextIndex);
    onCategoryChange(featuredItems[nextIndex].category);
  }

  return (
    <AppScreen activeTab="home" onNavigate={onNavigate}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <View style={styles.weather}>
            <LineIcon name="☼" color={closetTheme.camel} />
            <Text style={styles.weatherText}>25°</Text>
            <Text style={styles.weatherSmall}>H29° L22°</Text>
          </View>
          <Pressable style={styles.calendarButton} onPress={() => onNavigate('calendar')}>
            <LineIcon name="□" />
          </Pressable>
          <View style={styles.spacer} />
          <View style={styles.iconButton}>
            <LineIcon name="!" />
          </View>
          <AvatarButton onPress={() => onNavigate('account')} />
        </View>

        <View style={styles.stage}>
          <View style={styles.stageBackground} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Try clothes on your real photo</Text>
            <Text style={styles.heroText}>Pick one item per category, then render the outfit onto your own full-body photo.</Text>
          </View>
          <Pressable style={styles.browseHotspot} onPress={() => onNavigate('try-on')}>
            <LineIcon name="✦" color={closetTheme.camelDeep} />
            <Text style={styles.browseHotspotText}>Open try-on</Text>
          </Pressable>
        </View>

        <View style={styles.shuffleRow}>
          <Pressable style={({ pressed }) => [styles.shuffleButton, pressed && styles.buttonPressed]} onPress={surpriseMe}>
            <LineIcon name="⇄" color={closetTheme.camel} />
            <Text style={styles.shuffleText}>surprise me</Text>
          </Pressable>
        </View>

        <View style={styles.categorySections}>
          {categoriesWithItems.map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category.label}</Text>
                <Text style={styles.categoryCount}>{category.items.length}</Text>
              </View>
              <View style={styles.itemGrid}>
                {category.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      toggleWornItem(item);
                      onCategoryChange(item.category);
                    }}
                    style={({ pressed }) => [
                      styles.itemTile,
                      selectedOutfit[item.category] === item.id && styles.itemTileSelected,
                      pressed && styles.swatchPressed,
                    ]}>
                    <View style={styles.itemThumb}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="contain" />
                      ) : (
                        <ClosetIcon category={item.category} color={item.color} accent={item.accent} size={32} />
                      )}
                    </View>
                    <Text numberOfLines={2} style={styles.itemName}>
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 18,
  },
  topbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  weather: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  weatherText: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  weatherSmall: {
    color: '#9B8D77',
    fontSize: 11,
    fontWeight: '600',
  },
  calendarButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  spacer: {
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stage: {
    alignItems: 'center',
    height: 198,
    justifyContent: 'center',
    marginTop: 8,
    position: 'relative',
  },
  stageBackground: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 28,
    bottom: 18,
    left: 28,
    position: 'absolute',
    right: 28,
    top: 18,
  },
  heroCopy: {
    gap: 9,
    paddingHorizontal: 42,
    zIndex: 2,
  },
  heroTitle: {
    color: closetTheme.ink,
    fontFamily: 'serif',
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroText: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  browseHotspot: {
    alignItems: 'center',
    backgroundColor: 'rgba(43, 33, 24, 0.08)',
    borderColor: 'rgba(43, 33, 24, 0.1)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    bottom: 28,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    zIndex: 4,
  },
  browseHotspotText: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  shuffleRow: {
    alignItems: 'center',
    paddingVertical: 7,
  },
  shuffleButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  shuffleText: {
    color: closetTheme.cream,
    fontSize: 12,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  swatches: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  swatch: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  swatchImage: {
    height: 52,
    width: 52,
  },
  categorySections: {
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  categorySection: {
    gap: 10,
  },
  categoryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryTitle: {
    color: closetTheme.camelDeep,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  categoryCount: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemTile: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    gap: 7,
    minHeight: 112,
    padding: 9,
    width: '47.8%',
  },
  itemTileSelected: {
    borderColor: closetTheme.camel,
  },
  itemThumb: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 13,
    height: 62,
    justifyContent: 'center',
    width: '100%',
  },
  itemImage: {
    height: 58,
    width: '92%',
  },
  itemName: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
    minHeight: 28,
    textAlign: 'center',
  },
  swatchSelected: {
    borderColor: closetTheme.camel,
  },
  swatchPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  catRow: {
    flexDirection: 'row',
    gap: 18,
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  catButton: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    minHeight: 32,
    paddingBottom: 7,
    paddingTop: 4,
  },
  catButtonSelected: {
    borderBottomColor: closetTheme.camelDeep,
  },
  catButtonPressed: {
    opacity: 0.65,
  },
  catText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  catTextSelected: {
    color: closetTheme.camelDeep,
  },
});
