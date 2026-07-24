import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryId, WardrobeItem, categoryFilters, ScreenId } from '@/models/closet';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme, closetTypography } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';
import { WardrobeCard } from '@/views/components/wardrobe-card';

// Maps the plural display labels in categoryFilters to garment categories.
// Any label not listed here (e.g. "All") shows everything.
const filterToCategory: Record<string, CategoryId> = {
  Tops: 'shirt',
  Dresses: 'dress',
  Shorts: 'shorts',
  Pants: 'pants',
};
const priceRanges = ['All prices', 'Under $50', '$50-$100', '$100+'] as const;
const fitFilters = ['All fits', 'Fitted', 'Relaxed', 'Structured'] as const;
const wardrobeBackground = require('../../../assets/images/wardrobe-bg.png');

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
  const [activeItem, setActiveItem] = useState<WardrobeItem | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { closetItems, isLoadingItems, itemsError, removeItem, selectedOutfit, setEditingItem, toggleWornItem, wishlistItems } = useClosetStore();
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

    nextItems = nextItems.filter((item) => matchesPriceRange(item, priceRange));
    nextItems = nextItems.filter((item) => matchesColor(item, colorFilter));
    nextItems = nextItems.filter((item) => matchesFit(item, fitFilter));

    return nextItems;
  }, [activeFilter, colorFilter, fitFilter, items, mode, priceRange]);

  function openItemActions(item: WardrobeItem) {
    setActiveItem(item);
    setIsConfirmingDelete(false);
    setDeleteError('');
  }

  function closeItemActions() {
    if (isDeleting) {
      return;
    }

    setActiveItem(null);
    setIsConfirmingDelete(false);
    setDeleteError('');
  }

  function startEditingItem(item: WardrobeItem) {
    setActiveItem(null);
    setIsConfirmingDelete(false);
    setEditingItem(item);
    onNavigate('add');
  }

  async function confirmDelete() {
    if (!activeItem) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');
      await removeItem(activeItem.id);
      setActiveItem(null);
      setIsConfirmingDelete(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete this item.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppScreen activeTab={mode} onNavigate={onNavigate} showStatus={false}>
      <View style={styles.background}>
        <Image source={wardrobeBackground} resizeMode="contain" style={styles.backgroundImage} />
        <View style={styles.scrim}>
          <Text style={styles.screenTitle}>My wardrobe</Text>

          <View style={[styles.topControls, styles.raisedContent]}>
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
            <Pressable
              accessibilityLabel="Filter wardrobe"
              style={[styles.filterButton, isFilterOpen && styles.filterButtonOpen]}
              onPress={() => setIsFilterOpen((isOpen) => !isOpen)}>
              <PixelFilterIcon />
            </Pressable>
          </View>

          {isFilterOpen && (
            <View style={[styles.wishlistFilters, styles.raisedContent]}>
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipScroller, styles.raisedContent]} contentContainerStyle={styles.chips}>
            {categoryFilters.map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[styles.chip, activeFilter === filter && styles.chipSelected]}>
                <Text style={[styles.chipText, activeFilter === filter && styles.chipTextSelected]}>{filter}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={styles.raisedContent} contentContainerStyle={styles.grid}>
            {isLoadingItems && (
              <View style={styles.emptyState}>
                <ActivityIndicator color={closetTheme.camelDeep} />
                <Text style={styles.emptyText}>Loading your saved items...</Text>
              </View>
            )}
            {!isLoadingItems && itemsError !== '' && <Text style={styles.emptyText}>{itemsError}</Text>}
            {filteredItems.map((item) => (
              <View key={item.id} style={styles.cardWrap}>
                <WardrobeCard
                  isWorn={mode === 'closet' && selectedOutfit[item.category] === item.id}
                  item={item}
                  onOpenActions={() => openItemActions(item)}
                  onPress={mode === 'closet' ? () => toggleWornItem(item) : () => openItemActions(item)}
                  showHeart={mode === 'closet'}
                />
              </View>
            ))}
            {!isLoadingItems && !itemsError && filteredItems.length === 0 && items.length > 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, styles.filteredEmptyText]}>Nothing matches these filters.</Text>
                <Pressable
                  style={({ pressed }) => [styles.clearFiltersButton, pressed && styles.buttonPressed]}
                  onPress={clearFilters}>
                  <Text style={styles.clearFiltersText}>Clear filters</Text>
                </Pressable>
              </View>
            )}
            {!isLoadingItems && !itemsError && items.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {mode === 'closet'
                    ? 'No items in digital closet. Tap + to upload one.'
                    : 'Your wishlist is empty. Tap + to save something you want.'}
                </Text>
              </View>
            )}
          </ScrollView>

          <Pressable
            accessibilityLabel="Upload clothing item"
            style={({ pressed }) => [styles.addFab, pressed && styles.buttonPressed]}
            onPress={() => {
              // A fresh add must never inherit a stale edit target.
              setEditingItem(null);
              onNavigate('add');
            }}>
            <View pointerEvents="none" style={styles.addFabHighlight} />
            <View pointerEvents="none" style={styles.addFabLeftHighlight} />
            <View pointerEvents="none" style={styles.addFabBottomShade} />
            <View pointerEvents="none" style={styles.addFabRightShade} />
            <View pointerEvents="none" style={styles.addPlus}>
              <View style={styles.addPlusOutlineHorizontal} />
              <View style={styles.addPlusOutlineVertical} />
            </View>
          </Pressable>

          <Pressable
            accessibilityLabel="Try clothes on virtually"
            style={({ pressed }) => [styles.tryOnButton, styles.floatingTryOnButton, pressed && styles.buttonPressed]}
            onPress={() => onNavigate('try-on')}>
            <LineIcon name="✦" color="#7A4328" />
            <Text style={[styles.tryOnText, styles.floatingTryOnText]}>Try it on</Text>
          </Pressable>

          {activeItem && (
            <ItemActionsOverlay
              deleteError={deleteError}
              isConfirmingDelete={isConfirmingDelete}
              isDeleting={isDeleting}
              item={activeItem}
              mode={mode}
              onClose={closeItemActions}
              onConfirmDelete={confirmDelete}
              onEdit={() => startEditingItem(activeItem)}
              onRequestDelete={() => setIsConfirmingDelete(true)}
            />
          )}
        </View>
      </View>
    </AppScreen>
  );

  function clearFilters() {
    setActiveFilter('All');
    setPriceRange('All prices');
    setColorFilter('All colors');
    setFitFilter('All fits');
  }
}

