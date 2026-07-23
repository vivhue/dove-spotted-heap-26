import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { ScreenId } from '@/models/closet';
import { createTryOn, getAvatar, setupAvatar } from '@/services/closet-api';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';
import { WardrobeCard } from '@/views/components/wardrobe-card';

const tryOnMirrorImage = require('../../../assets/images/try-on-mirror-v2.jpg');
const tryOnBackdrop = '#E79A6C';
const mirrorArtAspectRatio = 474 / 1024;
const mirrorGlassWidthRatio = 0.426;
const mirrorGlassHeightRatio = 0.505;
const mirrorGlassLeftRatio = 0.312;
const mirrorGlassTopRatio = 0.259;
const mirrorPhotoInset = 2;
const mirrorControlsTopRatio = 0.89;
const mirrorStageHeightRatio = 1.08;

export function TryOnScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { width: windowWidth } = useWindowDimensions();
  const { closetItems, currentUser, wishlistItems } = useClosetStore();
  const tryOnItems = [...closetItems, ...wishlistItems];
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedGarmentId, setSelectedGarmentId] = useState<string | null>(null);
  const [status, setStatus] = useState('Checking your photo...');
  const [isCheckingAvatar, setIsCheckingAvatar] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const selectedGarment = tryOnItems.find((item) => item.id === selectedGarmentId);
  const mirrorStageWidth = Math.min(Math.max(windowWidth - 24, 300), 360);

  useEffect(() => {
    let isMounted = true;

    async function loadAvatar() {
      if (!currentUser) {
        setStatus('Sign in to upload your full-body photo.');
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
        setStep(1);
        setStatus(url ? 'Photo ready. Continue to pick a garment.' : 'Upload a full-body photo to see clothes on yourself.');
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
      setStatus('Sign in or create an account to upload your photo.');
      onNavigate('account');
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
      setStep(1);
      setStatus('Photo ready. Continue to pick a garment.');
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
      setStatus('Sign in or create an account before trying on clothes.');
      onNavigate('account');
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
      setStep(3);
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
    <AppScreen activeTab="try-on" onNavigate={onNavigate} showStatus={false}>
      <View style={styles.tryOnRoot}>
        <ScrollView contentContainerStyle={styles.content}>
          {step === 1 && (
            <MirrorStage
              actionRow={
                <View style={styles.actionRow}>
                  <Pressable
                    disabled={isSettingUp}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, isSettingUp && styles.disabled]}
                    onPress={uploadAvatar}>
                    {isSettingUp ? <ActivityIndicator color={closetTheme.camelDeep} /> : <LineIcon name="▧" color={closetTheme.camelDeep} />}
                    <Text style={styles.secondaryText}>{avatarUrl ? 'Retake photo' : 'Upload photo'}</Text>
                  </Pressable>

                  <Pressable
                    disabled={!avatarUrl || isSettingUp}
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (!avatarUrl || isSettingUp) && styles.disabled]}
                    onPress={() => setStep(2)}>
                    <Text style={styles.primaryText}>Continue</Text>
                    <LineIcon name="›" color={closetTheme.cream} />
                  </Pressable>
                </View>
              }
              stageWidth={mirrorStageWidth}
              step={step}
              status={status}>
              <Pressable
                disabled={isCheckingAvatar || isSettingUp}
                style={({ pressed }) => [
                  styles.mirrorPressable,
                  pressed && styles.pressed,
                  (isCheckingAvatar || isSettingUp) && styles.disabled,
                ]}
                onPress={uploadAvatar}>
                {displayPhotoUrl ? (
                  <Image source={{ uri: displayPhotoUrl }} style={styles.userPhoto} resizeMode="cover" />
                ) : (
                  <View style={styles.emptyPhoto}>
                    {isCheckingAvatar || isSettingUp ? (
                      <ActivityIndicator color={closetTheme.ink} />
                    ) : (
                      <>
                        <LineIcon name="▧" color={closetTheme.muted} />
                        <Text style={styles.emptyTitle}>Upload full-body photo</Text>
                      </>
                    )}
                  </View>
                )}
              </Pressable>
            </MirrorStage>
          )}

        {step === 2 && (
          <>
            <View style={styles.selectionHero}>
              <TryOnHeader />
              <StepTracker step={step} />
            </View>

            <Text style={styles.sectionHeading}>Pick a piece to try on</Text>
            {tryOnItems.length === 0 ? (
              <View style={styles.emptyGarments}>
                <Text style={styles.emptyGarmentsText}>Add items to your closet first</Text>
                <Pressable style={({ pressed }) => [styles.smallOutlineButton, pressed && styles.pressed]} onPress={() => onNavigate('closet')}>
                  <Text style={styles.smallOutlineText}>Back</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.grid}>
                  {tryOnItems.map((item) => (
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

                <Text style={styles.statusText}>{selectedGarment ? `${selectedGarment.name} selected.` : 'Select one garment to continue.'}</Text>
                <View style={styles.actionRow}>
                  <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => setStep(1)}>
                    <Text style={styles.secondaryText}>Back</Text>
                  </Pressable>
                  <Pressable
                    disabled={!selectedGarmentId || isGenerating}
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (!selectedGarmentId || isGenerating) && styles.disabled]}
                    onPress={tryOnSelectedGarment}>
                    {isGenerating ? <ActivityIndicator color={closetTheme.cream} /> : <LineIcon name="✦" color={closetTheme.cream} />}
                    <Text style={styles.primaryText}>{isGenerating ? 'Creating' : 'Try it on'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <MirrorStage
            actionRow={
              <View style={styles.actionRow}>
                <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => setStep(2)}>
                  <Text style={styles.secondaryText}>Back</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                  onPress={() => {
                    setDisplayPhotoUrl(avatarUrl);
                    setStep(1);
                    setStatus('Photo ready. Continue to pick a garment.');
                  }}>
                  <Text style={styles.primaryText}>Try another</Text>
                </Pressable>
              </View>
            }
            stageWidth={mirrorStageWidth}
            step={step}
            status={status}>
              {displayPhotoUrl ? (
                <Image source={{ uri: displayPhotoUrl }} style={styles.userPhoto} resizeMode="cover" />
              ) : (
                <View style={styles.emptyPhoto}>
                  <ActivityIndicator color={closetTheme.camelDeep} />
                  <Text style={styles.emptyTitle}>Creating your outfit...</Text>
                </View>
              )}
          </MirrorStage>
        )}
        </ScrollView>
      </View>
    </AppScreen>
  );
}

