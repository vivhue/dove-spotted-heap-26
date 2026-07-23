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
  const { closetItems, currentUser, scheduledOutfits, scheduleOutfitForDate, selectedOutfit } = useClosetStore();
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
    <AppScreen activeTab="calendar" onNavigate={onNavigate} showStatus={false}>
      <View style={styles.root}>
        <ImageBackground source={plannerBackground} resizeMode="cover" style={styles.background}>
          <View style={styles.scrim}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <View style={styles.monthRow}>
                <Pressable style={styles.monthButton} onPress={() => shiftMonth(-1)}>
                  <LineIcon name="‹" color={closetTheme.ink} />
                </Pressable>
                <Text style={styles.monthTitle}>{formatPlannerMonth(monthDate)}</Text>
                <Pressable style={styles.monthButton} onPress={() => shiftMonth(1)}>
                  <LineIcon name="›" color={closetTheme.ink} />
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
                  <SelectionCard date={selectedDate} items={selectedScheduledItems} weather={weatherSummary} />
                  <Pressable style={({ pressed }) => [styles.changeOutfitButton, pressed && styles.changeOutfitButtonPressed]} onPress={openOutfitPicker}>
                    <LineIcon name="↻" color={plannerInk} />
                    <Text style={styles.changeOutfitText}>Change outfit</Text>
                  </Pressable>
                </>
              )}

              <View style={styles.emptyWeek}>
                <LineIcon name="↻" color={closetTheme.muted} />
                <Text style={styles.emptyWeekText}>
                  {selectedScheduledItems.length > 0 ? 'Outfit saved for this day.' : calendarHelpText}
                </Text>
              </View>
            </ScrollView>

            <Pressable style={styles.addButton} onPress={openOutfitPicker}>
              <Text style={styles.addButtonText}>+</Text>
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
            <LineIcon name="×" color={plannerInk} />
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
            <Text style={styles.pickerHint}>Tap items below to build this day&apos;s outfit.</Text>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerGrid}>
          {items.map((item) => {
            const selected = selectedItemIds.includes(item.id);

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
                <Text style={styles.pickerItemMeta}>{titleCase(item.category)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.pickerActions}>
          <Pressable style={styles.pickerSecondaryButton} onPress={onClose}>
            <Text style={styles.pickerSecondaryText}>Cancel</Text>
          </Pressable>
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
  weather,
}: {
  date: Date;
  items: WardrobeItem[];
  weather: WeatherSummary | null;
}) {
  const title = `Outfit for ${formatShortDate(date)}`;
  const category = uniqueLabels(items.map((item) => titleCase(item.category))).join(' + ');
  const detail = uniqueLabels(items.map((item) => item.name || titleCase(item.category))).join(', ');
  const temperatureLabel = weather ? `${weather.temperatureC}°C` : '--°';

  return (
    <View style={styles.selectionCard}>
      <View style={styles.selectionImageBox}>
        <View style={styles.selectionStack}>
          {items.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.selectionThumb}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.selectionImage} resizeMode="contain" />
              ) : (
                <ClosetIcon category={item.category} color={item.color ?? closetTheme.ink} accent={closetTheme.blueMist} size={34} />
              )}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.selectionCopy}>
        <Text style={styles.selectionTitle}>{title}</Text>
        <Text style={styles.selectionMeta}>{category} • {detail}</Text>
        <View style={styles.tags}>
          <Text style={styles.darkTag}>{formatItemCount(items.length).toUpperCase()}</Text>
          <Text style={styles.lightTag}>{temperatureLabel}</Text>
        </View>
      </View>
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
const plannerPaper = '#F1F7FB';

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
    backgroundColor: plannerPaper,
    borderColor: plannerInk,
    borderRadius: 2,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    shadowColor: plannerInk,
    shadowOffset: { height: 3, width: -3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    width: 38,
  },
  monthTitle: {
    backgroundColor: 'rgba(241,247,251,0.76)',
    color: plannerInk,
    ...closetTypography.text,
    fontSize: 22,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  calendar: {
    backgroundColor: plannerPaper,
    borderColor: plannerInk,
    borderWidth: 2,
    marginTop: 22,
    shadowColor: plannerInk,
    shadowOffset: { height: 3, width: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  weekHeader: {
    backgroundColor: plannerInk,
    flexDirection: 'row',
    height: 34,
  },
  weekday: {
    color: plannerPaper,
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
    backgroundColor: plannerPaper,
    borderColor: '#C8D3DC',
    borderRightWidth: 1,
    borderTopWidth: 1,
    overflow: 'hidden',
    padding: 5,
    position: 'relative',
    width: `${100 / 7}%`,
  },
  dayCellMuted: {
    backgroundColor: '#E8F0F6',
  },
  dayCellSelected: {
    backgroundColor: plannerInk,
  },
  dayNumber: {
    color: plannerInk,
    ...closetTypography.text,
    fontSize: 11,
    fontWeight: '900',
  },
  dayNumberMuted: {
    color: closetTheme.muted,
  },
  dayNumberSelected: {
    color: plannerPaper,
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
    backgroundColor: plannerPaper,
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
    backgroundColor: 'rgba(241,247,251,0.76)',
    color: plannerInk,
    ...closetTypography.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 44,
    paddingHorizontal: 2,
  },
  selectionCard: {
    alignItems: 'flex-start',
    backgroundColor: '#E8F1FA',
    borderColor: plannerInk,
    borderRadius: 0,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 18,
    marginTop: 18,
    padding: 18,
    shadowColor: plannerInk,
    shadowOffset: { height: 3, width: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  changeOutfitButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: plannerPaper,
    borderColor: plannerInk,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 8,
    height: 42,
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    shadowColor: plannerInk,
    shadowOffset: { height: 3, width: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  changeOutfitButtonPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  changeOutfitText: {
    color: plannerInk,
    fontSize: 12,
    fontWeight: '900',
  },
  selectionImageBox: {
    alignItems: 'center',
    backgroundColor: plannerPaper,
    borderColor: plannerInk,
    borderRadius: 0,
    borderWidth: 2,
    height: 100,
    justifyContent: 'center',
    width: 96,
  },
  selectionImage: {
    height: '100%',
    width: '100%',
  },
  selectionStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  selectionThumb: {
    alignItems: 'center',
    backgroundColor: '#EFEDE5',
    borderColor: '#E4DED2',
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 32,
  },
  selectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectionTitle: {
    color: plannerInk,
    ...closetTypography.text,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
  },
  selectionMeta: {
    color: '#2E3B49',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  darkTag: {
    backgroundColor: plannerInk,
    color: plannerPaper,
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
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: plannerInk,
    borderColor: plannerPaper,
    borderWidth: 2,
    bottom: 68,
    height: 54,
    justifyContent: 'center',
    position: 'absolute',
    right: 22,
    shadowColor: plannerInk,
    shadowOffset: { height: 4, width: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    width: 54,
  },
  addButtonText: {
    color: plannerPaper,
    fontSize: 31,
    fontWeight: '300',
    lineHeight: 34,
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
    backgroundColor: 'rgba(6,29,54,0.42)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  pickerSheet: {
    backgroundColor: plannerPaper,
    borderColor: plannerInk,
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
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pickerTitle: {
    color: plannerInk,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 2,
  },
  pickerCloseButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: plannerInk,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  pickerSummary: {
    alignItems: 'center',
    backgroundColor: '#E8F1FA',
    borderColor: '#D5DDE5',
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    minHeight: 58,
    padding: 10,
  },
  pickerHint: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 18,
  },
  selectedMini: {
    alignItems: 'center',
    backgroundColor: plannerPaper,
    borderColor: plannerInk,
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
    backgroundColor: closetTheme.white,
    borderColor: '#D5DDE5',
    borderWidth: 1,
    overflow: 'hidden',
    width: '47.8%',
  },
  pickerItemSelected: {
    borderColor: plannerInk,
    borderWidth: 2,
  },
  pickerItemPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  pickerThumb: {
    alignItems: 'center',
    backgroundColor: '#E8F1FA',
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
    backgroundColor: closetTheme.white,
    borderColor: plannerInk,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 28,
  },
  pickerCheckSelected: {
    backgroundColor: plannerInk,
  },
  pickerCheckText: {
    color: plannerInk,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  pickerCheckTextSelected: {
    color: plannerPaper,
  },
  pickerItemName: {
    color: plannerInk,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingTop: 9,
  },
  pickerItemMeta: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '800',
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
  },
  pickerSecondaryButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: plannerInk,
    borderWidth: 2,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  pickerSecondaryText: {
    color: plannerInk,
    fontSize: 12,
    fontWeight: '900',
  },
  pickerPrimaryButton: {
    alignItems: 'center',
    backgroundColor: plannerInk,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  pickerPrimaryButtonDisabled: {
    opacity: 0.48,
  },
  pickerPrimaryText: {
    color: plannerPaper,
    fontSize: 12,
    fontWeight: '900',
  },
});
