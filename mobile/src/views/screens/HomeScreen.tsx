import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  BodyMeasurements,
  BodyProportions,
  browseCategories,
  CategoryId,
  homeSwatches,
  ScreenId,
} from '@/models/closet';
import { AppScreen, AvatarButton } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';
import { MannequinCanvas } from '@/views/components/MannequinCanvas';

const outfitByCategory: Record<
  CategoryId,
  {
    accessory?: string;
    bottom: string;
    outerwear?: string;
    shoes: string;
    top: string;
  }
> = {
  accessories: {
    accessory: closetTheme.camel,
    bottom: '#3B4A63',
    outerwear: '#EFE6D6',
    shoes: closetTheme.ink,
    top: closetTheme.ink,
  },
  bags: {
    accessory: closetTheme.sage,
    bottom: '#3B4A63',
    outerwear: '#EFE6D6',
    shoes: closetTheme.ink,
    top: closetTheme.ink,
  },
  bottoms: {
    accessory: closetTheme.camel,
    bottom: '#6D7C91',
    outerwear: '#EFE6D6',
    shoes: closetTheme.ink,
    top: closetTheme.ink,
  },
  outerwear: {
    accessory: closetTheme.camel,
    bottom: '#3B4A63',
    outerwear: '#A97B4E',
    shoes: closetTheme.ink,
    top: '#FFFDF9',
  },
  shoes: {
    accessory: closetTheme.camel,
    bottom: '#3B4A63',
    outerwear: '#EFE6D6',
    shoes: '#8B2F2F',
    top: closetTheme.ink,
  },
  tops: {
    accessory: closetTheme.camel,
    bottom: '#3B4A63',
    outerwear: '#EFE6D6',
    shoes: closetTheme.ink,
    top: closetTheme.ink,
  },
};

const measurementFields: {
  field: keyof BodyMeasurements;
  label: string;
}[] = [
  { field: 'height', label: 'Height' },
  { field: 'chest', label: 'Chest' },
  { field: 'waist', label: 'Waist' },
  { field: 'hips', label: 'Hips' },
  { field: 'inseam', label: 'Inseam' },
];

type Props = {
  activeCategory: CategoryId;
  bodyProportions: BodyProportions;
  measurements: BodyMeasurements;
  onCategoryChange: (category: CategoryId) => void;
  onMeasurementChange: (field: keyof BodyMeasurements, value: string) => void;
  onNavigate: (screen: ScreenId) => void;
};

