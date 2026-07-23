import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { WardrobeItem } from '@/models/closet';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';

export function WardrobeCard({
  compact = false,
  isWorn = false,
  item,
  onOpenActions,
  onPress,
  showHeart = false,
}: {
  compact?: boolean;
  isWorn?: boolean;
  item: WardrobeItem;
  onOpenActions?: () => void;
  onPress?: () => void;
  showHeart?: boolean;
}) {
  const detail = [item.price, item.source].filter(Boolean).join(' · ') || labelFromCategory(item.category);
  const color = item.color ?? '#C2B49E';
  const accent = item.accent ?? closetTheme.camel;

  return (
    <Pressable
      disabled={!onPress}
      style={({ pressed }) => [styles.card, isWorn && styles.cardWorn, pressed && styles.cardPressed]}
      onPress={onPress}>
      <View style={styles.thumb}>
        <View style={[styles.backdrop, compact && styles.backdropCompact, { backgroundColor: `${accent}22` }]} />
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={[styles.itemImage, compact && styles.itemImageCompact]} resizeMode="contain" />
        ) : (
          <ClosetIcon category={item.category} color={color} accent={accent} size={compact ? 42 : 54} />
        )}
        {item.texture && <View style={[styles.textureBadge, textureStyle(item.texture)]} />}
        {showHeart && (
          <View style={[styles.heart, isWorn && styles.heartWorn]}>
            <LineIcon name={isWorn ? "✓" : "♡"} color={isWorn ? '#7A4328' : closetTheme.camelDeep} />
          </View>
        )}
        {onOpenActions && (
          <Pressable
            accessibilityLabel={`Options for ${item.name}`}
            hitSlop={8}
            style={({ pressed }) => [styles.actionsButton, pressed && styles.actionsButtonPressed]}
            onPress={onOpenActions}>
            <Text style={styles.actionsGlyph}>⋯</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.meta}>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>
        <Text style={styles.price}>{detail}</Text>
      </View>
    </Pressable>
  );
}

function labelFromCategory(category: WardrobeItem['category']) {
  const labels: Record<WardrobeItem['category'], string> = {
    shirt: 'Shirt',
    dress: 'Dress',
    shorts: 'Shorts',
    pants: 'Pants',
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
  cardPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  cardWorn: {
    borderColor: '#7A4328',
    borderWidth: 2,
    elevation: 12,
    shadowColor: '#7A4328',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: '#FFFCF5',
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
  backdropCompact: {
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  itemImage: {
    height: 108,
    width: '82%',
  },
  itemImageCompact: {
    height: 82,
    width: '70%',
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
  actionsButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,253,249,0.94)',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    left: 8,
    position: 'absolute',
    top: 8,
    width: 28,
  },
  actionsButtonPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.96 }],
  },
  actionsGlyph: {
    color: closetTheme.camelDeep,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  heartWorn: {
    backgroundColor: '#FFF3D7',
    borderColor: '#7A4328',
    borderWidth: 2,
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
