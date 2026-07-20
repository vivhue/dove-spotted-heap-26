import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryId, ScreenId, WardrobeItem } from '@/models/closet';
import { useClosetStore } from '@/stores/closet-store';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';

type TripStep = 'destination' | 'bag' | 'activities' | 'results';
type LuggageType = 'Carry on' | 'Checked bag' | 'Carry on + Checked bag';
type ResultsTab = 'packing' | 'looks';

type TripLook = {
  id: string;
  items: WardrobeItem[];
  title: string;
};

const categoryOrder: CategoryId[] = ['shirt', 'dress', 'shorts', 'pants'];

export function TripPlannerScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { closetItems } = useClosetStore();
  const planeFloat = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState<TripStep>('destination');
  const [destination, setDestination] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [luggageType, setLuggageType] = useState<LuggageType>('Carry on');
  const [activities, setActivities] = useState('');
  const [resultsTab, setResultsTab] = useState<ResultsTab>('packing');
  const [isGenerating, setIsGenerating] = useState(false);
  const [packingItems, setPackingItems] = useState<WardrobeItem[]>([]);
  const [suggestedItems, setSuggestedItems] = useState<WardrobeItem[]>([]);
  const [looks, setLooks] = useState<TripLook[]>([]);
  const tripTitle = destination.trim() || 'Your trip';
  const tripDates = dateRange.trim() || 'Dates not set';
  const progressWidth = isGenerating ? '74%' : '100%';
  const packedCategories = useMemo(() => countByCategory(packingItems), [packingItems]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(planeFloat, {
          duration: 1250,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(planeFloat, {
          duration: 1250,
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [planeFloat]);

  function goBack() {
    if (step === 'destination') {
      onNavigate('account');
      return;
    }

    if (step === 'bag') setStep('destination');
    if (step === 'activities') setStep('bag');
    if (step === 'results') setStep('activities');
  }

  function closePlanner() {
    onNavigate('account');
  }

  function nextFromActivities() {
    setStep('results');
    setIsGenerating(true);
    const generated = generateTripPlan(closetItems, activities, luggageType, packingItems);

    setSuggestedItems([]);
    setLooks([]);
    setTimeout(() => {
      setPackingItems(generated.packingItems);
      setSuggestedItems(generated.suggestedItems);
      setLooks(generated.looks);
      setIsGenerating(false);
    }, 850);
  }

  function addSuggestedItem(item: WardrobeItem) {
    setPackingItems((currentItems) => [item, ...currentItems.filter((current) => current.id !== item.id)]);
    setSuggestedItems((currentItems) => currentItems.filter((current) => current.id !== item.id));
  }

  function removePackingItem(item: WardrobeItem) {
    setPackingItems((currentItems) => currentItems.filter((current) => current.id !== item.id));
    setSuggestedItems((currentItems) => [item, ...currentItems.filter((current) => current.id !== item.id)]);
  }

  function toggleLook(look: TripLook) {
    const allPacked = look.items.every((item) => packingItems.some((packed) => packed.id === item.id));

    if (allPacked) {
      setPackingItems((currentItems) =>
        currentItems.filter((item) => !look.items.some((lookItem) => lookItem.id === item.id))
      );
      return;
    }

    setPackingItems((currentItems) => [
      ...look.items.filter((item) => !currentItems.some((current) => current.id === item.id)),
      ...currentItems,
    ]);
  }

  if (step === 'destination') {
    return (
      <TripShell onBack={goBack} stepLabel="I">
        <Text style={styles.title}>Your next trip</Text>
        <Text style={styles.subtitle}>Pick your destination and set the start and end dates of your journey</Text>
        <Animated.View
          style={[
            styles.planeStage,
            {
              transform: [
                { translateY: planeFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
                { rotate: '-12deg' },
              ],
            },
          ]}>
          <Text style={styles.plane}>✈</Text>
          <View style={styles.planeTrail} />
        </Animated.View>

        <View style={styles.formBlock}>
          <View style={styles.inputRow}>
            <TextInput
              autoCapitalize="words"
              onChangeText={setDestination}
              placeholder="Search by city, postal code, or landmark"
              placeholderTextColor="#9D9D9D"
              style={styles.tripInput}
              value={destination}
            />
            <LineIcon name="⌕" color="#888888" />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <TextInput
              onChangeText={setDateRange}
              placeholder="Select date"
              placeholderTextColor="#9D9D9D"
              style={styles.tripInput}
              value={dateRange}
            />
            <LineIcon name="□" color="#888888" />
          </View>
        </View>

        <Pressable style={styles.addDestination}>
          <LineIcon name="+" color="#000000" />
          <Text style={styles.addDestinationText}>Add another destination</Text>
        </Pressable>

        <FooterButton disabled={!destination.trim()} label="Next" onPress={() => setStep('bag')} />
      </TripShell>
    );
  }

  if (step === 'bag') {
    return (
      <TripShell onBack={goBack} onClose={closePlanner} stepLabel="II">
        <Text style={styles.title}>Pack your bag</Text>
        <Text style={styles.mutedSubtitle}>Choose what type of luggage you're bringing and Bove will adapt to your space</Text>

        <View style={styles.optionList}>
          {(['Carry on', 'Checked bag', 'Carry on + Checked bag'] as LuggageType[]).map((option) => {
            const selected = option === luggageType;

            return (
              <Pressable key={option} style={styles.optionRow} onPress={() => setLuggageType(option)}>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <LineIcon name="✓" color="#FFFFFF" />}
                </View>
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Packing list</Text>
        <Text style={styles.mutedSubtitle}>Select must-have items for your trip. Bove will suggest the rest.</Text>
        <Pressable
          style={styles.blackPill}
          onPress={() => {
            const mustHaves = closetItems.slice(0, 3);
            setPackingItems(mustHaves);
          }}>
          <LineIcon name="+" color="#FFFFFF" />
          <Text style={styles.blackPillText}>Add from closet</Text>
        </Pressable>

        <FooterButton label="Next" onPress={() => setStep('activities')} />
      </TripShell>
    );
  }

  if (step === 'activities') {
    return (
      <TripShell onBack={goBack} onClose={closePlanner} stepLabel="III">
        <Text style={styles.title}>Add activities</Text>
        <Text style={styles.subtitle}>Pick your activities to get tailored outfit recommendations</Text>
        <Text style={styles.optionalText}>Optional</Text>
        <Animated.View
          style={[
            styles.activityArt,
            {
              transform: [
                { translateY: planeFloat.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) },
              ],
            },
          ]}>
          <Text style={styles.activityIcon}>☀</Text>
          <Text style={styles.activityIconSmall}>▱  ▱  ▱</Text>
        </Animated.View>

        <View style={styles.activityInputWrap}>
          <TextInput
            onChangeText={setActivities}
            placeholder="What activities do you have planned?"
            placeholderTextColor="#9D9D9D"
            style={styles.activityInput}
            value={activities}
          />
        </View>

        <FooterButton label={activities.trim() ? 'Next' : 'Skip'} onPress={nextFromActivities} />
      </TripShell>
    );
  }

  return (
    <SafeAreaView style={styles.resultsSafe}>
      <View style={styles.resultsTop}>
        <Pressable style={styles.circleButton} onPress={goBack}>
          <LineIcon name="‹" color="#000000" />
        </Pressable>
        <View style={styles.resultActions}>
          <LineIcon name="⇧" color="#000000" />
          <LineIcon name="…" color="#000000" />
        </View>
      </View>

      {isGenerating ? null : (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Bove has prepared your packing list. Take a look below.</Text>
        </View>
      )}

      <View style={styles.tripHeader}>
        <Text style={styles.tripTitle}>{tripTitle}</Text>
        <Text style={styles.tripDates}>{tripDates} · {estimateTripDays(dateRange)} days</Text>
        {isGenerating && (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.generatingText}>Bove is generating your packing list, this may take a few seconds...</Text>
          </>
        )}
      </View>

      <View style={styles.resultsTabs}>
        <Pressable onPress={() => setResultsTab('packing')}>
          <Text style={[styles.resultsTabText, resultsTab === 'packing' && styles.resultsTabSelected]}>
            Packing List <Text style={styles.countText}>{packingItems.length}</Text>
          </Text>
        </Pressable>
        <Pressable onPress={() => setResultsTab('looks')}>
          <Text style={[styles.resultsTabText, resultsTab === 'looks' && styles.resultsTabSelected]}>
            Looks <Text style={styles.countText}>{looks.length}</Text>
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.resultsContent}>
        {resultsTab === 'packing' ? (
          <>
            {packingItems.length === 0 && !isGenerating && (
              <Pressable style={styles.blackWideButton} onPress={() => setStep('bag')}>
                <LineIcon name="+" color="#FFFFFF" />
                <Text style={styles.blackWideText}>Add to packing list</Text>
              </Pressable>
            )}
            {packingItems.length > 0 && (
              <>
                <View style={styles.categoryChips}>
                  {Object.entries(packedCategories).map(([category, count]) => (
                    <View key={category} style={styles.categoryChip}>
                      <Text style={styles.categoryChipText}>{category} <Text style={styles.countText}>{count}</Text></Text>
                    </View>
                  ))}
                </View>
                <View style={styles.itemGrid}>
                  {packingItems.map((item) => (
                    <TripItemTile key={item.id} item={item} action="remove" onPress={() => removePackingItem(item)} />
                  ))}
                </View>
              </>
            )}
            {suggestedItems.length > 0 && (
              <>
                <Text style={styles.suggestedTitle}>Suggested items</Text>
                <View style={styles.itemGrid}>
                  {suggestedItems.map((item) => (
                    <TripItemTile key={item.id} item={item} action="add" onPress={() => addSuggestedItem(item)} />
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.looksList}>
            {looks.map((look) => {
              const added = look.items.every((item) => packingItems.some((packed) => packed.id === item.id));

              return (
                <View key={look.id} style={styles.lookCard}>
                  <View style={styles.lookHeader}>
                    <Text style={styles.lookTitle}>{look.title}</Text>
                    <Pressable style={[styles.lookToggle, added && styles.lookToggleAdded]} onPress={() => toggleLook(look)}>
                      <Text style={[styles.lookToggleText, added && styles.lookToggleTextAdded]}>
                        {added ? 'Remove' : 'Add look'}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.lookItems}>
                    {look.items.map((item) => (
                      <View key={item.id} style={styles.lookItemMini}>
                        {item.imageUrl ? (
                          <Image source={{ uri: item.imageUrl }} style={styles.lookMiniImage} resizeMode="contain" />
                        ) : (
                          <ClosetIcon category={item.category} size={34} />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TripShell({
  children,
  onBack,
  onClose,
  stepLabel,
}: {
  children: ReactNode;
  onBack: () => void;
  onClose?: () => void;
  stepLabel: string;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.tripNav}>
        <Pressable style={styles.circleButton} onPress={onBack}>
          <LineIcon name="‹" color="#000000" />
        </Pressable>
        <Text style={styles.stepLabel}>{stepLabel}</Text>
        {onClose ? (
          <Pressable style={styles.circleButton} onPress={onClose}>
            <LineIcon name="×" color="#000000" />
          </Pressable>
        ) : (
          <View style={styles.circlePlaceholder} />
        )}
      </View>
      <View style={styles.shellContent}>{children}</View>
    </SafeAreaView>
  );
}

function FooterButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} style={[styles.footerButton, disabled && styles.footerButtonDisabled]} onPress={onPress}>
      <Text style={styles.footerButtonText}>{label}</Text>
    </Pressable>
  );
}

function TripItemTile({
  action,
  item,
  onPress,
}: {
  action: 'add' | 'remove';
  item: WardrobeItem;
  onPress: () => void;
}) {
  return (
    <View style={styles.tripItem}>
      <View style={styles.tripItemImageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.tripItemImage} resizeMode="contain" />
        ) : (
          <ClosetIcon category={item.category} size={72} />
        )}
        <Pressable style={styles.itemAction} onPress={onPress}>
          <LineIcon name={action === 'add' ? '+' : '−'} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text numberOfLines={1} style={styles.tripItemName}>{item.name}</Text>
      <Text style={styles.tripItemMeta}>{labelForCategory(item.category)}</Text>
    </View>
  );
}

function generateTripPlan(
  items: WardrobeItem[],
  activities: string,
  luggageType: LuggageType,
  mustHaveItems: WardrobeItem[]
) {
  const maxItems = luggageType === 'Carry on' ? 5 : luggageType === 'Checked bag' ? 8 : 10;
  const rankedItems = [...items].sort((left, right) => scoreTripItem(right, activities) - scoreTripItem(left, activities));
  const seedItems = categoryOrder
    .map((category) => rankedItems.find((item) => item.category === category))
    .filter((item): item is WardrobeItem => Boolean(item));
  const packingItems = uniqueItems([...mustHaveItems, ...seedItems]).slice(0, Math.min(maxItems, items.length));
  const suggestedItems = rankedItems
    .filter((item) => !packingItems.some((packed) => packed.id === item.id))
    .slice(0, 6);
  const looks = buildTripLooks(rankedItems);

  return { looks, packingItems, suggestedItems };
}

function buildTripLooks(items: WardrobeItem[]) {
  const lookSeeds = [
    { id: 'travel', title: 'Travel day' },
    { id: 'day', title: 'Day exploring' },
    { id: 'dinner', title: 'Dinner plan' },
  ];

  return lookSeeds
    .map((seed, index) => ({
      ...seed,
      items: uniqueItems([
        pickByCategory(items, 'shirt', index),
        pickByCategory(items, 'pants', index),
        pickByCategory(items, 'shorts', index),
        pickByCategory(items, 'dress', index),
      ]),
    }))
    .filter((look) => look.items.length > 0);
}

function pickByCategory(items: WardrobeItem[], category: CategoryId, offset: number) {
  const categoryItems = items.filter((item) => item.category === category);

  return categoryItems[offset % Math.max(categoryItems.length, 1)];
}

function uniqueItems(items: Array<WardrobeItem | undefined>) {
  const seen = new Set<string>();

  return items.filter((item): item is WardrobeItem => {
    if (!item || seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function scoreTripItem(item: WardrobeItem, activities: string) {
  const text = [item.name, item.category, item.subcategory, item.primaryColor, item.pattern, ...(item.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const activityText = activities.toLowerCase();
  let score = 0;

  if (item.category === 'shirt' || item.category === 'pants') score += 6;
  if (item.category === 'dress' || item.category === 'shorts') score += 5;
  if (activityText.includes('beach') && hasAny(text, ['linen', 'short', 'dress', 'tank'])) score += 10;
  if (activityText.includes('hike') && hasAny(text, ['pants', 'short'])) score += 10;
  if (activityText.includes('dinner') && hasAny(text, ['dress', 'shirt', 'black', 'silk'])) score += 10;
  if (activityText.includes('work') && hasAny(text, ['shirt', 'trouser', 'pants'])) score += 10;

  return score;
}

function countByCategory(items: WardrobeItem[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const label = labelForCategory(item.category);
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});
}

function labelForCategory(category: CategoryId) {
  const labels: Record<CategoryId, string> = {
    shirt: 'Shirt',
    dress: 'Dress',
    shorts: 'Shorts',
    pants: 'Pants',
  };

  return labels[category];
}

function estimateTripDays(dateRange: string) {
  const match = dateRange.match(/\d+/g);

  if (!match || match.length < 2) {
    return 3;
  }

  const startDay = Number(match[0]);
  const endDay = Number(match[1]);

  return Number.isFinite(startDay) && Number.isFinite(endDay) && endDay >= startDay
    ? endDay - startDay + 1
    : 3;
}

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#F3F3F3',
    flex: 1,
  },
  resultsSafe: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  tripNav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 18,
  },
  resultsTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 18,
  },
  circleButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#C8C8D8',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    width: 56,
  },
  circlePlaceholder: {
    height: 56,
    width: 56,
  },
  stepLabel: {
    color: '#777777',
    fontSize: 24,
    fontWeight: '900',
  },
  shellContent: {
    flex: 1,
    paddingHorizontal: 28,
  },
  title: {
    color: '#000000',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 44,
    textAlign: 'center',
  },
  subtitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 30,
    marginTop: 30,
    textAlign: 'center',
  },
  mutedSubtitle: {
    color: '#999999',
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 28,
    marginTop: 22,
    textAlign: 'center',
  },
  planeStage: {
    alignItems: 'center',
    height: 270,
    justifyContent: 'center',
  },
  plane: {
    color: '#BFC1C2',
    fontSize: 118,
    opacity: 0.56,
  },
  planeTrail: {
    backgroundColor: '#D7D9DA',
    height: 2,
    opacity: 0.3,
    position: 'absolute',
    transform: [{ rotate: '12deg' }],
    width: 190,
  },
  formBlock: {
    backgroundColor: '#FFFFFF',
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 22,
  },
  inputDivider: {
    backgroundColor: '#EEEEEE',
    height: 1,
  },
  tripInput: {
    color: '#111111',
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    minHeight: 64,
  },
  addDestination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 42,
  },
  addDestinationText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  footerButton: {
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 28,
    bottom: 26,
    height: 58,
    justifyContent: 'center',
    left: 20,
    position: 'absolute',
    right: 20,
  },
  footerButtonDisabled: {
    backgroundColor: '#838383',
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '500',
  },
  optionList: {
    backgroundColor: '#FFFFFF',
    marginTop: 44,
  },
  optionRow: {
    alignItems: 'center',
    borderBottomColor: '#EEEEEE',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 18,
    minHeight: 74,
    paddingHorizontal: 22,
  },
  radio: {
    alignItems: 'center',
    borderColor: '#D2D2D2',
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  radioSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  optionText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#000000',
    fontSize: 30,
    fontWeight: '700',
    marginTop: 48,
    textAlign: 'center',
  },
  blackPill: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#000000',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 12,
    marginTop: 26,
    paddingHorizontal: 26,
    paddingVertical: 14,
  },
  blackPillText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  optionalText: {
    color: '#9E9E9E',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 32,
    textAlign: 'center',
  },
  activityArt: {
    alignItems: 'center',
    height: 300,
    justifyContent: 'center',
  },
  activityIcon: {
    color: '#BFC1C2',
    fontSize: 96,
    opacity: 0.44,
  },
  activityIconSmall: {
    color: '#BFC1C2',
    fontSize: 30,
    opacity: 0.56,
  },
  activityInputWrap: {
    backgroundColor: '#FFFFFF',
    marginTop: 14,
    paddingHorizontal: 22,
  },
  activityInput: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '500',
    minHeight: 72,
  },
  resultActions: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    flexDirection: 'row',
    gap: 22,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 22,
    shadowColor: '#C8C8D8',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
  },
  toast: {
    backgroundColor: '#2F2F2F',
    borderRadius: 28,
    left: 20,
    paddingHorizontal: 26,
    paddingVertical: 18,
    position: 'absolute',
    right: 20,
    top: 96,
    zIndex: 3,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
  },
  tripHeader: {
    backgroundColor: '#F4F4F4',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  tripTitle: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '800',
  },
  tripDates: {
    color: '#6C6C6C',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  progressTrack: {
    backgroundColor: '#E0E3EA',
    height: 10,
    marginTop: 34,
  },
  progressFill: {
    backgroundColor: '#3047FF',
    height: 10,
  },
  generatingText: {
    color: '#9A9A9A',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    marginTop: 18,
    textAlign: 'center',
  },
  resultsTabs: {
    alignItems: 'center',
    borderBottomColor: '#EEEEEE',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resultsTabText: {
    color: '#777777',
    fontSize: 22,
    fontWeight: '800',
    minWidth: 150,
    paddingBottom: 14,
    paddingTop: 18,
    textAlign: 'center',
  },
  resultsTabSelected: {
    borderBottomColor: '#000000',
    borderBottomWidth: 3,
    color: '#000000',
  },
  countText: {
    color: '#929292',
  },
  resultsContent: {
    paddingBottom: 36,
  },
  blackWideButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#000000',
    borderRadius: 28,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginTop: 52,
    minHeight: 58,
    width: '92%',
  },
  blackWideText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 20,
  },
  categoryChip: {
    backgroundColor: '#F1F1F1',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  categoryChipText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tripItem: {
    width: '50%',
  },
  tripItemImageWrap: {
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    height: 172,
    justifyContent: 'center',
    position: 'relative',
  },
  tripItemImage: {
    height: 150,
    width: '88%',
  },
  itemAction: {
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
    width: 34,
  },
  tripItemName: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '800',
    marginHorizontal: 14,
    marginTop: 12,
  },
  tripItemMeta: {
    color: '#777777',
    fontSize: 14,
    marginHorizontal: 14,
    marginTop: 4,
  },
  suggestedTitle: {
    color: '#000000',
    fontSize: 25,
    fontWeight: '800',
    marginHorizontal: 20,
    marginTop: 42,
    marginBottom: 18,
  },
  looksList: {
    gap: 14,
    padding: 20,
  },
  lookCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
  },
  lookHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lookTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
  },
  lookToggle: {
    backgroundColor: '#000000',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  lookToggleAdded: {
    backgroundColor: '#E2E2E2',
  },
  lookToggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  lookToggleTextAdded: {
    color: '#000000',
  },
  lookItems: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  lookItemMini: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  lookMiniImage: {
    height: 50,
    width: 50,
  },
});
