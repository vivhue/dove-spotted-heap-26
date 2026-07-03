import { StyleSheet, Text, View } from 'react-native';

import { WardrobeItem } from '@/models/closet';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';

export function WardrobeCard({ item, showHeart = false }: { item: WardrobeItem; showHeart?: boolean }) {
  const detail = item.price && item.source ? `${item.price} · ${item.source}` : labelFromCategory(item.category);
  const color = item.color ?? '#C2B49E';
  const accent = item.accent ?? closetTheme.camel;

  return (
    <View style={styles.card}>
      <View style={styles.thumb}>
        <View style={[styles.backdrop, { backgroundColor: `${accent}22` }]} />
        <ClosetIcon category={item.category} color={color} accent={accent} size={54} />
        {item.texture && <View style={[styles.textureBadge, textureStyle(item.texture)]} />}
        {showHeart && (
          <View style={styles.heart}>
            <LineIcon name="♡" color={closetTheme.camelDeep} />
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>
        <Text style={styles.price}>{detail}</Text>
      </View>
    </View>
  );
}

function labelFromCategory(category: WardrobeItem['category']) {
  const labels: Record<WardrobeItem['category'], string> = {
    accessories: 'Accessories',
    bags: 'Bags',
    bottoms: 'Bottoms',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    tops: 'Tops',
  };

  return labels[category];
}

function textureStyle(texture: WardrobeItem['texture']) {
  const stylesByTexture: Record<NonNullable<WardrobeItem['texture']>, { backgroundColor: string }> = {
    classic: { backgroundColor: '#D9C8B1' },
    denim: { backgroundColor: '#55728D' },
    knit: { backgroundColor: '#AFA090' },
    leather: { backgroundColor: '#2B2118' },
    metal: { backgroundColor: '#C9C8C1' },
    silk: { backgroundColor: '#E7A9A0' },
  };

  return stylesByTexture[texture ?? 'classic'];
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: closetTheme.white,
    borderRadius: 18,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    shadowColor: closetTheme.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    height: 128,
    justifyContent: 'center',
    position: 'relative',
  },
  backdrop: {
    borderRadius: 36,
    height: 72,
    position: 'absolute',
    width: 72,
  },
  textureBadge: {
    borderColor: closetTheme.white,
    borderRadius: 6,
    borderWidth: 2,
    bottom: 10,
    height: 12,
    position: 'absolute',
    right: 12,
    width: 24,
  },
  heart: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,253,249,0.94)',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 28,
  },
  meta: {
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  name: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '800',
    minHeight: 31,
  },
  price: {
    color: closetTheme.muted,
    fontSize: 11,
    marginTop: 2,
  },
});
