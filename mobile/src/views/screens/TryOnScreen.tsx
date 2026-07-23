import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { ScreenId } from '@/models/closet';
import { createTryOn, getAvatar, setupAvatar } from '@/services/closet-api';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme, closetTypography } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';
import { WardrobeCard } from '@/views/components/wardrobe-card';

const tryOnMirrorImage = require('../../../assets/images/try-on-room-v4.png');
const wardrobeBackground = require('../../../assets/images/wardrobe-bg.png');
const tryOnBackdrop = '#D98A42';
const mirrorArtAspectRatio = 402 / 874;
const mirrorGlassWidthRatio = 215 / 402;
const mirrorGlassHeightRatio = 429 / 874;
const mirrorGlassLeftRatio = 92 / 402;
const mirrorGlassTopRatio = 273 / 874;
const mirrorPhotoInset = 0;
const mirrorVerticalOffset = -108;
const mirrorControlsTopRatio = 0.74;
const mirrorStageHeightRatio = 1;

export function TryOnScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
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
  const [stageArea, setStageArea] = useState({ height: 874, width: 402 });
  const selectedGarment = tryOnItems.find((item) => item.id === selectedGarmentId);
  const mirrorStageWidth = stageArea.width;

  function measureStageArea(event: LayoutChangeEvent) {
    const { height, width } = event.nativeEvent.layout;
    setStageArea({ height, width });
  }

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
      setStatus('Uploading photo...');
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
      setStatus('Generating look...');
      const tryOnPromise = createTryOn({ garmentId: selectedGarmentId, userId: currentUser.id });
      setStatus('Saving to history...');
      const { resultUrl } = await tryOnPromise;

      setDisplayPhotoUrl(resultUrl);
      setStep(3);
      setStatus('Look saved to history.');
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
    <AppScreen activeTab="try-on" onNavigate={onNavigate} showStatus={false} showStylist={false}>
      <View onLayout={measureStageArea} style={styles.tryOnRoot}>
        {step === 2 && (
          <View pointerEvents="none" style={styles.stepTwoBackground}>
            <Image resizeMode="cover" source={wardrobeBackground} style={styles.stepTwoBackgroundImage} />
            <View style={styles.stepTwoScrim} />
          </View>
        )}
        <ScrollView contentContainerStyle={[styles.content, step === 2 && styles.stepTwoContent]} scrollEnabled={step === 2}>
          {step === 1 && (
            <MirrorStage
              actionRow={
                <View style={[styles.actionRow, styles.centeredActionRow]}>
                  <Pressable
                    disabled={isSettingUp}
                    style={({ pressed }) => [styles.secondaryButton, styles.centeredMirrorButton, pressed && styles.pressed, isSettingUp && styles.disabled]}
                    onPress={uploadAvatar}>
                    {isSettingUp && <ActivityIndicator color={closetTheme.camelDeep} />}
                    <Text numberOfLines={1} style={[styles.secondaryText, styles.centeredMirrorButtonText]}>{avatarUrl ? 'Retake photo' : 'Upload photo'}</Text>
                  </Pressable>

                </View>
              }
              nextAction={
                <Pressable
                  disabled={!avatarUrl || isSettingUp}
                  style={({ pressed }) => [styles.stepNextButton, pressed && styles.pressed, (!avatarUrl || isSettingUp) && styles.disabled]}
                  onPress={() => setStep(2)}>
                  <Text style={styles.stepNextText}>Next</Text>
                  <LineIcon name="›" color={closetTheme.cream} />
                </Pressable>
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
                  <Image source={{ uri: displayPhotoUrl }} style={styles.userPhoto} resizeMode="contain" />
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
                        compact
                        isWorn={selectedGarmentId === item.id}
                        item={item}
                        onPress={() => toggleGarment(item.id)}
                        showHeart
                      />
                    </View>
                  ))}
                </View>

                <Text style={[styles.statusText, styles.selectionStatus]}>{selectedGarment ? `${selectedGarment.name} selected.` : 'Select one garment to continue.'}</Text>
                <View style={[styles.actionRow, styles.stepTwoActionRow]}>
                  <Pressable style={({ pressed }) => [styles.secondaryButton, styles.stepTwoBackButton, pressed && styles.pressed]} onPress={() => setStep(1)}>
                    <Text style={[styles.secondaryText, styles.centeredMirrorButtonText]}>Back</Text>
                  </Pressable>
                  <Pressable
                    disabled={!selectedGarmentId || isGenerating}
                    style={({ pressed }) => [styles.primaryButton, styles.stepTwoTryOnButton, pressed && styles.pressed, (!selectedGarmentId || isGenerating) && styles.stepTwoTryOnDisabled]}
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
                <Image source={{ uri: displayPhotoUrl }} style={styles.userPhoto} resizeMode="contain" />
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
    <View style={styles.stepTwoHeader}>
      <Text style={styles.mirrorHeroTitle}>Virtual Try-On</Text>
    </View>
  );
}

