import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { CategoryId, ScreenId, WardrobeItem } from '@/models/closet';
import { createTryOn, getProfile, getTryOnStatus, setupMannequin } from '@/services/closet-api';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';
import { WardrobeCard } from '@/views/components/wardrobe-card';

const tryOnOrder: CategoryId[] = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories', 'bags'];
const tryOnProvider = 'gemini';

type TryOnJob = {
  garmentImageUrls: string[];
  label: string;
  primaryCategory: WardrobeItem['category'];
  productType: string;
};

export function TryOnScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { closetItems, currentUser, selectedOutfit, toggleWornItem } = useClosetStore();
  const [basePhotoUrl, setBasePhotoUrl] = useState('');
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState('');
  const [status, setStatus] = useState('Checking your model...');
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const tryOnItems = useMemo(
    () => closetItems,
    [closetItems]
  );
  const selectedItems = useMemo(
    () =>
      tryOnOrder
        .map((category) => closetItems.find((item) => item.id === selectedOutfit[category]))
        .filter((item): item is WardrobeItem => Boolean(item?.imageUrl)),
    [closetItems, selectedOutfit]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!currentUser) {
        setStatus('Create an account before setting up your model.');
        setIsCheckingProfile(false);
        return;
      }

      try {
        const profile = await getProfile(currentUser.id);

        if (!isMounted) {
          return;
        }

        setBasePhotoUrl(profile.selfieImageUrl ?? '');
        setDisplayPhotoUrl(profile.selfieImageUrl ?? '');
        setStatus(profile.selfieImageUrl ? 'Choose items, then tap Try it on.' : 'Take a full-body photo to see clothes on yourself.');
      } catch (error) {
        if (isMounted) {
          setStatus(error instanceof Error ? error.message : 'Could not load your model.');
        }
      } finally {
        if (isMounted) {
          setIsCheckingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  async function setupModel() {
    if (!currentUser) {
      setStatus('Create an account before setting up your model.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setStatus('Permission is needed to choose your full-body photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    try {
      setIsSettingUp(true);
      setStatus('Saving your model photo...');
      setDisplayPhotoUrl(result.assets[0].uri);
      const model = await setupMannequin({ image: result.assets[0], provider: tryOnProvider, userId: currentUser.id });

      setBasePhotoUrl(model.selfieImageUrl);
      setDisplayPhotoUrl(model.selfieImageUrl);
      setStatus('Model ready. Choose clothes, then tap Try it on.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not set up your model.');
    } finally {
      setIsSettingUp(false);
    }
  }

  async function tryOnSelectedOutfit() {
    if (!basePhotoUrl) {
      setStatus('Take a full-body photo to see clothes on yourself.');
      return;
    }

    if (!currentUser) {
      setStatus('Create an account before trying on clothes.');
      return;
    }

    if (selectedItems.length === 0) {
      setStatus('Select at least one closet item first.');
      return;
    }

    try {
      setIsGenerating(true);
      setStatus('Creating Taobao-style try-on...');
      let currentBase = basePhotoUrl;
      const jobs = buildTryOnJobs(selectedItems);

      for (let index = 0; index < jobs.length; index += 1) {
        const job = jobs[index];

        setStatus(`Creating Taobao-style try-on... ${index + 1}/${jobs.length}`);
        const result = await createTryOn({
          baseImageUrl: currentBase,
          category: job.primaryCategory,
          garmentImageUrl: job.garmentImageUrls[0],
          garmentImageUrls: job.garmentImageUrls,
          productType: job.productType,
          provider: tryOnProvider,
          userId: currentUser.id,
        });
        const outputUrl = result.outputUrl ?? await pollTryOn(result.generationId);

        currentBase = outputUrl;
        setDisplayPhotoUrl(outputUrl);
      }

      setStatus('Try-on ready.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Try-on failed. You can retry.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function pollTryOn(generationId: string) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const result = await getTryOnStatus(generationId);

      if (result.status === 'completed' && result.output_url) {
        return result.output_url;
      }

      if (result.status === 'failed' || result.status === 'error') {
        throw new Error(providerErrorMessage(result));
      }

      await sleep(3000);
    }

    throw new Error('Try-on is taking longer than expected. Please check again in a minute.');
  }

  return (
    <AppScreen activeTab="closet" onNavigate={onNavigate} title="Try on">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.photoStage}>
          {displayPhotoUrl ? (
            <Image source={{ uri: displayPhotoUrl }} style={styles.userPhoto} resizeMode="cover" />
          ) : (
            <View style={styles.emptyPhoto}>
              {isCheckingProfile ? (
                <ActivityIndicator color={closetTheme.camelDeep} />
              ) : (
                <>
                  <LineIcon name="▧" color={closetTheme.camelDeep} />
                  <Text style={styles.emptyTitle}>Take a full-body photo to see clothes on yourself</Text>
                </>
              )}
            </View>
          )}
        </View>

        <Text style={styles.statusText}>{status}</Text>

        <View style={styles.actionRow}>
          <Pressable
            disabled={isSettingUp}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, isSettingUp && styles.disabled]}
            onPress={setupModel}>
            {isSettingUp ? <ActivityIndicator color={closetTheme.camelDeep} /> : <LineIcon name="▧" color={closetTheme.camelDeep} />}
            <Text style={styles.secondaryText}>{basePhotoUrl ? 'Retake photo' : 'Upload photo'}</Text>
          </Pressable>

          <Pressable
            disabled={isGenerating}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, isGenerating && styles.disabled]}
            onPress={tryOnSelectedOutfit}>
            {isGenerating ? <ActivityIndicator color={closetTheme.cream} /> : <LineIcon name="✦" color={closetTheme.cream} />}
            <Text style={styles.primaryText}>{isGenerating ? 'Creating' : 'Try it on'}</Text>
          </Pressable>
        </View>

        {basePhotoUrl && displayPhotoUrl !== basePhotoUrl && (
          <Pressable style={styles.resetButton} onPress={() => setDisplayPhotoUrl(basePhotoUrl)}>
            <Text style={styles.resetText}>Reset to original photo</Text>
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>Select outfit pieces</Text>
        <View style={styles.grid}>
          {tryOnItems.map((item) => (
            <View key={item.id} style={styles.cardWrap}>
              <WardrobeCard
                isWorn={selectedOutfit[item.category] === item.id}
                item={item}
                onPress={() => toggleWornItem(item)}
                showHeart
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function providerErrorMessage(result: { error?: unknown; error_message?: string; message?: string }) {
  if (result.error_message) return result.error_message;
  if (result.message) return result.message;

  if (result.error && typeof result.error === 'object' && 'message' in result.error) {
    return String(result.error.message);
  }

  if (typeof result.error === 'string') return result.error;

  return 'Try-on failed.';
}

function buildTryOnJobs(items: WardrobeItem[]): TryOnJob[] {
  const top = items.find((item) => item.category === 'tops');
  const bottom = items.find((item) => item.category === 'bottoms');
  const jobs: TryOnJob[] = [];
  const bundledIds = new Set<string>();

  if (top?.imageUrl && bottom?.imageUrl) {
    jobs.push({
      garmentImageUrls: [top.imageUrl, bottom.imageUrl],
      label: 'top and bottom',
      primaryCategory: 'tops',
      productType: 'top_and_bottom',
    });
    bundledIds.add(top.id);
    bundledIds.add(bottom.id);
  }

  for (const item of items) {
    if (!item.imageUrl || bundledIds.has(item.id)) {
      continue;
    }

    jobs.push({
      garmentImageUrls: [item.imageUrl],
      label: item.name,
      primaryCategory: item.category,
      productType: productTypeFromCategory(item.category),
    });
  }

  return jobs;
}

function productTypeFromCategory(category: WardrobeItem['category']) {
  if (category === 'tops') return 'top';
  if (category === 'bottoms') return 'bottom';
  if (category === 'outerwear') return 'top';

  return category;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  photoStage: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderColor: closetTheme.line,
    borderRadius: 24,
    borderWidth: 1,
    height: 390,
    justifyContent: 'center',
    marginHorizontal: 22,
    marginTop: 16,
    overflow: 'hidden',
  },
  userPhoto: {
    height: '100%',
    width: '100%',
  },
  emptyPhoto: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  emptyTitle: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
    textAlign: 'center',
  },
  statusText: {
    color: closetTheme.camelDeep,
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 22,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 22,
    marginTop: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
  },
  secondaryText: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 17,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryText: {
    color: closetTheme.cream,
    fontSize: 12,
    fontWeight: '900',
  },
  resetButton: {
    alignSelf: 'center',
    marginTop: 12,
  },
  resetText: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.72,
  },
  sectionLabel: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginHorizontal: 22,
    marginTop: 22,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    padding: 22,
    paddingTop: 0,
  },
  cardWrap: {
    width: '47.8%',
  },
});
