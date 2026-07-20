import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { ScreenId } from '@/models/closet';
import { createTryOn, getAvatar, setupAvatar } from '@/services/closet-api';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';
import { WardrobeCard } from '@/views/components/wardrobe-card';

export function TryOnScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { closetItems, currentUser } = useClosetStore();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState('');
  const [selectedGarmentId, setSelectedGarmentId] = useState<string | null>(null);
  const [status, setStatus] = useState('Checking your photo...');
  const [isCheckingAvatar, setIsCheckingAvatar] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAvatar() {
      if (!currentUser) {
        setStatus('Create an account before setting up your photo.');
        setIsCheckingAvatar(false);
        return;
      }

      try {
        const { avatarUrl: url } = await getAvatar(currentUser.id);

        if (!isMounted) {
          return;
        }

        setAvatarUrl(url ?? '');
        setDisplayPhotoUrl(url ?? '');
        setStatus(url ? 'Pick a garment, then tap Try it on.' : 'Upload a full-body photo to see clothes on yourself.');
      } catch (error) {
        if (isMounted) {
          setStatus(error instanceof Error ? error.message : 'Could not load your photo.');
        }
      } finally {
        if (isMounted) {
          setIsCheckingAvatar(false);
        }
      }
    }

    loadAvatar();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  async function uploadAvatar() {
    if (!currentUser) {
      setStatus('Create an account before setting up your photo.');
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
      setStatus('Saving your photo...');
      setDisplayPhotoUrl(result.assets[0].uri);
      const { avatarUrl: url } = await setupAvatar({ image: result.assets[0], userId: currentUser.id });

      setAvatarUrl(url);
      setDisplayPhotoUrl(url);
      setStatus('Photo ready. Pick a garment, then tap Try it on.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save your photo.');
    } finally {
      setIsSettingUp(false);
    }
  }

  async function tryOnSelectedGarment() {
    if (!avatarUrl) {
      setStatus('Upload a full-body photo to see clothes on yourself.');
      return;
    }

    if (!currentUser) {
      setStatus('Create an account before trying on clothes.');
      return;
    }

    if (!selectedGarmentId) {
      setStatus('Select a garment first.');
      return;
    }

    try {
      setIsGenerating(true);
      setStatus('Running virtual try-on... this can take 30-60s.');
      const { resultUrl } = await createTryOn({ garmentId: selectedGarmentId, userId: currentUser.id });

      setDisplayPhotoUrl(resultUrl);
      setStatus('Try-on ready.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Try-on failed. You can retry.');
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleGarment(id: string) {
    setSelectedGarmentId((current) => (current === id ? null : id));
  }

  return (
    <AppScreen activeTab="closet" onNavigate={onNavigate} title="Try on">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.photoStage}>
          {displayPhotoUrl ? (
            <Image source={{ uri: displayPhotoUrl }} style={styles.userPhoto} resizeMode="cover" />
          ) : (
            <View style={styles.emptyPhoto}>
              {isCheckingAvatar ? (
                <ActivityIndicator color={closetTheme.camelDeep} />
              ) : (
                <>
                  <LineIcon name="▧" color={closetTheme.camelDeep} />
                  <Text style={styles.emptyTitle}>Upload a full-body photo to see clothes on yourself</Text>
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
            onPress={uploadAvatar}>
            {isSettingUp ? <ActivityIndicator color={closetTheme.camelDeep} /> : <LineIcon name="▧" color={closetTheme.camelDeep} />}
            <Text style={styles.secondaryText}>{avatarUrl ? 'Retake photo' : 'Upload photo'}</Text>
          </Pressable>

          <Pressable
            disabled={isGenerating}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, isGenerating && styles.disabled]}
            onPress={tryOnSelectedGarment}>
            {isGenerating ? <ActivityIndicator color={closetTheme.cream} /> : <LineIcon name="✦" color={closetTheme.cream} />}
            <Text style={styles.primaryText}>{isGenerating ? 'Creating' : 'Try it on'}</Text>
          </Pressable>
        </View>

        {avatarUrl !== '' && displayPhotoUrl !== avatarUrl && (
          <Pressable style={styles.resetButton} onPress={() => setDisplayPhotoUrl(avatarUrl)}>
            <Text style={styles.resetText}>Reset to original photo</Text>
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>Select a garment</Text>
        <View style={styles.grid}>
          {closetItems.map((item) => (
            <View key={item.id} style={styles.cardWrap}>
              <WardrobeCard
                isWorn={selectedGarmentId === item.id}
                item={item}
                onPress={() => toggleGarment(item.id)}
                showHeart
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </AppScreen>
  );
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
