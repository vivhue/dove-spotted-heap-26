import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryId, SavedTrip, ScreenId, WardrobeItem } from '@/models/closet';
import { useClosetStore } from '@/stores/closet-store';
import { closetTheme, closetTypography } from '@/views/components/closet-theme';
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
const tripDestinations = [
  'Singapore',
  'Vietnam',
  'Bangkok, Thailand',
  'Seoul, South Korea',
  'Tokyo, Japan',
  'Bali, Indonesia',
  'Paris, France',
  'London, United Kingdom',
  'New York, United States',
  'Melbourne, Australia',
  'Hong Kong',
  'Taipei, Taiwan',
];
const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const tripReminderKey = 'bove-closet-trip-reminder';

export function TripPlannerScreen({
  onNavigate,
  onTripSaved,
}: {
  onNavigate: (screen: ScreenId) => void;
  onTripSaved: (trip: SavedTrip) => void;
}) {
  const { closetItems, currentUser } = useClosetStore();
  const planeFloat = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState<TripStep>('destination');
  const [destination, setDestination] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [destinationSuggestionsOpen, setDestinationSuggestionsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(2026, 6, 1));
  const [tripStartDate, setTripStartDate] = useState<Date | null>(null);
  const [tripEndDate, setTripEndDate] = useState<Date | null>(null);
  const [luggageType, setLuggageType] = useState<LuggageType>('Carry on');
  const [activities, setActivities] = useState('');
  const [resultsTab, setResultsTab] = useState<ResultsTab>('packing');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreparedToast, setShowPreparedToast] = useState(false);
  const [packingItems, setPackingItems] = useState<WardrobeItem[]>([]);
  const [suggestedItems, setSuggestedItems] = useState<WardrobeItem[]>([]);
  const [looks, setLooks] = useState<TripLook[]>([]);
  const [addedLookIds, setAddedLookIds] = useState<string[]>([]);
  const tripTitle = destination.trim() || 'Your trip';
  const tripDates = dateRange.trim() || 'Dates not set';
  const progressWidth = isGenerating ? '74%' : '100%';
  const packedCategories = useMemo(() => countByCategory(packingItems), [packingItems]);
  const destinationSuggestions = useMemo(() => {
    const query = destination.trim().toLowerCase();

    return tripDestinations.filter((place) => !query || place.toLowerCase().includes(query));
  }, [destination]);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

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

  useEffect(() => {
    if (!showPreparedToast) {
      return;
    }

    const timer = setTimeout(() => setShowPreparedToast(false), 5000);

    return () => clearTimeout(timer);
  }, [showPreparedToast]);

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
    clearTripReminder();
    onNavigate('account');
  }

  function nextFromActivities() {
    setStep('results');
    setIsGenerating(true);
    setShowPreparedToast(false);
    saveTripReminder();
    const mustHaveItems = packingItems;
    const generated = generateTripPlan(closetItems, activities, luggageType, mustHaveItems, currentUser?.gender);

    setSuggestedItems([]);
    setLooks([]);
    setTimeout(() => {
      setPackingItems(mustHaveItems);
      setSuggestedItems(uniqueItems([...generated.packingItems, ...generated.suggestedItems]).filter(
        (item) => !mustHaveItems.some((packed) => packed.id === item.id)
      ));
      setLooks(generated.looks);
      setAddedLookIds([]);
      saveTripSnapshot(mustHaveItems, [], generated.looks);
      setIsGenerating(false);
      setShowPreparedToast(true);
    }, 850);
  }

  function saveTripSnapshot(nextPackingItems: WardrobeItem[], nextAddedLookIds: string[], planLooks = looks) {
    onTripSaved({
      dateRange: tripDates,
      id: `${tripTitle}-${tripDates}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      looks: planLooks
        .filter((look) => nextAddedLookIds.includes(look.id))
        .map((look) => ({
          id: look.id,
          itemIds: look.items.map((item) => item.id),
          title: look.title,
        })),
      packedItems: nextPackingItems,
      title: tripTitle,
    });
  }

  function addSuggestedItem(item: WardrobeItem) {
    setPackingItems((currentItems) => {
      const nextItems = [item, ...currentItems.filter((current) => current.id !== item.id)];

      saveTripSnapshot(nextItems, addedLookIds);

      return nextItems;
    });
    setSuggestedItems((currentItems) => currentItems.filter((current) => current.id !== item.id));
  }

  function removePackingItem(item: WardrobeItem) {
    setPackingItems((currentItems) => {
      const nextItems = currentItems.filter((current) => current.id !== item.id);

      saveTripSnapshot(nextItems, addedLookIds);

      return nextItems;
    });
    setSuggestedItems((currentItems) => [item, ...currentItems.filter((current) => current.id !== item.id)]);
  }

  function toggleLook(look: TripLook) {
    const added = addedLookIds.includes(look.id);

    if (added) {
      const nextLookIds = addedLookIds.filter((id) => id !== look.id);
      const remainingLookItemIds = looks
        .filter((currentLook) => nextLookIds.includes(currentLook.id))
        .flatMap((currentLook) => currentLook.items.map((item) => item.id));

      setAddedLookIds(nextLookIds);
      setPackingItems((currentItems) => {
        const nextItems = currentItems.filter((item) => {
          const belongsToRemovedLook = look.items.some((lookItem) => lookItem.id === item.id);

          return !belongsToRemovedLook || remainingLookItemIds.includes(item.id);
        });

        saveTripSnapshot(nextItems, nextLookIds);

        return nextItems;
      });
      return;
    }

    const nextLookIds = [...addedLookIds, look.id];

    setAddedLookIds(nextLookIds);
    setPackingItems((currentItems) => {
      const nextItems = [
        ...look.items.filter((item) => !currentItems.some((current) => current.id === item.id)),
        ...currentItems,
      ];

      saveTripSnapshot(nextItems, nextLookIds);

      return nextItems;
    });
  }

  function chooseDestination(place: string) {
    setDestination(place);
    setDestinationSuggestionsOpen(false);
  }

  function chooseTripDate(date: Date) {
    if (!tripStartDate || tripEndDate || date < tripStartDate) {
      setTripStartDate(date);
      setTripEndDate(null);
      setDateRange(formatTripDate(date));
      return;
    }

    setTripEndDate(date);
    setDateRange(`${formatTripDate(tripStartDate)} - ${formatTripDate(date)}`);
    setCalendarOpen(false);
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
              onChangeText={(text) => {
                setDestination(text);
                setDestinationSuggestionsOpen(true);
                setCalendarOpen(false);
              }}
              onFocus={() => {
                setDestinationSuggestionsOpen(true);
                setCalendarOpen(false);
              }}
              placeholder="Search by city, postal code, or landmark"
              placeholderTextColor={closetTheme.muted}
              style={styles.tripInput}
              value={destination}
            />
            <LineIcon name="⌕" color={closetTheme.muted} />
          </View>
          {destinationSuggestionsOpen && destinationSuggestions.length > 0 && (
            <ScrollView style={styles.destinationDropdown} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {destinationSuggestions.map((place) => (
                <Pressable key={place} style={styles.destinationOption} onPress={() => chooseDestination(place)}>
                  <Text style={styles.destinationOptionText}>{place}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <View style={styles.inputDivider} />
          <Pressable
            style={styles.inputRow}
            onPress={() => {
              setCalendarOpen((isOpen) => !isOpen);
              setDestinationSuggestionsOpen(false);
            }}>
            <Text style={[styles.dateValue, !dateRange && styles.datePlaceholder]}>{dateRange || 'Select date'}</Text>
            <LineIcon name="□" color={closetTheme.muted} />
          </Pressable>
        </View>

        {calendarOpen && (
          <ScrollView style={styles.calendarCard} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View style={styles.calendarHeader}>
              <Pressable style={styles.calendarNavButton} onPress={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}>
                <LineIcon name="‹" color={closetTheme.ink} />
              </Pressable>
              <Text style={styles.calendarMonthText}>{formatCalendarMonth(calendarMonth)}</Text>
              <Pressable style={styles.calendarNavButton} onPress={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}>
                <LineIcon name="›" color={closetTheme.ink} />
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {weekdays.map((weekday, index) => (
                <Text key={`${weekday}-${index}`} style={styles.calendarWeekday}>{weekday}</Text>
              ))}
              {calendarDays.map((day) => {
                const selected = isSameCalendarDate(day.date, tripStartDate) || isSameCalendarDate(day.date, tripEndDate);
                const inRange = isDateInRange(day.date, tripStartDate, tripEndDate);

                return (
                  <Pressable
                    key={day.key}
                    style={[
                      styles.calendarDay,
                      !day.inCurrentMonth && styles.calendarDayMuted,
                      inRange && styles.calendarDayInRange,
                      selected && styles.calendarDaySelected,
                    ]}
                    onPress={() => chooseTripDate(day.date)}>
                    <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>{day.date.getDate()}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.calendarHint}>{tripStartDate && !tripEndDate ? 'Select an end date' : 'Select start and end dates'}</Text>
          </ScrollView>
        )}

        <Pressable style={styles.addDestination}>
          <LineIcon name="+" color={closetTheme.ink} />
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
        <Text style={styles.subtitle}>Choose what type of luggage you're bringing and Bove will adapt to your space</Text>

        <View style={styles.optionList}>
          {(['Carry on', 'Checked bag', 'Carry on + Checked bag'] as LuggageType[]).map((option) => {
            const selected = option === luggageType;

            return (
              <Pressable key={option} style={styles.optionRow} onPress={() => setLuggageType(option)}>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <LineIcon name="✓" color={closetTheme.cream} />}
                </View>
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Packing list</Text>
        <Text style={styles.subtitle}>Select must-have items for your trip. Bove will suggest the rest.</Text>
        <Pressable
          style={styles.blackPill}
          onPress={() => {
            const mustHaves = closetItems.slice(0, 3);
            setPackingItems(mustHaves);
          }}>
          <LineIcon name="+" color={closetTheme.cream} />
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
          <LineIcon name="‹" color={closetTheme.ink} />
        </Pressable>
        <View style={styles.resultActions}>
          <Pressable accessibilityLabel="Back to profile" style={styles.resultActionButton} onPress={closePlanner}>
            <LineIcon name="→" color={closetTheme.ink} />
          </Pressable>
        </View>
      </View>

      {showPreparedToast && !isGenerating ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Bove has prepared your packing list. Take a look below.</Text>
        </View>
      ) : null}

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
                <LineIcon name="+" color={closetTheme.cream} />
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
              const added = addedLookIds.includes(look.id);

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
  mustHaveItems: WardrobeItem[],
  gender?: 'female' | 'male'
) {
  const maxItems = luggageType === 'Carry on' ? 5 : luggageType === 'Checked bag' ? 8 : 10;
  const rankedItems = [...items].sort((left, right) => scoreTripItem(right, activities, gender) - scoreTripItem(left, activities, gender));
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

function scoreTripItem(item: WardrobeItem, activities: string, gender?: 'female' | 'male') {
  const text = [item.name, item.category, item.subcategory, item.primaryColor, item.pattern, ...(item.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const activityText = activities.toLowerCase();
  let score = 0;

  if (item.category === 'shirt' || item.category === 'pants' || item.category === 'shorts') score += 6;
  if (item.category === 'dress') score += 5;
  if (gender === 'male' && hasAny(text, ['shirt', 'tee', 'polo', 'trouser', 'pants', 'jeans', 'loafer', 'sneaker', 'jacket'])) score += 5;
  if (gender === 'female' && hasAny(text, ['blouse', 'top', 'skirt', 'dress', 'camisole', 'wide leg', 'heels', 'flats', 'bag'])) score += 5;
  if (activityText.includes('beach') && hasAny(text, ['linen', 'short', 'sandal', 'tank', 'skirt'])) score += 10;
  if (activityText.includes('hike') && hasAny(text, ['sneaker', 'boot', 'jacket', 'pants'])) score += 10;
  if (activityText.includes('dinner') && hasAny(text, ['dress', 'shirt', 'black', 'silk', 'loafer', 'boot'])) score += 10;
  if (activityText.includes('work') && hasAny(text, ['blazer', 'shirt', 'trouser', 'loafer'])) score += 10;

  return score;
}

function saveTripReminder() {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    globalThis.localStorage.setItem(tripReminderKey, '1');
  }
}

function clearTripReminder() {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    globalThis.localStorage.removeItem(tripReminderKey);
  }
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
    dress: 'Dresses',
    pants: 'Pants',
    shirt: 'Shirts',
    shorts: 'Shorts',
  };

  return labels[category];
}

function estimateTripDays(dateRange: string) {
  const [startText, endText] = dateRange.split(' - ');

  if (!startText || !endText) {
    return 3;
  }

  const startDate = new Date(startText);
  const endDate = new Date(endText);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return 3;
  }

  const dayMs = 24 * 60 * 60 * 1000;

  return Math.round((endDate.getTime() - startDate.getTime()) / dayMs) + 1;
}

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - startOffset + 1;
    let date: Date;

    if (dayNumber < 1) {
      date = new Date(year, month - 1, daysInPreviousMonth + dayNumber);
    } else if (dayNumber > daysInMonth) {
      date = new Date(year, month + 1, dayNumber - daysInMonth);
    } else {
      date = new Date(year, month, dayNumber);
    }

    return {
      date,
      inCurrentMonth: date.getMonth() === month,
      key: date.toISOString(),
    };
  });
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatCalendarMonth(date: Date) {
  return date.toLocaleString('en', { month: 'long', year: 'numeric' });
}

function formatTripDate(date: Date) {
  return date.toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isSameCalendarDate(left: Date, right: Date | null) {
  return Boolean(
    right &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
  );
}

function isDateInRange(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) {
    return false;
  }

  return date > start && date < end;
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: closetTheme.cream,
    flex: 1,
  },
  resultsSafe: {
    backgroundColor: closetTheme.cream,
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
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderWidth: 1,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    shadowColor: closetTheme.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: 56,
  },
  circlePlaceholder: {
    height: 56,
    width: 56,
  },
  stepLabel: {
    color: closetTheme.muted,
    fontSize: 24,
    fontWeight: '900',
  },
  shellContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    color: closetTheme.ink,
    ...closetTypography.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 28,
    textAlign: 'center',
  },
  subtitle: {
    color: closetTheme.ink,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 18,
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
    height: 150,
    justifyContent: 'center',
  },
  plane: {
    color: closetTheme.camel,
    fontSize: 82,
    opacity: 0.44,
  },
  planeTrail: {
    backgroundColor: closetTheme.line,
    height: 2,
    opacity: 0.3,
    position: 'absolute',
    transform: [{ rotate: '12deg' }],
    width: 190,
  },
  formBlock: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 18,
  },
  inputDivider: {
    backgroundColor: closetTheme.line,
    height: 1,
  },
  tripInput: {
    color: closetTheme.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 52,
  },
  destinationDropdown: {
    backgroundColor: closetTheme.cream,
    borderTopColor: closetTheme.line,
    borderTopWidth: 1,
    maxHeight: 126,
  },
  destinationOption: {
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  destinationOptionText: {
    color: closetTheme.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  dateValue: {
    color: closetTheme.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  datePlaceholder: {
    color: closetTheme.muted,
    fontWeight: '800',
  },
  calendarCard: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    maxHeight: 230,
    padding: 12,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarNavButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  calendarMonthText: {
    color: closetTheme.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarWeekday: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
    width: '14.285%',
  },
  calendarDay: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginVertical: 1,
    width: '14.285%',
  },
  calendarDayMuted: {
    opacity: 0.34,
  },
  calendarDayInRange: {
    backgroundColor: closetTheme.creamDeep,
  },
  calendarDaySelected: {
    backgroundColor: closetTheme.ink,
  },
  calendarDayText: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  calendarDayTextSelected: {
    color: closetTheme.cream,
  },
  calendarHint: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  addDestination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 18,
  },
  addDestinationText: {
    color: closetTheme.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  footerButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 28,
    bottom: 18,
    height: 52,
    justifyContent: 'center',
    left: 20,
    position: 'absolute',
    right: 20,
  },
  footerButtonDisabled: {
    backgroundColor: closetTheme.muted,
  },
  footerButtonText: {
    color: closetTheme.cream,
    fontSize: 18,
    fontWeight: '900',
  },
  optionList: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 26,
    overflow: 'hidden',
  },
  optionRow: {
    alignItems: 'center',
    borderBottomColor: closetTheme.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 58,
    paddingHorizontal: 18,
  },
  radio: {
    alignItems: 'center',
    borderColor: closetTheme.line,
    borderRadius: 13,
    borderWidth: 2,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  radioSelected: {
    backgroundColor: closetTheme.ink,
    borderColor: closetTheme.ink,
  },
  optionText: {
    color: closetTheme.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  sectionTitle: {
    color: closetTheme.ink,
    ...closetTypography.text,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 30,
    textAlign: 'center',
  },
  blackPill: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  blackPillText: {
    color: closetTheme.cream,
    fontSize: 16,
    fontWeight: '900',
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
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderWidth: 1,
    borderRadius: 28,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    shadowColor: closetTheme.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: 72,
  },
  resultActionButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  toast: {
    backgroundColor: closetTheme.ink,
    borderRadius: 24,
    left: 20,
    paddingHorizontal: 26,
    paddingVertical: 16,
    position: 'absolute',
    right: 20,
    top: 96,
    zIndex: 3,
  },
  toastText: {
    color: closetTheme.cream,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 24,
  },
  tripHeader: {
    backgroundColor: closetTheme.creamDeep,
    borderBottomColor: closetTheme.line,
    borderBottomWidth: 1,
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tripTitle: {
    color: closetTheme.ink,
    ...closetTypography.text,
    fontSize: 26,
    fontWeight: '700',
  },
  tripDates: {
    color: closetTheme.muted,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  progressTrack: {
    backgroundColor: closetTheme.line,
    height: 8,
    marginTop: 24,
  },
  progressFill: {
    backgroundColor: closetTheme.camel,
    height: 8,
  },
  generatingText: {
    color: closetTheme.muted,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 14,
    textAlign: 'center',
  },
  resultsTabs: {
    alignItems: 'center',
    backgroundColor: closetTheme.cream,
    borderBottomColor: closetTheme.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resultsTabText: {
    color: closetTheme.muted,
    fontSize: 18,
    fontWeight: '900',
    minWidth: 130,
    paddingBottom: 12,
    paddingTop: 14,
    textAlign: 'center',
  },
  resultsTabSelected: {
    borderBottomColor: closetTheme.ink,
    borderBottomWidth: 3,
    color: closetTheme.ink,
  },
  countText: {
    color: closetTheme.muted,
  },
  resultsContent: {
    paddingBottom: 34,
  },
  blackWideButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 28,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginTop: 52,
    minHeight: 58,
    width: '92%',
  },
  blackWideText: {
    color: closetTheme.cream,
    fontSize: 17,
    fontWeight: '900',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 20,
  },
  categoryChip: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  categoryChipText: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '900',
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
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderWidth: 1,
    height: 156,
    justifyContent: 'center',
    position: 'relative',
  },
  tripItemImage: {
    height: 136,
    width: '88%',
  },
  itemAction: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
    width: 34,
  },
  tripItemName: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '800',
    marginHorizontal: 14,
    marginTop: 12,
  },
  tripItemMeta: {
    color: closetTheme.muted,
    fontSize: 13,
    marginHorizontal: 14,
    marginTop: 4,
  },
  suggestedTitle: {
    color: closetTheme.ink,
    ...closetTypography.text,
    fontSize: 23,
    fontWeight: '700',
    marginHorizontal: 20,
    marginTop: 42,
    marginBottom: 18,
  },
  looksList: {
    gap: 14,
    padding: 20,
  },
  lookCard: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  lookHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lookTitle: {
    color: closetTheme.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  lookToggle: {
    backgroundColor: closetTheme.ink,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  lookToggleAdded: {
    backgroundColor: closetTheme.creamDeep,
  },
  lookToggleText: {
    color: closetTheme.cream,
    fontSize: 12,
    fontWeight: '900',
  },
  lookToggleTextAdded: {
    color: closetTheme.ink,
  },
  lookItems: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  lookItemMini: {
    alignItems: 'center',
    backgroundColor: closetTheme.cream,
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
