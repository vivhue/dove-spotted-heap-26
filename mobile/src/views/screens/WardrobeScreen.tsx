import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { categoryFilters, ScreenId } from '@/models/closet';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';
import { WardrobeCard } from '@/views/components/wardrobe-card';

export function WardrobeScreen({
  mode,
  onNavigate,
}: {
  mode: 'closet' | 'wishlist';
  onNavigate: (screen: ScreenId) => void;
}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const { closetItems, selectedOutfit, toggleWornItem, wishlistItems } = useClosetStore();
  const items = mode === 'closet' ? closetItems : wishlistItems;
  const filteredItems = useMemo(() => {
    if (activeFilter === 'All' || activeFilter === '...') {
      return items;
    }

    const category = activeFilter.toLowerCase();
    return items.filter((item) => {
      if (category === 'tops') return item.category === 'tops';
      if (category === 'bottoms') return item.category === 'bottoms';
      if (category === 'outerwear') return item.category === 'outerwear';
      if (category === 'shoes') return item.category === 'shoes';
      if (category === 'accessories') return item.category === 'accessories';
      return true;
    });
  }, [activeFilter, items]);

  return (
    <AppScreen activeTab={mode} onNavigate={onNavigate} title="My wardrobe">
      <View style={styles.toggle}>
        <Pressable
          onPress={() => onNavigate('closet')}
          style={[styles.toggleButton, mode === 'closet' && styles.toggleButtonSelected]}>
          <Text style={[styles.toggleText, mode === 'closet' && styles.toggleTextSelected]}>Closet</Text>
        </Pressable>
        <Pressable
          onPress={() => onNavigate('wishlist')}
          style={[styles.toggleButton, mode === 'wishlist' && styles.toggleButtonSelected]}>
          <Text style={[styles.toggleText, mode === 'wishlist' && styles.toggleTextSelected]}>Wishlist</Text>
        </Pressable>
      </View>

      {mode === 'closet' && (
        <Pressable style={styles.tryOnButton} onPress={() => onNavigate('try-on')}>
          <LineIcon name="✦" color={closetTheme.camelDeep} />
          <Text style={styles.tryOnText}>Try it on</Text>
        </Pressable>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categoryFilters.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={[styles.chip, activeFilter === filter && styles.chipSelected]}>
            <Text style={[styles.chipText, activeFilter === filter && styles.chipTextSelected]}>{filter}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.grid}>
        {filteredItems.map((item) => (
          <View key={item.id} style={styles.cardWrap}>
            <WardrobeCard
              isWorn={mode === 'closet' && selectedOutfit[item.category] === item.id}
              item={item}
              onPress={mode === 'closet' ? () => toggleWornItem(item) : undefined}
              showHeart={mode === 'closet'}
            />
          </View>
        ))}
        {filteredItems.length === 0 && <Text style={styles.emptyText}>No items here yet.</Text>}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => onNavigate('add')}>
        <LineIcon name="+" color={closetTheme.camel} />
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  toggle: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 18,
    flexDirection: 'row',
    marginHorizontal: 22,
    marginTop: 16,
    padding: 4,
  },
  tryOnButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 22,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tryOnText: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  toggleButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    paddingVertical: 10,
  },
  toggleButtonSelected: {
    backgroundColor: closetTheme.white,
  },
  toggleText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  toggleTextSelected: {
    color: closetTheme.ink,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  chip: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: closetTheme.ink,
    borderColor: closetTheme.ink,
  },
  chipText: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  chipTextSelected: {
    color: closetTheme.cream,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    padding: 22,
    paddingTop: 16,
  },
  cardWrap: {
    width: '47.8%',
  },
  emptyText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '800',
    paddingTop: 28,
    textAlign: 'center',
    width: '100%',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 24,
    bottom: 88,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 22,
    width: 48,
  },
});
