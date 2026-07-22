import { StyleSheet, Text, View } from 'react-native';

import { CategoryId } from '@/models/closet';
import { closetTheme } from '@/views/components/closet-theme';

type IconProps = {
  category?: CategoryId;
  color?: string;
  accent?: string;
  size?: number;
};

export function ClosetIcon({
  category = 'shirt',
  color = closetTheme.ink,
  accent = closetTheme.camel,
  size = 34,
}: IconProps) {
  if (category === 'pants' || category === 'shorts') {
    return (
      <View style={[styles.iconBox, { width: size, height: size }]}>
        <View style={[styles.waist, { backgroundColor: color }]} />
        <View style={styles.legRow}>
          <View style={[styles.leg, category === 'shorts' && styles.legShort, { backgroundColor: color }]} />
          <View style={[styles.leg, category === 'shorts' && styles.legShort, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  if (category === 'dress') {
    return (
      <View style={[styles.iconBox, { width: size, height: size }]}>
        <View style={[styles.sleeve, styles.leftSleeve, { backgroundColor: color }]} />
        <View style={[styles.sleeve, styles.rightSleeve, { backgroundColor: color }]} />
        <View style={[styles.dressBody, { backgroundColor: color }]}>
          <View style={[styles.collar, { borderTopColor: accent }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.iconBox, { width: size, height: size }]}>
      <View style={[styles.sleeve, styles.leftSleeve, { backgroundColor: color }]} />
      <View style={[styles.sleeve, styles.rightSleeve, { backgroundColor: color }]} />
      <View style={[styles.shirtBody, { backgroundColor: color }]}>
        <View style={[styles.collar, { borderTopColor: accent }]} />
      </View>
    </View>
  );
}

export function LineIcon({ name, color = closetTheme.ink }: { name: string; color?: string }) {
  return <Text style={[styles.lineIcon, { color }]}>{name}</Text>;
}

export function CalendarIcon({ color = closetTheme.ink, size = 22 }: { color?: string; size?: number }) {
  const stroke = Math.max(2, Math.round(size * 0.12));

  return (
    <View style={[styles.calendarIcon, { borderColor: color, borderRadius: size * 0.18, borderWidth: stroke, height: size, width: size }]}>
      <View style={[styles.calendarBindingRow, { top: -stroke * 1.4, paddingHorizontal: size * 0.22 }]}>
        {[0, 1].map((binding) => (
          <View key={binding} style={{ backgroundColor: color, borderRadius: stroke, height: size * 0.26, width: stroke * 1.2 }} />
        ))}
      </View>
      <View style={[styles.calendarDivider, { backgroundColor: color, height: stroke, top: size * 0.28 }]} />
      <Text style={[styles.calendarDate, { color, fontSize: size * 0.42, lineHeight: size * 0.5, marginTop: size * 0.34 }]}>7</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shirtBody: {
    width: '55%',
    height: '62%',
    borderRadius: 6,
    alignItems: 'center',
    overflow: 'hidden',
  },
  dressBody: {
    width: '58%',
    height: '74%',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignItems: 'center',
    overflow: 'hidden',
  },
  sleeve: {
    position: 'absolute',
    top: '22%',
    width: '28%',
    height: '34%',
    borderRadius: 5,
  },
  leftSleeve: {
    left: '11%',
    transform: [{ rotate: '-24deg' }],
  },
  rightSleeve: {
    right: '11%',
    transform: [{ rotate: '24deg' }],
  },
  collar: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  waist: {
    width: '62%',
    height: '16%',
    borderRadius: 4,
  },
  legRow: {
    width: '62%',
    height: '62%',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  leg: {
    flex: 1,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  legShort: {
    maxHeight: '55%',
  },
  lineIcon: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  calendarIcon: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
    position: 'relative',
  },
  calendarBindingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
  calendarDivider: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  calendarDate: {
    fontWeight: '900',
    textAlign: 'center',
  },
});