function TryOnHeader() {
  return (
    <View style={styles.hero}>
      <Text style={styles.heroTitle}>Virtual Try-On</Text>
      <Text style={styles.heroSubtitle}>See how it looks before you wear it</Text>
    </View>
  );
}

function MirrorStage({
  actionRow,
  children,
  stageWidth,
  step,
  status,
}: {
  actionRow: React.ReactNode;
  children: React.ReactNode;
  stageWidth: number;
  step: 1 | 2 | 3;
  status: string;
}) {
  const baseStageHeight = stageWidth / mirrorArtAspectRatio;
  const glassWidth = stageWidth * mirrorGlassWidthRatio;
  const glassHeight = baseStageHeight * mirrorGlassHeightRatio;
  const topOffset = baseStageHeight * mirrorGlassTopRatio;
  const stageHeight = baseStageHeight * mirrorStageHeightRatio;
  const controlsTop = baseStageHeight * mirrorControlsTopRatio;
  const shouldShowStatus = status !== 'Photo ready. Continue to pick a garment.';

  return (
    <ImageBackground
      source={tryOnMirrorImage}
      resizeMode="stretch"
      style={[
        styles.mirrorFrame,
        {
          height: stageHeight,
          width: stageWidth,
        },
      ]}>
      <View style={styles.mirrorHeader}>
        <Text style={styles.mirrorHeroTitle}>Virtual Try-On</Text>
        <Text style={styles.mirrorHeroSubtitle}>See how it looks before you wear it</Text>
        <StepTracker step={step} variant="mirror" />
      </View>
      <View
        style={[
          styles.mirrorGlass,
          {
            height: glassHeight,
            left: stageWidth * mirrorGlassLeftRatio,
            top: topOffset,
            width: glassWidth,
          },
        ]}>
        <View style={styles.mirrorPhotoMask}>{children}</View>
      </View>
      <View style={[styles.mirrorControls, { top: controlsTop }]}>
        {shouldShowStatus && <Text style={styles.statusText}>{status}</Text>}
        {actionRow}
      </View>
    </ImageBackground>
  );
}

