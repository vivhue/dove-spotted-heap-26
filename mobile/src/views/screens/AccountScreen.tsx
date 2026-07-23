import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AvatarChoice, BodyMeasurements, defaultPixelAvatar, pixelAvatarOptions, SavedTrip, ScreenId, WardrobeItem } from '@/models/closet';
import { useClosetStore } from '@/stores/closet-store';
import { getTryOnHistory, TryOnResult } from '@/services/closet-api';
import { AppScreen, initialForUsername, ProfileAvatarMark } from '@/views/components/app-chrome';
import { closetTheme, closetTypography } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';
import { PixelAvatar } from '@/views/components/pixel-avatar';

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

const avatarOptions: { label: string; value: AvatarChoice }[] = [
  { label: 'Hanger', value: 'hanger' },
  { label: 'Shirt', value: 'shirt' },
  { label: 'Dress', value: 'dress' },
  { label: 'Shorts', value: 'shorts' },
  { label: 'Pants', value: 'pants' },
  { label: 'Initial', value: 'initial' },
];

type Props = {
  measurements: BodyMeasurements;
  onAuthenticated?: () => void;
  onMeasurementChange: (field: keyof BodyMeasurements, value: string) => void;
  onNavigate: (screen: ScreenId) => void;
  savedTrips: SavedTrip[];
};

type AuthMode = 'login' | 'signup';
type ProfileTab = 'looks' | 'trips';
type LooksSort = 'newest' | 'oldest';
type LooksViewMode = 'grid' | 'list';