function MirrorStage({
  actionRow,
  children,
  nextAction,
  stageWidth,
  step,
  status,
}: {
  actionRow: React.ReactNode;
  children: React.ReactNode;
  nextAction?: React.ReactNode;
  stageWidth: number;
  step: 1 | 2 | 3;
  status: string;
}) {
  const baseStageHeight = stageWidth / mirrorArtAspectRatio;
  const glassWidth = stageWidth * mirrorGlassWidthRatio;
  const glassHeight = baseStageHeight * mirrorGlassHeightRatio;
  const topOffset = baseStageHeight * mirrorGlassTopRatio;
  const stageHeight = baseStageHeight * mirrorStageHeightRatio;
  const controlsTop = baseStageHeight * (step === 3 ? 0.65 : mirrorControlsTopRatio);
  const shouldShowStatus = Boolean(status) && status !== 'Photo ready. Continue to pick a garment.';

  return (
    <View
      style={[
        styles.mirrorFrame,
        {
          height: stageHeight,
          width: stageWidth,
        },
      ]}>
      <Image resizeMode="stretch" source={tryOnMirrorImage} style={styles.mirrorArtwork} />
      <View style={styles.mirrorHeader}>
        <Text style={styles.mirrorHeroTitle}>{step === 3 ? 'Your Look Is Ready' : 'Virtual Try-On'}</Text>
        <View style={styles.mirrorProgressRow}>
          <StepTracker step={step} variant="mirror" />
          {nextAction}
        </View>
      </View>
      <View
        style={[
          styles.mirrorGlass,
          {
            height: glassHeight,
            left: stageWidth * mirrorGlassLeftRatio,
            top: topOffset + mirrorVerticalOffset,
            width: glassWidth,
          },
        ]}>
        <View style={styles.mirrorPhotoMask}>{children}</View>
      </View>
      <View style={[styles.mirrorControls, { top: controlsTop }]}>
        {shouldShowStatus && <Text style={styles.statusText}>{status}</Text>}
        {actionRow}
      </View>
    </View>
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
            <View style={[styles.stepDot, (isActive || isComplete) && styles.stepDotActive]}>
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
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  stepTwoContent: {
    backgroundColor: 'transparent',
  },
  stepTwoBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D8AA70',
  },
  stepTwoBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
  },
  stepTwoScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(247,239,226,0.48)',
  },
  stepTwoHeader: {
    marginHorizontal: '5%',
    marginTop: 80,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
    marginTop: 10,
  },
  stepperMirror: {
    flex: 1,
    marginBottom: 0,
    marginTop: 6,
    transform: [{ scale: 0.68 }],
  },
  mirrorProgressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  stepNextButton: {
    alignItems: 'center',
    backgroundColor: '#7A4328',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
  },
  stepNextText: {
    color: closetTheme.cream,
    fontSize: 11,
    fontWeight: '900',
  },
  stepSegment: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  stepDot: {
    alignItems: 'center',
    backgroundColor: '#FFF3D7',
    borderColor: '#7A4328',
    borderRadius: 22,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  stepDotActive: {
    backgroundColor: '#F4DCAA',
  },
  stepText: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
    zIndex: 2,
  },
  stepTextActive: {
    color: closetTheme.ink,
  },
  stepLine: {
    backgroundColor: '#7A4328',
    height: 3,
    width: 92,
  },
  stepLineComplete: {
    backgroundColor: '#7A4328',
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
    backgroundColor: '#F7EFE2',
    overflow: 'hidden',
    position: 'relative',
  },
  mirrorArtwork: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    opacity: 0.55,
    transform: [{ translateY: mirrorVerticalOffset }],
    width: '100%',
    zIndex: 2,
  },
  mirrorHeader: {
    left: '5%',
    position: 'absolute',
    right: '5%',
    top: '9%',
    zIndex: 4,
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
    zIndex: 3,
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
    zIndex: 4,
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
  selectionStatus: {
    color: '#FFF3D7',
    fontSize: 10,
    marginHorizontal: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  stepTwoActionRow: {
    marginHorizontal: 22,
  },
  centeredActionRow: {
    justifyContent: 'center',
  },
  centeredMirrorButton: {
    backgroundColor: '#FFF3D7',
    borderColor: '#7A4328',
    borderWidth: 2,
    flex: 0,
    minWidth: 180,
    paddingHorizontal: 18,
  },
  centeredMirrorButtonText: {
    color: '#7A4328',
  },
  stepTwoBackButton: {
    backgroundColor: '#FFF3D7',
    borderColor: '#7A4328',
    borderWidth: 2,
  },
  stepTwoTryOnButton: {
    backgroundColor: '#7A4328',
  },
  stepTwoTryOnDisabled: {
    opacity: 1,
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
    color: '#FFF3D7',
    fontFamily: closetTypography.regularFont,
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 18,
    textAlign: 'center',
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
    paddingHorizontal: 22,
    paddingTop: 0,
  },
  cardWrap: {
    width: '47.8%',
  },
});
