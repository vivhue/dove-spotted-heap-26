import { useEffect, useMemo, useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenId, WardrobeItem } from '@/models/closet';
import { getCachedWeatherSummary, getCurrentWeather, WeatherSummary } from '@/services/weather-recommendation';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme, closetTypography } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';

type PlannerDay = {
  date: Date;
  day: number;
  inCurrentMonth: boolean;
};

const plannerBackground = require('../../../assets/images/planner-bg.png');
const plannerWeatherLocation = 'Singapore';

export function CalendarScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { closetItems, currentUser, scheduledOutfits, scheduleOutfitForDate, selectedOutfit, setEditingItem } = useClosetStore();
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isOutfitPickerOpen, setIsOutfitPickerOpen] = useState(false);
  const [pickerItemIds, setPickerItemIds] = useState<string[]>([]);
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummary | null>(() => getCachedWeatherSummary(plannerWeatherLocation));
  const plannerDays = useMemo(() => buildPlannerDays(monthDate), [monthDate]);
  const closetItemById = useMemo(() => new Map(closetItems.map((item) => [item.id, item])), [closetItems]);
  const selectedDateKey = formatDateKey(selectedDate);
  const selectedScheduledItems = useMemo(
    () => itemsFromIds(scheduledOutfits[selectedDateKey] ?? [], closetItemById),
    [closetItemById, scheduledOutfits, selectedDateKey]
  );
  const currentOutfitItems = useMemo(
    () => itemsFromIds(Object.values(selectedOutfit).filter((itemId): itemId is string => Boolean(itemId)), closetItemById),
    [closetItemById, selectedOutfit]
  );
  const pickerItems = useMemo(() => itemsFromIds(pickerItemIds, closetItemById), [closetItemById, pickerItemIds]);
  const calendarHelpText =
    closetItems.length > 0
      ? `Tap + to choose clothes for ${formatShortDate(selectedDate)}.`
      : 'Upload clothes first, then schedule what you will wear.';

  useEffect(() => {
    let isActive = true;

    getCurrentWeather(plannerWeatherLocation)
      .then((weather) => {
        if (isActive) {
          setWeatherSummary(weather);
        }
      })
      .catch(() => {
        // Keep the planner usable if weather is unavailable.
      });

    return () => {
      isActive = false;
    };
  }, []);

  function shiftMonth(delta: number) {
    const nextMonth = startOfMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1));

    setMonthDate(nextMonth);
    setSelectedDate(nextMonth);
  }

  function openOutfitPicker() {
    if (!currentUser) {
      onNavigate('account');
      return;
    }

    if (closetItems.length === 0) {
      // A fresh add must never inherit a stale edit target.
      setEditingItem(null);
      onNavigate('add');
      return;
    }

    const scheduledItemIds = scheduledOutfits[selectedDateKey] ?? [];
    setPickerItemIds(scheduledItemIds.length > 0 ? scheduledItemIds : currentOutfitItems.map((item) => item.id));
    setIsOutfitPickerOpen(true);
  }

  function togglePickerItem(item: WardrobeItem) {
    setPickerItemIds((currentIds) => (
      currentIds.includes(item.id)
        ? currentIds.filter((itemId) => itemId !== item.id)
        : [...currentIds, item.id]
    ));
  }

  function savePickerOutfit() {
    if (pickerItemIds.length === 0) {
      return;
    }

    scheduleOutfitForDate(selectedDateKey, pickerItemIds);
    setIsOutfitPickerOpen(false);
  }

  return (
    <AppScreen activeTab="calendar" onNavigate={onNavigate} showStatus={false} showStylist={false}>
      <View style={styles.root}>
        <ImageBackground source={plannerBackground} resizeMode="cover" style={styles.background}>
          <View style={styles.scrim}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <View style={styles.monthRow}>
                <Pressable style={styles.monthButton} onPress={() => shiftMonth(-1)}>
                  <LineIcon name="‹" color={closetTheme.cream} />
                </Pressable>
                <Text style={styles.monthTitle}>{formatPlannerMonth(monthDate)}</Text>
                <Pressable style={styles.monthButton} onPress={() => shiftMonth(1)}>
                  <LineIcon name="›" color={closetTheme.cream} />
                </Pressable>
              </View>

              <View style={styles.calendar}>
                <View style={styles.weekHeader}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <Text key={`${day}-${index}`} style={styles.weekday}>
                      {day}
                    </Text>
                  ))}
                </View>
                <View style={styles.daysGrid}>
                  {plannerDays.map((date, index) => {
                    const scheduledItemsForDay = itemsFromIds(scheduledOutfits[formatDateKey(date.date)] ?? [], closetItemById);

                    return (
                      <PlannerDayCell
                        key={`${date.day}-${date.inCurrentMonth}-${index}`}
                        date={date}
                        item={scheduledItemsForDay[0]}
                        selected={isSameDate(selectedDate, date.date)}
                        showLook={date.inCurrentMonth && scheduledItemsForDay.length > 0}
                        onPress={() => setSelectedDate(date.date)}
                      />
                    );
                  })}
                </View>
              </View>

              {selectedScheduledItems.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>{isToday(selectedDate) ? "TODAY'S SELECTION" : 'SCHEDULED OUTFIT'}</Text>
                  <SelectionCard date={selectedDate} items={selectedScheduledItems} onChange={openOutfitPicker} weather={weatherSummary} />
                </>
              )}

              <View style={styles.emptyWeek}>
                <Text style={[styles.emptyWeekText, selectedScheduledItems.length > 0 ? styles.savedOutfitMessage : styles.calendarHelpMessage]}>
                  {selectedScheduledItems.length > 0 ? 'Outfit saved for this day.' : calendarHelpText}
                </Text>
              </View>
            </ScrollView>

            <Pressable
              accessibilityLabel="Choose clothes for this date"
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
              onPress={openOutfitPicker}>
              <View pointerEvents="none" style={styles.addButtonHighlight} />
              <View pointerEvents="none" style={styles.addButtonLeftHighlight} />
              <View pointerEvents="none" style={styles.addButtonBottomShade} />
              <View pointerEvents="none" style={styles.addButtonRightShade} />
              <View pointerEvents="none" style={styles.addButtonPlus}>
                <View style={styles.addButtonPlusHorizontal} />
                <View style={styles.addButtonPlusVertical} />
              </View>
            </Pressable>

            {isOutfitPickerOpen && (
              <OutfitPickerSheet
                date={selectedDate}
                items={closetItems}
                selectedItems={pickerItems}
                selectedItemIds={pickerItemIds}
                onClose={() => setIsOutfitPickerOpen(false)}
                onSave={savePickerOutfit}
                onToggleItem={togglePickerItem}
              />
            )}
          </View>
        </ImageBackground>
      </View>
    </AppScreen>
  );
}