function StepTracker({ step, variant = 'default' }: { step: 1 | 2 | 3; variant?: 'default' | 'mirror' }) {
  return (
    <View style={[styles.stepper, variant === 'mirror' && styles.stepperMirror]}>
      {[1, 2, 3].map((value, index) => {
        const isComplete = step > value;
        const isActive = step === value;

        return (
          <View key={value} style={styles.stepSegment}>
            <View style={[styles.stepDot, isActive && styles.stepDotActive, isComplete && styles.stepDotComplete]}>
              <Text style={[styles.stepText, (isActive || isComplete) && styles.stepTextActive]}>{isComplete ? '✓' : value}</Text>
            </View>
            {index < 2 && <View style={[styles.stepLine, step > value && styles.stepLineComplete]} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tryOnRoot: {
    backgroundColor: tryOnBackdrop,
    flex: 1,
  },
  selectionHero: {
    marginTop: 20,
  },
  content: {
    backgroundColor: tryOnBackdrop,
    paddingBottom: 0,
    paddingHorizontal: 12,
    paddingTop: 48,
  },
  hero: {
    marginTop: 52,
  },
  heroTitle: {
    color: closetTheme.ink,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  heroSubtitle: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
    marginTop: 10,
  },
  stepperMirror: {
    marginBottom: 0,
    marginTop: 6,
    transform: [{ scale: 0.68 }],
  },
  stepSegment: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  stepDot: {
    alignItems: 'center',
    backgroundColor: '#F2B705',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  stepDotActive: {
    backgroundColor: '#87B8E5',
  },
  stepDotComplete: {
    backgroundColor: '#87B8E5',
  },
  stepText: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  stepTextActive: {
    color: closetTheme.ink,
  },
  stepLine: {
    backgroundColor: '#F2B705',
    height: 3,
    width: 92,
  },
  stepLineComplete: {
    backgroundColor: '#87B8E5',
  },
  mirrorPressable: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
    zIndex: 2,
  },
  mirrorFrame: {
    alignSelf: 'center',
    position: 'relative',
  },
  mirrorHeader: {
    left: '5%',
    position: 'absolute',
    right: '5%',
    top: '3.2%',
    zIndex: 3,
  },
  mirrorHeroTitle: {
    color: closetTheme.ink,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  mirrorHeroSubtitle: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  mirrorGlass: {
    alignItems: 'center',
    backgroundColor: '#BFC0BB',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'absolute',
    zIndex: 2,
  },
  mirrorPhotoMask: {
    bottom: mirrorPhotoInset,
    left: mirrorPhotoInset,
    overflow: 'hidden',
    position: 'absolute',
    right: mirrorPhotoInset,
    top: mirrorPhotoInset,
  },
  mirrorControls: {
    left: '8%',
    position: 'absolute',
    right: '8%',
    zIndex: 3,
  },
  userPhoto: {
    height: '100%',
    width: '100%',
    zIndex: 2,
  },
  emptyPhoto: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  emptyTitle: {
    color: closetTheme.muted,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
    textAlign: 'center',
  },
  statusText: {
    color: '#5F3920',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
  },
  secondaryText: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
  },
  primaryText: {
    color: closetTheme.cream,
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
  sectionHeading: {
    color: closetTheme.muted,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 18,
  },
  emptyGarments: {
    alignItems: 'center',
    gap: 22,
    justifyContent: 'center',
    minHeight: 260,
  },
  emptyGarmentsText: {
    color: closetTheme.muted,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  smallOutlineButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 22,
    borderWidth: 1,
    minWidth: 82,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  smallOutlineText: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  cardWrap: {
    width: '47.8%',
  },
});
