import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { browseCategories, CategoryId, ScreenId, WardrobeItem } from '@/models/closet';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { WardrobeCard } from '@/views/components/wardrobe-card';

type Props = {
  activeCategory: CategoryId;
  items: WardrobeItem[];
  onCategoryChange: (category: CategoryId) => void;
  onNavigate: (screen: ScreenId) => void;
};

export function DashboardScreen({ activeCategory, items, onCategoryChange, onNavigate }: Props) {
  const categoryItems = items.filter((item) => item.category === activeCategory);

  return (
    <AppScreen activeTab="home" onNavigate={onNavigate} title="Browse">
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}>
        {browseCategories.map((category) => {
          const selected = category.id === activeCategory;

          return (
            <Pressable
              key={category.id}
              hitSlop={8}
              onPress={() => onCategoryChange(category.id)}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.tabSelected,
                pressed && styles.tabPressed,
              ]}>
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{category.shortLabel}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.grid}>
        {categoryItems.map((item) => (
          <Pressable key={item.id} style={styles.cardWrap}>
            <WardrobeCard item={item} />
          </Pressable>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  tab: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    minHeight: 36,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabSelected: {
    borderBottomColor: closetTheme.camelDeep,
  },
  tabPressed: {
    opacity: 0.65,
  },
  tabText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  tabTextSelected: {
    color: closetTheme.camelDeep,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 18,
  },
  cardWrap: {
    width: '47.8%',
  },
});
