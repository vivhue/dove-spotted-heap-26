import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryId, WardrobeItem, categoryFilters, ScreenId } from '@/models/closet';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';
import { WardrobeCard } from '@/views/components/wardrobe-card';

// Maps the plural display labels in categoryFilters to garment categories.
// Any label not listed here (e.g. "All") shows everything.
const filterToCategory: Record<string, CategoryId> = {
  Shirts: 'shirt',
  Dresses: 'dress',
  Shorts: 'shorts',
  Pants: 'pants',
};
const priceRanges = ['All prices', 'Under $50', '$50-$100', '$100+'] as const;
const fitFilters = ['All fits', 'Fitted', 'Relaxed', 'Structured'] as const;

type PriceRange = typeof priceRanges[number];
type FitFilter = typeof fitFilters[number];

export function WardrobeScreen({
  mode,
  onNavigate,
}: {
  mode: 'closet' | 'wishlist';
  onNavigate: (screen: ScreenId) => void;
}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [priceRange, setPriceRange] = useState<PriceRange>('All prices');
  const [colorFilter, setColorFilter] = useState('All colors');
  const [fitFilter, setFitFilter] = useState<FitFilter>('All fits');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { closetItems, isLoadingItems, itemsError, selectedOutfit, toggleWornItem, wishlistItems } = useClosetStore();
  const items = mode === 'closet' ? closetItems : wishlistItems;
  const wishlistColors = useMemo(() => {
    const colors = items
      .map((item) => item.primaryColor || item.color)
      .filter((color): color is string => Boolean(color?.trim()));

    return ['All colors', ...Array.from(new Set(colors.map(titleCase)))];
  }, [items]);
  const filteredItems = useMemo(() => {
    const category = filterToCategory[activeFilter];
    let nextItems = category ? items.filter((item) => item.category === category) : items;

    if (mode === 'wishlist') {
      nextItems = nextItems.filter((item) => matchesPriceRange(item, priceRange));
      nextItems = nextItems.filter((item) => matchesColor(item, colorFilter));
      nextItems = nextItems.filter((item) => matchesFit(item, fitFilter));
    }

    return nextItems;
  }, [activeFilter, colorFilter, fitFilter, items, mode, priceRange]);

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

      <View style={styles.actionRow}>
        <Pressable style={styles.tryOnButton} onPress={() => onNavigate('try-on')}>
          <LineIcon name="✦" color={closetTheme.camelDeep} />
          <Text style={styles.tryOnText}>Try it on</Text>
        </Pressable>

        {mode === 'wishlist' && (
          <Pressable style={[styles.filterButton, isFilterOpen && styles.filterButtonOpen]} onPress={() => setIsFilterOpen((isOpen) => !isOpen)}>
            <LineIcon name="⌄" color={closetTheme.camelDeep} />
            <Text style={styles.tryOnText}>Filter</Text>
          </Pressable>
        )}
      </View>

      {mode === 'wishlist' && isFilterOpen && (
        <View style={styles.wishlistFilters}>
          <FilterChipRow
            label="Price"
            options={priceRanges}
            selected={priceRange}
            onSelect={(value) => setPriceRange(value as PriceRange)}
          />
          <FilterChipRow
            label="Color"
            options={wishlistColors}
            selected={colorFilter}
            onSelect={setColorFilter}
          />
          <FilterChipRow
            label="Fit"
            options={fitFilters}
            selected={fitFilter}
            onSelect={(value) => setFitFilter(value as FitFilter)}
          />
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chips}>
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
        {isLoadingItems && (
          <View style={styles.emptyState}>
            <ActivityIndicator color={closetTheme.camelDeep} />
            <Text style={styles.emptyText}>Loading your saved items...</Text>
          </View>
        )}
        {!isLoadingItems && itemsError !== '' && filteredItems.length === 0 && <Text style={styles.emptyText}>{itemsError}</Text>}
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
        {!isLoadingItems && !itemsError && filteredItems.length === 0 && <Text style={styles.emptyText}>No items in digital closet. Tap + to upload one.</Text>}
      </ScrollView>
    </AppScreen>
  );
}

function FilterChipRow({
  label,
  onSelect,
  options,
  selected,
}: {
  label: string;
  onSelect: (value: string) => void;
  options: readonly string[];
  selected: string;
}) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.filterChip, selected === option && styles.filterChipSelected]}>
            <Text style={[styles.filterChipText, selected === option && styles.filterChipTextSelected]}>{option}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function matchesPriceRange(item: WardrobeItem, range: PriceRange) {
  if (range === 'All prices') {
    return true;
  }

  const price = parsePrice(item.price);

  if (price == null) {
    return false;
  }

  if (range === 'Under $50') {
    return price < 50;
  }

  if (range === '$50-$100') {
    return price >= 50 && price <= 100;
  }

  return price > 100;
}

function matchesColor(item: WardrobeItem, color: string) {
  if (color === 'All colors') {
    return true;
  }

  return titleCase(item.primaryColor || item.color || '') === color;
}

function matchesFit(item: WardrobeItem, fit: FitFilter) {
  if (fit === 'All fits') {
    return true;
  }

  return inferFit(item) === fit.toLowerCase();
}

function parsePrice(price?: string) {
  if (!price) {
    return null;
  }

  const parsed = Number.parseFloat(price.replace(/[^0-9.]/g, ''));

  return Number.isFinite(parsed) ? parsed : null;
}

function inferFit(item: WardrobeItem) {
  const text = [
    item.name,
    item.subcategory,
    item.texture,
    ...(item.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (hasAny(text, ['fitted', 'slim', 'skinny', 'bodycon', 'tailored'])) {
    return 'fitted';
  }

  if (hasAny(text, ['relaxed', 'oversized', 'baggy', 'wide', 'loose'])) {
    return 'relaxed';
  }

  if (hasAny(text, ['structured', 'blazer', 'jacket', 'pleated', 'crisp'])) {
    return 'structured';
  }

  return '';
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function titleCase(value: string) {
  return value.trim().replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

const styles = StyleSheet.create({
  toggle: {
    backgroundColor: closetTheme.blueWash,
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
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 22,
    marginTop: 12,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterButtonOpen: {
    backgroundColor: closetTheme.blueWash,
    borderColor: closetTheme.camelDeep,
  },
  tryOnText: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  wishlistFilters: {
    gap: 8,
    marginHorizontal: 22,
    marginTop: 10,
  },
  filterRow: {
    gap: 6,
  },
  filterLabel: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  filterChips: {
    gap: 6,
  },
  filterChip: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterChipSelected: {
    backgroundColor: closetTheme.blueWash,
    borderColor: closetTheme.camelDeep,
  },
  filterChipText: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  filterChipTextSelected: {
    color: closetTheme.ink,
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
    alignItems: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  chipScroller: {
    flexGrow: 0,
    height: 50,
    marginTop: 8,
  },
  chip: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  chipSelected: {
    backgroundColor: closetTheme.navy,
    borderColor: closetTheme.navy,
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
    paddingTop: 8,
  },
  cardWrap: {
    width: '47.8%',
  },
  emptyText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '800',
    paddingTop: 12,
    textAlign: 'center',
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 28,
    width: '100%',
  },
});