function OutfitPickerSheet({
  date,
  items,
  onClose,
  onSave,
  onToggleItem,
  selectedItemIds,
  selectedItems,
}: {
  date: Date;
  items: WardrobeItem[];
  onClose: () => void;
  onSave: () => void;
  onToggleItem: (item: WardrobeItem) => void;
  selectedItemIds: string[];
  selectedItems: WardrobeItem[];
}) {
  const hasSelection = selectedItemIds.length > 0;

  return (
    <View style={styles.pickerOverlay}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose} />
      <View style={styles.pickerSheet}>
        <View style={styles.pickerHeader}>
          <View style={styles.pickerTitleBlock}>
            <Text style={styles.pickerEyebrow}>{formatShortDate(date)}</Text>
            <Text style={styles.pickerTitle}>Choose outfit</Text>
          </View>
          <Pressable style={styles.pickerCloseButton} onPress={onClose}>
            <Text style={styles.pickerCloseText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.pickerSummary}>
          {hasSelection ? (
            selectedItems.map((item) => (
              <View key={item.id} style={styles.selectedMini}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.selectedMiniImage} resizeMode="contain" />
                ) : (
                  <ClosetIcon category={item.category} color={item.color ?? closetTheme.ink} accent={closetTheme.blueMist} size={22} />
                )}
              </View>
            ))
          ) : (
            <Text style={styles.pickerHint}>Select items below to create this day&apos;s outfit.</Text>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerGrid}>
          {items.map((item) => {
            const selected = selectedItemIds.includes(item.id);
            const detail = [item.price, item.source].filter(Boolean).join(' · ') || titleCase(item.category);

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.pickerItem, selected && styles.pickerItemSelected, pressed && styles.pickerItemPressed]}
                onPress={() => onToggleItem(item)}>
                <View style={styles.pickerThumb}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.pickerItemImage} resizeMode="contain" />
                  ) : (
                    <ClosetIcon category={item.category} color={item.color ?? closetTheme.ink} accent={closetTheme.blueMist} size={44} />
                  )}
                  <View style={[styles.pickerCheck, selected && styles.pickerCheckSelected]}>
                    <Text style={[styles.pickerCheckText, selected && styles.pickerCheckTextSelected]}>{selected ? '✓' : '+'}</Text>
                  </View>
                </View>
                <Text numberOfLines={2} style={styles.pickerItemName}>{item.name}</Text>
                <Text style={styles.pickerItemMeta}>{detail}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.pickerActions}>
          <Pressable
            disabled={!hasSelection}
            style={[styles.pickerPrimaryButton, !hasSelection && styles.pickerPrimaryButtonDisabled]}
            onPress={onSave}>
            <Text style={styles.pickerPrimaryText}>Save outfit</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function PlannerDayCell({
  date,
  item,
  onPress,
  selected,
  showLook,
}: {
  date: PlannerDay;
  item?: WardrobeItem;
  onPress: () => void;
  selected: boolean;
  showLook: boolean;
}) {
  return (
    <Pressable
      style={[styles.dayCell, !date.inCurrentMonth && styles.dayCellMuted, selected && styles.dayCellSelected]}
      onPress={onPress}>
      <Text style={[styles.dayNumber, !date.inCurrentMonth && styles.dayNumberMuted, selected && styles.dayNumberSelected]}>{date.day}</Text>
      {showLook && (
        <View style={[styles.dayLook, selected && styles.dayLookSelected]}>
          {item?.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.dayLookImage} resizeMode="contain" />
          ) : (
            <ClosetIcon category={item?.category ?? 'dress'} color={item?.color ?? closetTheme.camelDeep} size={20} />
          )}
        </View>
      )}
      {selected && <View style={styles.selectedDot} />}
    </Pressable>
  );
}