export function HomeScreen({
  activeCategory,
  bodyProportions,
  measurements,
  onCategoryChange,
  onMeasurementChange,
  onNavigate,
}: Props) {
  const [surpriseIndex, setSurpriseIndex] = useState(0);
  const outfitColors = useMemo(
    () => ({
      ...outfitByCategory[activeCategory],
      skin: '#D9B89A',
    }),
    [activeCategory]
  );

  function surpriseMe() {
    const nextIndex = (surpriseIndex + 1) % homeSwatches.length;
    setSurpriseIndex(nextIndex);
    onCategoryChange(homeSwatches[nextIndex]);
  }

  return (
    <AppScreen activeTab="home" onNavigate={onNavigate}>
      <View style={styles.topbar}>
        <View style={styles.weather}>
          <LineIcon name="☼" color={closetTheme.camel} />
          <Text style={styles.weatherText}>25°</Text>
          <Text style={styles.weatherSmall}>H29° L22°</Text>
        </View>
        <Pressable style={styles.calendarButton} onPress={() => onNavigate('calendar')}>
          <LineIcon name="□" />
        </Pressable>
        <View style={styles.spacer} />
        <View style={styles.iconButton}>
          <LineIcon name="!" />
        </View>
        <AvatarButton />
      </View>

      <View style={styles.stage}>
        <View style={styles.stageBackground} />
        <View style={styles.savePill}>
          <LineIcon name="▾" color={closetTheme.camel} />
          <Text style={styles.saveText}>Save outfit</Text>
        </View>
        <View style={styles.canvasWrap}>
          <MannequinCanvas colors={outfitColors} proportions={bodyProportions} />
        </View>
        <Pressable style={styles.browseHotspot} onPress={() => onNavigate('dashboard')}>
          <Text style={styles.browseHotspotText}>Browse closet</Text>
        </Pressable>
      </View>

      <View style={styles.measurementPanel}>
        <View style={styles.measurementHeader}>
          <Text style={styles.measurementTitle}>Body profile</Text>
          <Text style={styles.measurementUnit}>cm</Text>
        </View>
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.measurementFields}>
          {measurementFields.map(({ field, label }) => (
            <View key={field} style={styles.measurementField}>
              <Text style={styles.measurementLabel}>{label}</Text>
              <TextInput
                inputMode="decimal"
                keyboardType="decimal-pad"
                maxLength={5}
                onChangeText={(value) => onMeasurementChange(field, value)}
                placeholder="0"
                placeholderTextColor="#B9AB94"
                selectTextOnFocus
                style={styles.measurementInput}
                value={measurements[field]}
              />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.shuffleRow}>
        <Pressable style={({ pressed }) => [styles.shuffleButton, pressed && styles.buttonPressed]} onPress={surpriseMe}>
          <LineIcon name="⇄" color={closetTheme.camel} />
          <Text style={styles.shuffleText}>surprise me</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
        {homeSwatches.map((category) => (
          <Pressable
            key={category}
            onPress={() => onCategoryChange(category)}
            style={({ pressed }) => [
              styles.swatch,
              activeCategory === category && styles.swatchSelected,
              pressed && styles.swatchPressed,
            ]}>
            <ClosetIcon category={category} size={34} />
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}>
        {browseCategories.map((category) => {
          const selected = activeCategory === category.id;

          return (
            <Pressable
              key={category.id}
              hitSlop={8}
              onPress={() => onCategoryChange(category.id)}
              style={({ pressed }) => [
                styles.catButton,
                selected && styles.catButtonSelected,
                pressed && styles.catButtonPressed,
              ]}>
              <Text style={[styles.catText, selected && styles.catTextSelected]}>
                {category.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  weather: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  weatherText: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  weatherSmall: {
    color: '#9B8D77',
    fontSize: 11,
    fontWeight: '600',
  },
  calendarButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  spacer: {
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stage: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 300,
    position: 'relative',
  },
  stageBackground: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 28,
    bottom: 18,
    left: 28,
    position: 'absolute',
    right: 28,
    top: 18,
  },
  savePill: {
    alignItems: 'center',
    backgroundColor: closetTheme.navy,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    right: 24,
    top: 22,
    zIndex: 3,
  },
  saveText: {
    color: closetTheme.cream,
    fontSize: 11,
    fontWeight: '900',
  },
  canvasWrap: {
    borderRadius: 24,
    height: '90%',
    overflow: 'hidden',
    width: '78%',
    zIndex: 2,
  },
  browseHotspot: {
    alignItems: 'center',
    backgroundColor: 'rgba(43, 33, 24, 0.08)',
    borderColor: 'rgba(43, 33, 24, 0.1)',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 28,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    zIndex: 4,
  },
  browseHotspotText: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  measurementPanel: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 18,
    paddingBottom: 10,
    paddingTop: 10,
  },
  measurementHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  measurementTitle: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  measurementUnit: {
    color: closetTheme.camelDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  measurementFields: {
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 9,
  },
  measurementField: {
    backgroundColor: closetTheme.cream,
    borderRadius: 12,
    minWidth: 70,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  measurementLabel: {
    color: closetTheme.muted,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  measurementInput: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '900',
    minHeight: 24,
    padding: 0,
  },
  shuffleRow: {
    alignItems: 'center',
    paddingVertical: 7,
  },
  shuffleButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  shuffleText: {
    color: closetTheme.cream,
    fontSize: 12,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  swatches: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  swatch: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  swatchSelected: {
    borderColor: closetTheme.camel,
  },
  swatchPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  catRow: {
    flexDirection: 'row',
    gap: 18,
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  catButton: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    minHeight: 32,
    paddingBottom: 7,
    paddingTop: 4,
  },
  catButtonSelected: {
    borderBottomColor: closetTheme.camelDeep,
  },
  catButtonPressed: {
    opacity: 0.65,
  },
  catText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  catTextSelected: {
    color: closetTheme.camelDeep,
  },
});