function ItemActionsOverlay({
  deleteError,
  isConfirmingDelete,
  isDeleting,
  item,
  mode,
  onClose,
  onConfirmDelete,
  onEdit,
  onRequestDelete,
}: {
  deleteError: string;
  isConfirmingDelete: boolean;
  isDeleting: boolean;
  item: WardrobeItem;
  mode: 'closet' | 'wishlist';
  onClose: () => void;
  onConfirmDelete: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
}) {
  const [appear] = useState(() => new Animated.Value(0));
  const listName = mode === 'closet' ? 'Closet' : 'Wishlist';
  const detail = item.price && item.source ? `${item.price} · ${item.source}` : undefined;

  useEffect(() => {
    Animated.timing(appear, {
      duration: 200,
      easing: Easing.out(Easing.quad),
      isInteraction: false,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [appear]);

  const sheetTranslate = appear.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.overlayBackdrop, { opacity: appear }]}>
        <Pressable accessibilityLabel="Close item options" style={styles.overlayBackdropPress} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { opacity: appear, transform: [{ translateY: sheetTranslate }] }]}>
        {!isConfirmingDelete ? (
          <>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetThumb}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.sheetThumbImage} resizeMode="contain" />
                ) : (
                  <ClosetIcon category={item.category} color={item.color ?? '#C2B49E'} accent={item.accent ?? closetTheme.camel} size={34} />
                )}
              </View>
              <View style={styles.sheetHeaderText}>
                <Text numberOfLines={2} style={styles.sheetTitle}>{item.name}</Text>
                <Text numberOfLines={1} style={styles.sheetMeta}>
                  {categoryLabel(item.category)}
                  {detail ? ` · ${detail}` : ''}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel={`Edit ${item.name}`}
              style={({ pressed }) => [styles.sheetEdit, pressed && styles.buttonPressed]}
              onPress={onEdit}>
              <Text style={styles.sheetEditText}>Edit details</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Delete ${item.name}`}
              style={({ pressed }) => [styles.sheetAction, pressed && styles.sheetActionPressed]}
              onPress={onRequestDelete}>
              <Text style={styles.sheetActionDangerText}>Delete from {listName}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.sheetCancel, pressed && styles.buttonPressed]}
              onPress={onClose}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.confirmTitle}>Delete “{item.name}”?</Text>
            <Text style={styles.confirmBody}>
              It will be removed from your {listName.toLowerCase()} everywhere, including saved outfits. This can&apos;t be undone.
            </Text>
            {deleteError !== '' && <Text style={styles.confirmError}>{deleteError}</Text>}
            <View style={styles.confirmButtons}>
              <Pressable
                disabled={isDeleting}
                style={({ pressed }) => [styles.confirmCancel, pressed && styles.buttonPressed, isDeleting && styles.buttonDisabled]}
                onPress={onClose}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Confirm deleting ${item.name}`}
                disabled={isDeleting}
                style={({ pressed }) => [styles.confirmDelete, pressed && styles.buttonPressed, isDeleting && styles.buttonDisabled]}
                onPress={onConfirmDelete}>
                {isDeleting && <ActivityIndicator color={closetTheme.cream} size="small" />}
                <Text style={styles.confirmDeleteText}>{isDeleting ? 'Deleting' : 'Delete'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

function categoryLabel(category: CategoryId) {
  const labels: Record<CategoryId, string> = {
    shirt: 'Shirt',
    dress: 'Dress',
    shorts: 'Shorts',
    pants: 'Pants',
  };

  return labels[category];
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
  // An explicit fit chosen on the add/edit form always wins; keyword
  // inference remains the fallback for older items.
  if (item.fit) {
    return item.fit;
  }

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

function PixelFilterIcon() {
  return (
    <View style={styles.pixelFilterIcon}>
      <View style={[styles.pixelFilterLine, styles.pixelFilterLineTop]} />
      <View style={[styles.pixelFilterLine, styles.pixelFilterLineMiddle]} />
      <View style={[styles.pixelFilterLine, styles.pixelFilterLineBottom]} />
      <View style={[styles.pixelFilterKnob, styles.pixelFilterKnobTop]} />
      <View style={[styles.pixelFilterKnob, styles.pixelFilterKnobMiddle]} />
      <View style={[styles.pixelFilterKnob, styles.pixelFilterKnobBottom]} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#D8AA70',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    transform: [{ translateX: -10 }],
  },
  scrim: {
    backgroundColor: 'rgba(247,239,226,0.48)',
    flex: 1,
    position: 'relative',
  },
  screenTitle: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '900',
    marginHorizontal: 22,
    marginTop: 112,
    transform: [{ translateY: -48 }],
  },
  raisedContent: {
    transform: [{ translateY: -50 }],
  },
  toggle: {
    backgroundColor: '#F6E4B7',
    borderColor: '#7A4328',
    borderRadius: 18,
    borderWidth: 2,
    flex: 1,
    flexDirection: 'row',
    padding: 3,
  },
  topControls: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 22,
    marginTop: 16,
  },
  tryOnButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3D7',
    borderColor: '#7A4328',
    borderRadius: 16,
    borderWidth: 2,
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
  floatingTryOnButton: {
    bottom: 34,
    position: 'absolute',
    right: 24,
    zIndex: 80,
  },
  floatingTryOnText: {
    fontFamily: closetTypography.regularFont,
    fontWeight: '400',
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: '#FFF3D7',
    borderColor: '#7A4328',
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 9,
    width: 48,
  },
  filterButtonOpen: {
    backgroundColor: '#F6E4B7',
    borderColor: '#7A4328',
  },
  pixelFilterIcon: {
    height: 24,
    position: 'relative',
    width: 26,
  },
  pixelFilterLine: {
    backgroundColor: '#7A4328',
    height: 3,
    left: 1,
    position: 'absolute',
    width: 24,
  },
  pixelFilterLineTop: {
    top: 3,
  },
  pixelFilterLineMiddle: {
    top: 11,
  },
  pixelFilterLineBottom: {
    top: 19,
  },
  pixelFilterKnob: {
    backgroundColor: '#7A4328',
    height: 7,
    position: 'absolute',
    width: 7,
  },
  pixelFilterKnobTop: {
    left: 14,
    top: 1,
  },
  pixelFilterKnobMiddle: {
    left: 5,
    top: 9,
  },
  pixelFilterKnobBottom: {
    left: 17,
    top: 17,
  },
  tryOnText: {
    color: '#7A4328',
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
    color: '#7A4328',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  filterChips: {
    gap: 6,
  },
  filterChip: {
    backgroundColor: '#FFF3D7',
    borderColor: '#7A4328',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterChipSelected: {
    backgroundColor: '#7A4328',
    borderColor: '#7A4328',
  },
  filterChipText: {
    color: '#7A4328',
    fontSize: 11,
    fontWeight: '900',
  },
  filterChipTextSelected: {
    color: '#FFF3D7',
  },
  toggleButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    paddingVertical: 10,
  },
  toggleButtonSelected: {
    backgroundColor: '#7A4328',
  },
  toggleText: {
    color: '#7A4328',
    fontFamily: closetTypography.regularFont,
    fontSize: 13,
    fontWeight: '400',
  },
  toggleTextSelected: {
    color: '#FFF3D7',
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
    // Never let the row shrink when the filter panel is open — shrinking
    // clips the chips mid-height instead of giving the grid less room.
    flexShrink: 0,
    height: 50,
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#FFF3D7',
    borderColor: '#7A4328',
    borderRadius: 16,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  chipSelected: {
    backgroundColor: '#7A4328',
    borderColor: '#7A4328',
  },
  chipText: {
    color: '#7A4328',
    fontFamily: closetTypography.regularFont,
    fontSize: 12,
    fontWeight: '400',
  },
  chipTextSelected: {
    color: '#FFF3D7',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 22,
    paddingBottom: 120,
    paddingTop: 8,
    rowGap: 14,
  },
  cardWrap: {
    width: '47%',
  },
  emptyText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  filteredEmptyText: {
    color: '#A8A8A8',
    fontFamily: closetTypography.regularFont,
    fontWeight: '400',
  },
  emptyState: {
    alignItems: 'center',
    gap: 14,
    justifyContent: 'center',
    minHeight: 220,
    width: '100%',
  },
  addFab: {
    alignItems: 'center',
    backgroundColor: '#F6E4B7',
    borderColor: '#774530',
    borderRadius: 0,
    borderWidth: 4,
    bottom: 92,
    elevation: 8,
    height: 46,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    shadowColor: '#774530',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.48,
    shadowRadius: 0,
    width: 46,
    zIndex: 80,
  },
  addFabHighlight: {
    backgroundColor: '#FFFCED',
    height: 4,
    left: 8,
    position: 'absolute',
    right: 12,
    top: 8,
  },
  addFabLeftHighlight: {
    backgroundColor: '#FFFCED',
    bottom: 16,
    left: 8,
    position: 'absolute',
    top: 8,
    width: 4,
  },
  addFabBottomShade: {
    backgroundColor: 'rgba(119,69,48,0.28)',
    bottom: 4,
    height: 4,
    left: 8,
    position: 'absolute',
    right: 4,
  },
  addFabRightShade: {
    backgroundColor: 'rgba(119,69,48,0.28)',
    bottom: 4,
    position: 'absolute',
    right: 4,
    top: 8,
    width: 4,
  },
  addPlus: {
    height: 20,
    position: 'relative',
    width: 20,
  },
  addPlusOutlineHorizontal: {
    backgroundColor: '#4B2A1E',
    height: 6,
    left: 0,
    position: 'absolute',
    top: 7,
    width: 20,
  },
  addPlusOutlineVertical: {
    backgroundColor: '#4B2A1E',
    height: 20,
    left: 7,
    position: 'absolute',
    top: 0,
    width: 6,
  },
  buttonPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.96 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  clearFiltersButton: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  clearFiltersText: {
    color: closetTheme.camelDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 200,
  },
  overlayBackdrop: {
    backgroundColor: 'rgba(16,35,59,0.4)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  overlayBackdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 22,
    borderWidth: 1,
    bottom: 118,
    elevation: 16,
    left: 22,
    padding: 16,
    position: 'absolute',
    right: 22,
    shadowColor: closetTheme.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  sheetThumb: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderColor: closetTheme.line,
    borderRadius: 13,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 52,
  },
  sheetThumbImage: {
    height: 44,
    width: 44,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
  sheetMeta: {
    color: closetTheme.muted,
    fontSize: 12,
    marginTop: 3,
  },
  sheetEdit: {
    alignItems: 'center',
    backgroundColor: '#7A4328',
    borderRadius: 16,
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 44,
  },
  sheetEditText: {
    color: closetTheme.cream,
    fontSize: 13,
    fontWeight: '900',
  },
  sheetAction: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.danger,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  sheetActionPressed: {
    backgroundColor: 'rgba(210,69,49,0.08)',
    opacity: 0.9,
  },
  sheetActionDangerText: {
    color: closetTheme.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  sheetCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 44,
  },
  sheetCancelText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  confirmTitle: {
    color: closetTheme.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  confirmBody: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
  },
  confirmError: {
    color: closetTheme.danger,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 10,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  confirmCancel: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmCancelText: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  confirmDelete: {
    alignItems: 'center',
    backgroundColor: closetTheme.danger,
    borderRadius: 16,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmDeleteText: {
    color: closetTheme.cream,
    fontSize: 13,
    fontWeight: '900',
  },
});