function SelectionCard({
  date,
  items,
  onChange,
  weather,
}: {
  date: Date;
  items: WardrobeItem[];
  onChange: () => void;
  weather: WeatherSummary | null;
}) {
  const title = `Outfit for ${formatShortDate(date)}`;
  const outfitNames = uniqueLabels(items.map((item) => item.name)).join(', ');
  const temperatureLabel = weather ? `${weather.temperatureC}°C` : '--°';

  return (
    <View style={styles.selectionCard}>
      <Text style={styles.selectionTitle}>{title}</Text>
      <View style={styles.selectionImageBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectionStack}>
          {items.map((item) => (
            <View key={item.id} style={styles.selectionThumb}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.selectionImage} resizeMode="contain" />
              ) : (
                <ClosetIcon category={item.category} color={item.color ?? closetTheme.ink} accent={closetTheme.blueMist} size={52} />
              )}
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={styles.selectionCopy}>
        <View style={styles.tags}>
          <Text style={styles.darkTag}>{formatItemCount(items.length).toUpperCase()}</Text>
          <Text style={styles.lightTag}>{temperatureLabel}</Text>
        </View>
        <Text style={styles.selectionMeta}>{outfitNames}</Text>
      </View>
      <Pressable style={({ pressed }) => [styles.changeOutfitButton, pressed && styles.changeOutfitButtonPressed]} onPress={onChange}>
        <LineIcon name="✎" color={calendarCream} />
        <Text style={styles.changeOutfitText}>Edit</Text>
      </Pressable>
    </View>
  );
}