export function AccountScreen({ measurements, onAuthenticated, onMeasurementChange, onNavigate, savedTrips }: Props) {
  const { closetItems, currentUser, logIn, logOut, signUp, updateAccountAvatar, updatePixelAvatar, wishlistItems } = useClosetStore();
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [hasLookbook, setHasLookbook] = useState(false);
  const [expandedTripIds, setExpandedTripIds] = useState<string[]>([]);
  const [isLooksSearchOpen, setIsLooksSearchOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isWornLooksOnly, setIsWornLooksOnly] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [looksSearch, setLooksSearch] = useState('');
  const [looksSort, setLooksSort] = useState<LooksSort>('newest');
  const [looksViewMode, setLooksViewMode] = useState<LooksViewMode>('grid');
  const [profileTab, setProfileTab] = useState<ProfileTab>('looks');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedGender, setSelectedGender] = useState<'female' | 'male' | null>(null);
  const [authMessage, setAuthMessage] = useState('');
  const [tryOnHistory, setTryOnHistory] = useState<TryOnResult[]>([]);
  const itemCount = closetItems.length + wishlistItems.length;
  const pixelAvatar = { ...defaultPixelAvatar, ...(currentUser?.pixelAvatar ?? {}) };

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!currentUser) {
        setTryOnHistory([]);
        return;
      }

      try {
        const history = await getTryOnHistory(currentUser.id);
        if (isMounted) setTryOnHistory(history);
      } catch {
        if (isMounted) setTryOnHistory([]);
      }
    }

    loadHistory();
    return () => { isMounted = false; };
  }, [currentUser]);

  function submitAuth() {
    const result = authMode === 'signup' ? signUp(username, password, selectedGender ?? undefined) : logIn(username, password);

    setAuthMessage(result.message);

    if (result.ok) {
      setPassword('');
      onAuthenticated?.();
    }
  }

  if (!currentUser) {
    return (
      <AppScreen activeTab="account" onNavigate={onNavigate} showBottomNav={false} title="Account">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.authPanel}>
            <View style={styles.authAvatar}>
              <ClosetIcon category="shirt" color={closetTheme.camel} accent={closetTheme.blush} size={74} />
            </View>
            <Text style={styles.authTitle}>{authMode === 'signup' ? 'Create your account' : 'Log in'}</Text>
            <Text style={styles.authSubtitle}>
              {authMode === 'signup'
                ? 'Save your closet, body profile, looks, and avatar under one username.'
                : 'Use your username and password to get back into your closet.'}
            </Text>

            <View style={styles.authFields}>
              <View style={styles.authField}>
                <Text style={styles.authLabel}>Username</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setUsername}
                  placeholder="choose a username"
                  placeholderTextColor={closetTheme.muted}
                  style={styles.authInput}
                  value={username}
                />
              </View>
              <View style={styles.authField}>
                <Text style={styles.authLabel}>Password</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setPassword}
                  placeholder="at least 6 characters"
                  placeholderTextColor={closetTheme.muted}
                  secureTextEntry
                  style={styles.authInput}
                  value={password}
                />
              </View>
              {authMode === 'signup' && (
                <View style={styles.authField}>
                  <Text style={styles.authLabel}>Profile</Text>
                  <View style={styles.genderOptions}>
                    {(['female', 'male'] as const).map((gender) => {
                      const selected = selectedGender === gender;

                      return (
                        <Pressable
                          key={gender}
                          style={[styles.genderOption, selected && styles.genderOptionSelected]}
                          onPress={() => setSelectedGender(gender)}>
                          <Text style={[styles.genderOptionText, selected && styles.genderOptionTextSelected]}>
                            {gender === 'female' ? 'Female' : 'Male'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {authMessage ? <Text style={styles.authMessage}>{authMessage}</Text> : null}

            <Pressable style={styles.primaryAuthButton} onPress={submitAuth}>
              <Text style={styles.primaryAuthText}>{authMode === 'signup' ? 'Create account' : 'Log in'}</Text>
            </Pressable>

            <Pressable
              style={styles.switchAuthButton}
              onPress={() => {
                setAuthMode((currentMode) => (currentMode === 'signup' ? 'login' : 'signup'));
                setAuthMessage('');
              }}>
              <Text style={styles.switchAuthText}>
                {authMode === 'signup' ? 'Already have an account? Log in' : 'Need an account? Create one'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      activeTab="account"
      avatarMenuActions={[
        { label: 'Edit profile', onPress: () => setIsEditingProfile(true) },
        { label: 'Share profile', onPress: () => undefined },
        { label: 'Log out', onPress: logOut },
      ]}
      onNavigate={onNavigate}
      title="Profile">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.settingsRow}>
          <View style={styles.spacer} />
          <Pressable style={styles.settingsButton}>
            <LineIcon name="⚙" color={closetTheme.ink} />
          </Pressable>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatarLarge}>
            <PixelAvatar config={pixelAvatar} scale={0.58} />
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeInitial}>{initialForUsername(currentUser.username)}</Text>
            </View>
          </View>

          <View style={styles.profileMeta}>
            <Text style={styles.name}>{currentUser.username}</Text>
            <View style={styles.stats}>
              <Stat value={String(tryOnHistory.length)} label="looks" />
              <Stat value={String(itemCount)} label="items" />
            </View>
          </View>
        </View>

        {isEditingProfile && (
          <View style={styles.editProfilePanel}>
            <View style={styles.avatarPicker}>
              <View style={styles.bodyHeader}>
                <Text style={styles.bodyTitle}>Pixel avatar</Text>
                <Text style={styles.bodyUnit}>customise</Text>
              </View>
              <View style={styles.pixelAvatarPreview}>
                <PixelAvatar config={pixelAvatar} scale={0.86} />
              </View>
              <AvatarControl
                current={pixelAvatar.hair}
                label="Hair"
                options={pixelAvatarOptions.hair}
                onSelect={(hair) => updatePixelAvatar({ hair })}
              />
              <AvatarControl
                current={pixelAvatar.face}
                label="Face"
                options={pixelAvatarOptions.faces}
                onSelect={(face) => updatePixelAvatar({ face })}
              />
              <AvatarControl
                current={pixelAvatar.eyes}
                label="Eyes"
                options={pixelAvatarOptions.eyes}
                onSelect={(eyes) => updatePixelAvatar({ eyes })}
              />
              <AvatarControl
                current={pixelAvatar.nose}
                label="Nose"
                options={pixelAvatarOptions.noses}
                onSelect={(nose) => updatePixelAvatar({ nose })}
              />
              <AvatarControl
                current={pixelAvatar.mouth}
                label="Mouth"
                options={pixelAvatarOptions.mouths}
                onSelect={(mouth) => updatePixelAvatar({ mouth })}
              />
              <AvatarControl
                current={pixelAvatar.ears}
                label="Ears"
                options={pixelAvatarOptions.ears}
                onSelect={(ears) => updatePixelAvatar({ ears })}
              />
              <AvatarControl
                current={pixelAvatar.body}
                label="Body"
                options={pixelAvatarOptions.bodies}
                onSelect={(body) => updatePixelAvatar({ body })}
              />
              <ColorControl
                current={pixelAvatar.skinColor}
                label="Skin"
                options={pixelAvatarOptions.skinColors}
                onSelect={(skinColor) => updatePixelAvatar({ skinColor })}
              />
              <ColorControl
                current={pixelAvatar.outfitColor}
                label="Outfit"
                options={pixelAvatarOptions.outfitColors}
                onSelect={(outfitColor) => updatePixelAvatar({ outfitColor })}
              />
              <View style={styles.bodyHeader}>
                <Text style={styles.bodyTitle}>Classic icon</Text>
                <Text style={styles.bodyUnit}>small</Text>
              </View>
              <View style={styles.avatarOptions}>
                {avatarOptions.map((option) => {
                  const selected = (currentUser.avatar ?? 'shirt') === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.avatarOption, selected && styles.avatarOptionSelected]}
                      onPress={() => updateAccountAvatar(option.value)}>
                      <View style={[styles.avatarOptionIcon, selected && styles.avatarOptionIconSelected]}>
                        <ProfileAvatarMark
                          avatar={option.value}
                          color={selected ? closetTheme.cream : closetTheme.ink}
                          accent={selected ? closetTheme.camel : closetTheme.blush}
                          initial={initialForUsername(currentUser.username)}
                          size={28}
                        />
                      </View>
                      <Text style={[styles.avatarOptionText, selected && styles.avatarOptionTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.bodyProfile}>
              <View style={styles.bodyHeader}>
                <Text style={styles.bodyTitle}>Body profile</Text>
                <Text style={styles.bodyUnit}>cm</Text>
              </View>
              <View style={styles.measurementFields}>
                {measurementFields.map(({ field, label }) => (
                  <View key={field} style={styles.measurementField}>
                    <Text style={styles.measurementLabel}>{label}</Text>
                    <TextInput
                      inputMode="decimal"
                      keyboardType="decimal-pad"
                      maxLength={5}
                      onChangeText={(value) => onMeasurementChange(field, value)}
                      placeholder="0"
                      placeholderTextColor={closetTheme.muted}
                      selectTextOnFocus
                      style={styles.measurementInput}
                      value={measurements[field]}
                    />
                  </View>
                ))}
              </View>
            </View>
            <Pressable style={styles.doneEditingButton} onPress={() => setIsEditingProfile(false)}>
              <Text style={styles.doneEditingText}>Done</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.tabs}>
          <Pressable onPress={() => setProfileTab('looks')}>
            <Text style={[styles.tabText, profileTab === 'looks' && styles.tabTextSelected]}>Looks</Text>
          </Pressable>
          <Pressable onPress={() => setProfileTab('trips')}>
            <Text style={[styles.tabText, profileTab === 'trips' && styles.tabTextSelected]}>Trips</Text>
          </Pressable>
        </View>

        {profileTab === 'looks' ? (
          <>
            <Pressable style={({ pressed }) => [styles.addLook, pressed && styles.pressed]} onPress={() => onNavigate('look-history')}>
              <Text style={styles.addLookText}>History</Text>
            </Pressable>

            <View style={styles.filterRow}>
              <View style={styles.sortWrap}>
                <Pressable style={styles.sortButton} onPress={() => setIsSortMenuOpen((isOpen) => !isOpen)}>
                  <Text style={styles.filterText}>{looksSort === 'newest' ? 'Newest' : 'Oldest'}</Text>
                  <Text style={styles.sortChevron}>⌄</Text>
                </Pressable>
                {isSortMenuOpen && (
                  <View style={styles.sortMenu}>
                    {(['newest', 'oldest'] as LooksSort[]).map((sort) => (
                      <Pressable
                        key={sort}
                        style={[styles.sortMenuItem, looksSort === sort && styles.sortMenuItemSelected]}
                        onPress={() => {
                          setLooksSort(sort);
                          setIsSortMenuOpen(false);
                        }}>
                        <Text style={[styles.sortMenuText, looksSort === sort && styles.sortMenuTextSelected]}>
                          {sort === 'newest' ? 'Newest first' : 'Oldest first'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.filterActions}>
                <Pressable style={styles.iconControl} onPress={() => setIsLooksSearchOpen((isOpen) => !isOpen)}>
                  <Text style={[styles.filterIcon, isLooksSearchOpen && styles.filterIconActive]}>⌕</Text>
                </Pressable>
                <Pressable style={styles.iconControl} onPress={() => setLooksViewMode((mode) => (mode === 'grid' ? 'list' : 'grid'))}>
                  <Text style={styles.filterIcon}>{looksViewMode === 'grid' ? '☷' : '☰'}</Text>
                </Pressable>
                <Pressable style={styles.selectControl} onPress={() => setIsSelectMode((isSelecting) => !isSelecting)}>
                  <Text style={[styles.selectText, isSelectMode && styles.selectTextActive]}>
                    {isSelectMode ? 'Done' : 'Select'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {isLooksSearchOpen && (
              <TextInput
                autoCapitalize="none"
                onChangeText={setLooksSearch}
                placeholder="Search looks"
                placeholderTextColor={closetTheme.muted}
                style={styles.looksSearchInput}
                value={looksSearch}
              />
            )}

            <View style={styles.pills}>
              <Pressable
                style={[styles.pill, hasLookbook && styles.pillSelected]}
                onPress={() => setHasLookbook((hasCreated) => !hasCreated)}>
                <Text numberOfLines={1} style={[styles.pillText, hasLookbook && styles.pillTextSelected]}>
                  {hasLookbook ? 'Lookbook Added' : '+ Add Lookbook'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.pill, isWornLooksOnly && styles.pillSelected]}
                onPress={() => setIsWornLooksOnly((isOnly) => !isOnly)}>
                <Text numberOfLines={1} style={[styles.pillText, isWornLooksOnly && styles.pillTextSelected]}>
                  {isWornLooksOnly ? 'All Looks' : 'Worn Looks'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.looksStatePanel}>
              <Text style={styles.looksStateText}>
                {looksViewMode === 'grid' ? 'Grid view' : 'List view'}
                {' · '}
                {isSelectMode ? 'Select mode on' : 'Browsing'}
              </Text>
              {looksSearch || isWornLooksOnly ? (
                <Text style={styles.looksStateMeta}>
                  Showing {isWornLooksOnly ? 'worn looks' : 'all looks'}
                  {looksSearch ? ` matching "${looksSearch}"` : ''}.
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <View style={styles.tripsPanel}>
            <Pressable style={styles.addTrip} onPress={() => onNavigate('trip-planner')}>
              <LineIcon name="+" color={closetTheme.ink} />
              <Text style={styles.addLookText}>Add trip</Text>
            </Pressable>
            {savedTrips.length > 0 ? (
              savedTrips.map((trip) => (
                <SavedTripCard
                  key={trip.id}
                  expanded={expandedTripIds.includes(trip.id)}
                  onToggle={() =>
                    setExpandedTripIds((currentIds) =>
                      currentIds.includes(trip.id)
                        ? currentIds.filter((id) => id !== trip.id)
                        : [...currentIds, trip.id]
                    )
                  }
                  trip={trip}
                />
              ))
            ) : (
              <View style={styles.tripEmpty}>
                <Text style={styles.tripEmptyTitle}>No trips planned yet</Text>
                <Text style={styles.tripEmptyText}>Create packing lists and outfit plans for upcoming travel.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AvatarControl<T extends string>({
  current,
  label,
  onSelect,
  options,
}: {
  current: T;
  label: string;
  onSelect: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <View style={styles.avatarControl}>
      <Text style={styles.avatarControlLabel}>{label}</Text>
      <View style={styles.avatarControlOptions}>
        {options.map((option) => {
          const selected = current === option;

          return (
            <Pressable
              key={option}
              style={[styles.avatarControlOption, selected && styles.avatarControlOptionSelected]}
              onPress={() => onSelect(option)}>
              <Text style={[styles.avatarControlOptionText, selected && styles.avatarControlOptionTextSelected]}>
                {labelOption(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ColorControl({
  current,
  label,
  onSelect,
  options,
}: {
  current: string;
  label: string;
  onSelect: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <View style={styles.avatarControl}>
      <Text style={styles.avatarControlLabel}>{label}</Text>
      <View style={styles.avatarControlOptions}>
        {options.map((option) => (
          <Pressable
            accessibilityLabel={`${label} ${option}`}
            key={option}
            style={[
              styles.colorSwatch,
              { backgroundColor: option },
              current === option && styles.colorSwatchSelected,
            ]}
            onPress={() => onSelect(option)}
          />
        ))}
      </View>
    </View>
  );
}

function labelOption(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

function SavedTripCard({
  expanded,
  onToggle,
  trip,
}: {
  expanded: boolean;
  onToggle: () => void;
  trip: SavedTrip;
}) {
  const previewItems = trip.packedItems.slice(0, 3);
  const lookCount = trip.looks.length;
  const visibleLooks = (expanded ? trip.looks : trip.looks.slice(0, 1)).map((look) => ({
    ...look,
    items: look.itemIds
      .map((itemId) => trip.packedItems.find((item) => item.id === itemId))
      .filter((item): item is WardrobeItem => Boolean(item)),
  }));

  return (
    <View style={styles.savedTripCard}>
      <View style={styles.savedTripHeader}>
        <View>
          <Text style={styles.savedTripTitle}>{trip.title}</Text>
          <Text style={styles.savedTripDate}>{trip.dateRange}</Text>
          <Text style={styles.savedTripMeta}>
            {lookCount} look{lookCount === 1 ? '' : 's'} · {trip.packedItems.length} packed
          </Text>
        </View>
        <Pressable accessibilityLabel={expanded ? 'Hide trip outfits' : 'Show trip outfits'} style={styles.savedTripOpen} onPress={onToggle}>
          <LineIcon name={expanded ? '↖' : '↗'} color={closetTheme.ink} />
        </Pressable>
      </View>

      {visibleLooks.length > 0 ? (
        <View style={styles.savedLooks}>
          {visibleLooks.map((look, index) => (
            <View key={look.id} style={styles.savedLookBlock}>
              <Text style={styles.savedLookTitle}>{look.title || `Look ${index + 1}`}</Text>
              <View style={styles.savedTripPreview}>
                {look.items.length > 0 ? (
                  look.items.map((item) => <PackedPreviewItem key={`${look.id}-${item.id}`} item={item} />)
                ) : (
                  <Text style={styles.tripEmptyText}>No clothes added to this look yet</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.savedLookBlock, styles.savedLookBlockSolo]}>
          <Text style={styles.savedLookTitle}>Packed clothes</Text>
          <View style={styles.savedTripPreview}>
            {previewItems.length > 0 ? (
              previewItems.map((item) => <PackedPreviewItem key={item.id} item={item} />)
            ) : (
              <Text style={styles.tripEmptyText}>No packed clothes yet</Text>
            )}
          </View>
        </View>
      )}

      {trip.looks.length > visibleLooks.length && (
        <Pressable onPress={onToggle}>
          <Text style={styles.savedTripMore}>
            +{trip.looks.length - visibleLooks.length} more look{trip.looks.length - visibleLooks.length === 1 ? '' : 's'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function PackedPreviewItem({ item }: { item: WardrobeItem }) {
  return (
    <View style={styles.packedPreviewItem}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.packedPreviewImage} resizeMode="contain" />
      ) : (
        <ClosetIcon category={item.category} size={34} />
      )}
      <Text numberOfLines={1} style={styles.packedPreviewLabel}>
        {item.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 22,
    paddingHorizontal: 22,
  },
  settingsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: -34,
  },
  spacer: {
    flex: 1,
  },
  authPanel: {
    alignItems: 'stretch',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 28,
    padding: 18,
  },
  authAvatar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 58,
    height: 116,
    justifyContent: 'center',
    width: 116,
  },
  authTitle: {
    color: closetTheme.ink,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 22,
    textAlign: 'center',
  },
  authSubtitle: {
    color: closetTheme.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  authFields: {
    gap: 12,
    marginTop: 24,
  },
  authField: {
    backgroundColor: closetTheme.cream,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authLabel: {
    color: closetTheme.camelDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  authInput: {
    color: closetTheme.ink,
    fontSize: 17,
    fontWeight: '800',
    minHeight: 34,
    padding: 0,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  genderOption: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  genderOptionSelected: {
    backgroundColor: closetTheme.ink,
    borderColor: closetTheme.ink,
  },
  genderOptionText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  genderOptionTextSelected: {
    color: closetTheme.cream,
  },
  authMessage: {
    color: closetTheme.blush,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  primaryAuthButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 6,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 52,
  },
  primaryAuthText: {
    color: closetTheme.cream,
    fontSize: 16,
    fontWeight: '900',
  },
  switchAuthButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  switchAuthText: {
    color: closetTheme.camelDeep,
    fontSize: 14,
    fontWeight: '900',
  },
  settingsButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
    zIndex: 3,
  },
  avatarLarge: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 104,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 104,
  },
  avatarBadge: {
    alignItems: 'center',
    backgroundColor: closetTheme.navy,
    borderColor: closetTheme.cream,
    borderRadius: 21,
    borderWidth: 3,
    bottom: 0,
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    width: 42,
  },
  avatarBadgeInitial: {
    color: closetTheme.cream,
    fontSize: 18,
    fontWeight: '900',
  },
  profileMeta: {
    flex: 1,
    gap: 18,
  },
  name: {
    color: closetTheme.ink,
    fontSize: 25,
    fontWeight: '900',
  },
  stats: {
    flexDirection: 'row',
    gap: 28,
  },
  stat: {
    minWidth: 54,
  },
  statValue: {
    color: closetTheme.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: closetTheme.ink,
    fontSize: 14,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  tabText: {
    color: closetTheme.muted,
    fontSize: 18,
    fontWeight: '900',
    minWidth: 100,
    paddingBottom: 11,
    textAlign: 'center',
  },
  tabTextSelected: {
    borderBottomColor: closetTheme.ink,
    borderBottomWidth: 3,
    color: closetTheme.ink,
  },
  bodyProfile: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  editProfilePanel: {
    gap: 10,
    marginTop: 18,
  },
  avatarPicker: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  avatarOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  pixelAvatarPreview: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 4,
    marginTop: 12,
    minHeight: 174,
    overflow: 'hidden',
  },
  avatarControl: {
    gap: 8,
    marginTop: 12,
  },
  avatarControlLabel: {
    color: closetTheme.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  avatarControlOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarControlOption: {
    backgroundColor: closetTheme.cream,
    borderColor: closetTheme.line,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  avatarControlOptionSelected: {
    backgroundColor: closetTheme.ink,
    borderColor: closetTheme.ink,
  },
  avatarControlOptionText: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  avatarControlOptionTextSelected: {
    color: closetTheme.cream,
  },
  colorSwatch: {
    borderColor: closetTheme.line,
    borderRadius: 4,
    borderWidth: 2,
    height: 30,
    width: 30,
  },
  colorSwatchSelected: {
    borderColor: closetTheme.ink,
    transform: [{ translateY: -2 }],
  },
  avatarOption: {
    alignItems: 'center',
    backgroundColor: closetTheme.cream,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 6,
    minWidth: 76,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  avatarOptionSelected: {
    backgroundColor: closetTheme.ink,
    borderColor: closetTheme.ink,
  },
  avatarOptionIcon: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  avatarOptionIconSelected: {
    opacity: 1,
  },
  avatarOptionText: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  avatarOptionTextSelected: {
    color: closetTheme.cream,
  },
  doneEditingButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 4,
    justifyContent: 'center',
    minHeight: 46,
  },
  doneEditingText: {
    color: closetTheme.cream,
    fontSize: 15,
    fontWeight: '900',
  },
  bodyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bodyTitle: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  bodyUnit: {
    color: closetTheme.camelDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  measurementFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 12,
  },
  measurementField: {
    backgroundColor: closetTheme.cream,
    borderRadius: 8,
    flexGrow: 1,
    minWidth: 92,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  measurementLabel: {
    color: closetTheme.muted,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  measurementInput: {
    color: closetTheme.ink,
    fontSize: 17,
    fontWeight: '900',
    minHeight: 26,
    padding: 0,
  },
  addLook: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 15,
  },
  addTrip: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 15,
  },
  addLookText: {
    color: closetTheme.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  tripsPanel: {
    gap: 16,
    marginTop: 20,
  },
  tripEmpty: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  tripEmptyTitle: {
    color: closetTheme.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  tripEmptyText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 5,
  },
  savedTripCard: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  savedTripHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  savedTripTitle: {
    color: closetTheme.ink,
    ...closetTypography.text,
    fontSize: 24,
    fontWeight: '700',
  },
  savedTripDate: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  savedTripMeta: {
    color: closetTheme.camelDeep,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  savedTripOpen: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  savedTripPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  savedLooks: {
    gap: 12,
    marginTop: 14,
  },
  savedLookBlock: {
    backgroundColor: closetTheme.cream,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  savedLookBlockSolo: {
    marginTop: 14,
  },
  savedLookTitle: {
    color: closetTheme.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  savedTripMore: {
    color: closetTheme.camelDeep,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'right',
  },
  packedPreviewItem: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 6,
    borderWidth: 1,
    height: 106,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 6,
    width: 86,
  },
  packedPreviewImage: {
    height: 72,
    width: 74,
  },
  packedPreviewLabel: {
    color: closetTheme.ink,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
    maxWidth: 72,
    textAlign: 'center',
  },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    position: 'relative',
    zIndex: 3,
  },
  sortWrap: {
    position: 'relative',
    width: 132,
    zIndex: 4,
  },
  sortButton: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 34,
  },
  sortChevron: {
    color: closetTheme.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
    marginLeft: 2,
  },
  filterText: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  sortMenu: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 36,
    width: 132,
    zIndex: 5,
  },
  sortMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sortMenuItemSelected: {
    backgroundColor: closetTheme.creamDeep,
  },
  sortMenuText: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  sortMenuTextSelected: {
    color: closetTheme.camelDeep,
  },
  filterActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  iconControl: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  filterIcon: {
    color: closetTheme.ink,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
  },
  filterIconActive: {
    color: closetTheme.camelDeep,
  },
  selectControl: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    minWidth: 58,
  },
  selectText: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  selectTextActive: {
    color: closetTheme.camelDeep,
  },
  looksSearchInput: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    color: closetTheme.ink,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
  },
  pill: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 22,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  pillSelected: {
    backgroundColor: closetTheme.ink,
  },
  pillText: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  pillTextSelected: {
    color: closetTheme.cream,
  },
  looksStatePanel: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  looksStateText: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  looksStateMeta: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  historyLoading: {
    marginVertical: 28,
  },
  historyPage: {
    minHeight: 360,
    paddingTop: 22,
  },
  historyTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  historyBack: {
    color: closetTheme.ink,
    fontSize: 34,
    lineHeight: 36,
  },
  historyTitle: {
    color: closetTheme.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
  historyTabs: {
    backgroundColor: '#F4F3F3',
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 18,
    padding: 4,
  },
  historyTab: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 8,
  },
  historyTabSelected: {
    backgroundColor: closetTheme.white,
    shadowColor: '#000000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  historyTabText: {
    color: closetTheme.muted,
    fontSize: 15,
    fontWeight: '800',
  },
  historyTabTextSelected: {
    color: closetTheme.ink,
  },
  historyEmptyPanel: {
    alignItems: 'center',
    borderColor: closetTheme.line,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 220,
    padding: 24,
  },
  historyEmptyTitle: {
    color: closetTheme.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  historyEmpty: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 24,
    textAlign: 'center',
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  historyList: {
    flexDirection: 'column',
  },
  historyCard: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '48%',
  },
  historyCardList: {
    flexDirection: 'row',
    width: '100%',
  },
  historyImage: {
    aspectRatio: 0.72,
    backgroundColor: closetTheme.creamDeep,
    width: '100%',
  },
  historyImageList: {
    aspectRatio: 0.72,
    height: 112,
    width: 80,
  },
  historyMeta: {
    flex: 1,
    justifyContent: 'center',
    padding: 10,
  },
  historyName: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  historyDate: {
    color: closetTheme.muted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
});
