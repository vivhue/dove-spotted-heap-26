import { useEffect, useMemo, useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { calendarLooks, ScreenId, WardrobeItem } from '@/models/closet';
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

const eventDays = [6, 10, 16, 23];
const plannerBackground = require('../../../assets/images/planner-bg.png');
const plannerWeatherLocation = 'Singapore';

export function CalendarScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { closetItems, currentUser } = useClosetStore();
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummary | null>(() => getCachedWeatherSummary(plannerWeatherLocation));
  const selectedItem = closetItems[0];
  const plannerDays = useMemo(() => buildPlannerDays(monthDate), [monthDate]);
  const selectedLabel = useMemo(() => {
    if (hasScheduledLook(selectedDate)) {
      return 'Evening Gala';
    }

    return 'Open Slot';
  }, [selectedDate]);

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

  function addCalendarItem() {
    if (!currentUser) {
      onNavigate('account');
      return;
    }

    onNavigate('closet');
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
                  {plannerDays.map((date, index) => (
                    <PlannerDayCell
                      key={`${date.day}-${date.inCurrentMonth}-${index}`}
                      date={date}
                      item={closetItems[index % Math.max(closetItems.length, 1)]}
                      selected={isSameDate(selectedDate, date.date)}
                      showLook={date.inCurrentMonth && hasScheduledLook(date.date)}
                      onPress={() => setSelectedDate(date.date)}
                    />
                  ))}
                </View>
              </View>

              <Text style={styles.sectionLabel}>TODAY&apos;S SELECTION</Text>
              <SelectionCard item={selectedItem} label={selectedLabel} hasLook={hasScheduledLook(selectedDate)} weather={weatherSummary} />

              <View style={styles.emptyWeek}>
                <LineIcon name="↻" color={closetTheme.muted} />
                <Text style={styles.emptyWeekText}>No outfits scheduled for next week</Text>
              </View>
            </ScrollView>

            <Pressable style={styles.addButton} onPress={addCalendarItem}>
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </View>
        </ImageBackground>
      </View>
    </AppScreen>
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
  hasLook,
  item,
  label,
  weather,
}: {
  hasLook: boolean;
  item?: WardrobeItem;
  label: string;
  weather: WeatherSummary | null;
}) {
  const title = hasLook ? 'Evening Gala' : label;
  const category = item ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Black Silk Dress';
  const detail = item ? item.name : 'Stilettos';
  const temperatureLabel = weather ? `${weather.temperatureC}°C` : '--°';

  return (
    <View style={styles.selectionCard}>
      <View style={styles.selectionImageBox}>
        {item?.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.selectionImage} resizeMode="contain" />
        ) : (
          <ClosetIcon category="dress" color={closetTheme.ink} accent={closetTheme.blueMist} size={54} />
        )}
      </View>
      <View style={styles.selectionCopy}>
        <Text style={styles.selectionTitle}>{title}</Text>
        <Text style={styles.selectionMeta}>{category} • {detail}</Text>
        <View style={styles.tags}>
          <Text style={styles.darkTag}>FORMAL</Text>
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

function hasScheduledLook(date: Date) {
  return eventDays.includes(date.getDate()) || calendarLooks.some((entry) => entry.day === date.getDate() && entry.hasLook);
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
    height: '82%',
    width: '82%',
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
});