function buildPlannerDays(monthDate: Date): PlannerDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.max(35, Math.ceil((firstWeekday + daysInMonth) / 7) * 7);

  return Array.from({ length: totalCells }, (_, index) => {
    const dayOffset = index - firstWeekday + 1;

    if (dayOffset < 1) {
      const day = daysInPreviousMonth + dayOffset;

      return {
        date: new Date(year, month - 1, day),
        day,
        inCurrentMonth: false,
      };
    }

    if (dayOffset > daysInMonth) {
      const day = dayOffset - daysInMonth;

      return {
        date: new Date(year, month + 1, day),
        day,
        inCurrentMonth: false,
      };
    }

    return {
      date: new Date(year, month, dayOffset),
      day: dayOffset,
      inCurrentMonth: true,
    };
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatPlannerMonth(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

function isSameDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isToday(date: Date) {
  return isSameDate(date, new Date());
}

function formatDateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function itemsFromIds(itemIds: string[], itemById: Map<string, WardrobeItem>) {
  return itemIds
    .map((itemId) => itemById.get(itemId))
    .filter((item): item is WardrobeItem => Boolean(item));
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function uniqueLabels(labels: string[]) {
  const seenLabels = new Set<string>();

  return labels.filter((label) => {
    const cleanedLabel = label.trim();
    const labelKey = cleanedLabel.toLowerCase();

    if (!cleanedLabel || seenLabels.has(labelKey)) {
      return false;
    }

    seenLabels.add(labelKey);

    return true;
  });
}

function formatItemCount(count: number) {
  return `${count} item${count === 1 ? '' : 's'}`;
}

const plannerInk = '#061D36';
const calendarBrown = '#774530';
const calendarCream = '#FFF3D7';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrim: {
    backgroundColor: 'rgba(241,247,251,0.55)',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    paddingBottom: 88,
    paddingHorizontal: 32,
    paddingTop: 70,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  backButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pageTitle: {
    color: plannerInk,
    flex: 1,
    ...closetTypography.text,
    fontSize: 23,
    fontWeight: '900',
  },
  topActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  monthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 42,
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: '#7A4328',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 38,
  },
  monthTitle: {
    color: plannerInk,
    ...closetTypography.text,
    fontSize: 28,
    fontWeight: '400',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  calendar: {
    backgroundColor: calendarCream,
    borderColor: calendarBrown,
    borderWidth: 2,
    elevation: 8,
    marginTop: 22,
    shadowColor: calendarBrown,
    shadowOffset: { height: 6, width: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 0,
  },
  weekHeader: {
    backgroundColor: calendarBrown,
    flexDirection: 'row',
    height: 34,
  },
  weekday: {
    color: calendarCream,
    flex: 1,
    ...closetTypography.text,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    aspectRatio: 1,
    backgroundColor: calendarCream,
    borderColor: '#C9A77E',
    borderRightWidth: 1,
    borderTopWidth: 1,
    overflow: 'hidden',
    padding: 5,
    position: 'relative',
    width: `${100 / 7}%`,
  },
  dayCellMuted: {
    backgroundColor: '#E8D2A7',
  },
  dayCellSelected: {
    backgroundColor: calendarBrown,
  },
  dayNumber: {
    color: calendarBrown,
    ...closetTypography.text,
    fontSize: 11,
    fontWeight: '900',
  },
  dayNumberMuted: {
    color: '#9B7358',
  },
  dayNumberSelected: {
    color: calendarCream,
  },
  dayLook: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#EFEDE5',
    borderColor: '#E4DED2',
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    marginTop: 2,
    overflow: 'hidden',
    width: 24,
  },
  dayLookSelected: {
    backgroundColor: calendarCream,
  },
  dayLookImage: {
    height: '100%',
    width: '100%',
  },
  selectedDot: {
    backgroundColor: '#E6B44C',
    borderRadius: 4,
    height: 7,
    position: 'absolute',
    right: 5,
    top: 5,
    width: 7,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    color: '#000000',
    ...closetTypography.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 44,
    paddingHorizontal: 2,
  },
  selectionCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF9EA',
    borderRadius: 16,
    gap: 18,
    marginTop: 18,
    padding: 18,
  },
  changeOutfitButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: calendarBrown,
    borderColor: calendarBrown,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 5,
    height: 34,
    justifyContent: 'center',
    marginTop: -17,
    paddingHorizontal: 9,
  },
  changeOutfitButtonPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  changeOutfitText: {
    color: calendarCream,
    fontSize: 12,
    fontWeight: '900',
  },
  selectionImageBox: {
    height: 62,
    transform: [{ translateY: -8 }],
    width: '100%',
  },
  selectionImage: {
    height: '100%',
    width: '100%',
  },
  selectionStack: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionThumb: {
    alignItems: 'center',
    backgroundColor: '#EFEDE5',
    borderColor: '#E4DED2',
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 58,
  },
  selectionCopy: {
    flex: 1,
    minWidth: 0,
    transform: [{ translateY: -12 }],
  },
  selectionTitle: {
    color: '#000000',
    ...closetTypography.text,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
    transform: [{ translateY: -5 }],
  },
  selectionMeta: {
    color: '#2E3B49',
    fontFamily: closetTypography.inputFont,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    marginTop: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 0,
  },
  darkTag: {
    backgroundColor: '#E8E4D9',
    color: '#5F5138',
    ...closetTypography.text,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  lightTag: {
    backgroundColor: '#E8E4D9',
    color: '#5F5138',
    ...closetTypography.text,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  emptyWeek: {
    alignItems: 'center',
    borderColor: '#D5DDE5',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 16,
    justifyContent: 'center',
    marginTop: 34,
    minHeight: 132,
  },
  emptyWeekText: {
    color: closetTheme.muted,
    ...closetTypography.text,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    transform: [{ translateY: -30 }],
  },
  savedOutfitMessage: {
    bottom: 100,
    left: 0,
    position: 'absolute',
    right: 0,
    transform: [{ translateY: 0 }],
  },
  calendarHelpMessage: {
    color: '#000000',
    transform: [{ translateY: -80 }],
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#F6E4B7',
    borderColor: '#774530',
    borderRadius: 0,
    borderWidth: 4,
    bottom: 68,
    elevation: 8,
    height: 46,
    justifyContent: 'center',
    position: 'absolute',
    right: 22,
    shadowColor: '#774530',
    shadowOffset: { height: 5, width: 5 },
    shadowOpacity: 0.48,
    shadowRadius: 0,
    width: 46,
    zIndex: 80,
  },
  addButtonPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.96 }],
  },
  addButtonHighlight: {
    backgroundColor: '#FFFCED',
    height: 4,
    left: 8,
    position: 'absolute',
    right: 12,
    top: 8,
  },
  addButtonLeftHighlight: {
    backgroundColor: '#FFFCED',
    bottom: 16,
    left: 8,
    position: 'absolute',
    top: 8,
    width: 4,
  },
  addButtonBottomShade: {
    backgroundColor: 'rgba(119,69,48,0.28)',
    bottom: 4,
    height: 4,
    left: 8,
    position: 'absolute',
    right: 4,
  },
  addButtonRightShade: {
    backgroundColor: 'rgba(119,69,48,0.28)',
    bottom: 4,
    position: 'absolute',
    right: 4,
    top: 8,
    width: 4,
  },
  addButtonPlus: {
    height: 20,
    position: 'relative',
    width: 20,
  },
  addButtonPlusHorizontal: {
    backgroundColor: '#4B2A1E',
    height: 6,
    left: 0,
    position: 'absolute',
    top: 7,
    width: 20,
  },
  addButtonPlusVertical: {
    backgroundColor: '#4B2A1E',
    height: 20,
    left: 7,
    position: 'absolute',
    top: 0,
    width: 6,
  },
  pickerOverlay: {
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 120,
  },
  pickerBackdrop: {
    backgroundColor: 'rgba(77,42,30,0.42)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  pickerSheet: {
    backgroundColor: '#FFF9EA',
    borderColor: calendarBrown,
    borderTopWidth: 2,
    maxHeight: '82%',
    paddingBottom: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  pickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  pickerTitleBlock: {
    flex: 1,
  },
  pickerEyebrow: {
    color: '#8A6A56',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pickerTitle: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 2,
  },
  pickerCloseButton: {
    alignItems: 'center',
    backgroundColor: calendarBrown,
    borderColor: calendarBrown,
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  pickerCloseText: {
    color: calendarCream,
    fontFamily: closetTypography.inputFont,
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 26,
  },
  pickerSummary: {
    alignItems: 'center',
    backgroundColor: calendarCream,
    borderColor: '#D8BE98',
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    minHeight: 58,
    padding: 10,
  },
  pickerHint: {
    color: '#8A6A56',
    fontFamily: closetTypography.regularFont,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  selectedMini: {
    alignItems: 'center',
    backgroundColor: '#FFF9EA',
    borderColor: calendarBrown,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 34,
  },
  selectedMiniImage: {
    height: '100%',
    width: '100%',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 12,
    paddingTop: 14,
  },
  pickerItem: {
    backgroundColor: '#FFF9EA',
    borderColor: '#D8BE98',
    borderWidth: 1,
    overflow: 'hidden',
    width: '47.8%',
  },
  pickerItemSelected: {
    borderColor: calendarBrown,
    borderWidth: 2,
  },
  pickerItemPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  pickerThumb: {
    alignItems: 'center',
    backgroundColor: '#FFFCF5',
    height: 118,
    justifyContent: 'center',
    position: 'relative',
  },
  pickerItemImage: {
    height: 102,
    width: '82%',
  },
  pickerCheck: {
    alignItems: 'center',
    backgroundColor: '#FFF9EA',
    borderColor: calendarBrown,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 28,
  },
  pickerCheckSelected: {
    backgroundColor: calendarBrown,
  },
  pickerCheckText: {
    color: calendarBrown,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  pickerCheckTextSelected: {
    color: calendarCream,
  },
  pickerItemName: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingTop: 9,
  },
  pickerItemMeta: {
    color: '#8A6A56',
    fontFamily: closetTypography.inputFont,
    fontSize: 11,
    fontWeight: '400',
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
  },
  pickerPrimaryButton: {
    alignItems: 'center',
    backgroundColor: calendarBrown,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  pickerPrimaryButtonDisabled: {
    opacity: 0.48,
  },
  pickerPrimaryText: {
    color: calendarCream,
    fontSize: 12,
    fontWeight: '900',
  },
});
