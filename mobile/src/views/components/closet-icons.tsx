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
  category = 'tops',
  color = closetTheme.ink,
  accent = closetTheme.camel,
  size = 34,
}: IconProps) {
  if (category === 'bottoms') {
    return (
      <View style={[styles.iconBox, { width: size, height: size }]}>
        <View style={[styles.waist, { backgroundColor: color }]} />
        <View style={styles.legRow}>
          <View style={[styles.leg, { backgroundColor: color }]} />
          <View style={[styles.leg, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  if (category === 'shoes') {
    return (
      <View style={[styles.iconBox, { width: size, height: size }]}>
        <View style={[styles.shoe, { backgroundColor: color }]} />
        <View style={[styles.shoeBase, { backgroundColor: accent }]} />
      </View>
    );
  }

  if (category === 'bags') {
    return (
      <View style={[styles.iconBox, { width: size, height: size }]}>
        <View style={[styles.bagHandle, { borderColor: color }]} />
        <View style={[styles.bagBody, { backgroundColor: color }]} />
      </View>
    );
  }

  if (category === 'accessories') {
    return (
      <View style={[styles.iconBox, { width: size, height: size }]}>
        <View style={[styles.chain, { borderColor: accent }]} />
        <View style={[styles.gem, { backgroundColor: color }]} />
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
  shoe: {
    width: '62%',
    height: '34%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    marginTop: 6,
    transform: [{ rotate: '-8deg' }],
  },
  shoeBase: {
    width: '72%',
    height: 5,
    borderRadius: 5,
    marginTop: 1,
  },
  bagHandle: {
    width: '44%',
    height: '30%',
    borderWidth: 3,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: -1,
  },
  bagBody: {
    width: '68%',
    height: '52%',
    borderRadius: 7,
  },
  chain: {
    width: '58%',
    height: '58%',
    borderRadius: 24,
    borderWidth: 4,
  },
  gem: {
    borderRadius: 8,
    height: '24%',
    marginTop: -6,
    transform: [{ rotate: '45deg' }],
    width: '24%',
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
