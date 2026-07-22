import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { calendarLooks, ScreenId } from '@/models/closet';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme, closetTypography } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';

const days: Array<number | null> = [
  ...Array.from({ length: 2 }, () => null),
  ...Array.from({ length: 30 }, (_, index) => index + 1),
];

export function CalendarScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [selectedDay, setSelectedDay] = useState(28);
  const selectedLabel = useMemo(() => `Sun, June ${selectedDay}`, [selectedDay]);

  return (
    <AppScreen activeTab="home" onNavigate={onNavigate} showStatus={false}>
      <View style={styles.header}>
        <Pressable style={styles.nav} onPress={() => onNavigate('home')}>
          <LineIcon name="<" />
        </Pressable>
        <Text style={styles.month}>June 2026</Text>
        <Pressable style={styles.nav} onPress={() => setSelectedDay((day) => Math.min(day + 1, 30))}>
          <LineIcon name=">" />
        </Pressable>
      </View>

      <View style={styles.calendar}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.dayName}>
            {day}
          </Text>
        ))}
        {days.map((day, index) => {
          const look = calendarLooks.find((entry) => entry.day === day);

          return (
            <Pressable
              key={`${day ?? 'empty'}-${index}`}
              disabled={!day}
              onPress={() => day && setSelectedDay(day)}
              style={[styles.day, selectedDay === day && styles.daySelected]}>
              <Text style={[styles.dayText, selectedDay === day && styles.dayTextSelected]}>{day ?? ''}</Text>
              {look?.hasLook && <View style={styles.dot} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sheet}>
        <Text style={styles.sheetDate}>{selectedLabel}</Text>
        <CalendarAction
          label="Select from closet"
          icon={<ClosetIcon size={22} color={closetTheme.camelDeep} />}
          onPress={() => onNavigate('closet')}
        />
        <CalendarAction
          label="From saved looks"
          icon={<LineIcon name="♡" color={closetTheme.camelDeep} />}
          onPress={() => onNavigate('wishlist')}
        />
      </View>
    </AppScreen>
  );
}

function CalendarAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.action} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  nav: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  month: {
    color: closetTheme.ink,
    ...closetTypography.text,
    fontSize: 20,
    fontWeight: '700',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 18,
    paddingTop: 18,
  },
  dayName: {
    color: closetTheme.muted,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    width: `${(100 - 6 * 6) / 7}%`,
  },
  day: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    position: 'relative',
    width: `${(100 - 6 * 6) / 7}%`,
  },
  daySelected: {
    backgroundColor: closetTheme.ink,
    borderColor: closetTheme.ink,
  },
  dayText: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  dayTextSelected: {
    color: closetTheme.cream,
  },
  dot: {
    backgroundColor: closetTheme.camel,
    borderRadius: 2,
    bottom: 4,
    height: 4,
    position: 'absolute',
    width: 4,
  },
  sheet: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sheetDate: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  action: {
    alignItems: 'center',
    borderTopColor: closetTheme.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  actionText: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
});
