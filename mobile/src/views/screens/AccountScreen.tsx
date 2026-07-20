import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BodyMeasurements, ScreenId } from '@/models/closet';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';

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
  measurements: BodyMeasurements;
  onAuthenticated?: () => void;
  onMeasurementChange: (field: keyof BodyMeasurements, value: string) => void;
  onNavigate: (screen: ScreenId) => void;
};

type AuthMode = 'login' | 'signup';
type ProfileTab = 'looks' | 'trips';

export function AccountScreen({ measurements, onAuthenticated, onMeasurementChange, onNavigate }: Props) {
  const { closetItems, currentUser, logIn, logOut, signUp, wishlistItems } = useClosetStore();
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<ProfileTab>('looks');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const itemCount = closetItems.length + wishlistItems.length;

  function submitAuth() {
    const result = authMode === 'signup' ? signUp(username, password) : logIn(username, password);

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
                  placeholderTextColor="#B9AB94"
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
                  placeholderTextColor="#B9AB94"
                  secureTextEntry
                  style={styles.authInput}
                  value={password}
                />
              </View>
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
    <AppScreen activeTab="account" onNavigate={onNavigate} title="Profile">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.settingsRow}>
          <View style={styles.spacer} />
          <Pressable style={styles.settingsButton}>
            <LineIcon name="⚙" color={closetTheme.ink} />
          </Pressable>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatarLarge}>
            <ClosetIcon category="shirt" color={closetTheme.camel} accent={closetTheme.blush} size={68} />
            <View style={styles.avatarBadge}>
              <LineIcon name="u" color={closetTheme.cream} />
            </View>
          </View>

          <View style={styles.profileMeta}>
            <Text style={styles.name}>{currentUser.username}</Text>
            <View style={styles.stats}>
              <Stat value="0" label="looks" />
              <Stat value="0" label="avatars" />
              <Stat value={String(itemCount)} label="items" />
            </View>
          </View>
        </View>

        <Text style={styles.followText}>0 followers   0 following</Text>
        <Text style={styles.memberText}>{formatMemberSince(currentUser.createdAt)}</Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionButton} onPress={() => setIsEditingProfile((isEditing) => !isEditing)}>
            <Text style={styles.actionText}>Edit profile</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionText}>Share profile</Text>
          </Pressable>
          <Pressable style={styles.iconAction}>
            <LineIcon name="+" color={closetTheme.ink} />
          </Pressable>
        </View>

        <Pressable style={styles.logoutButton} onPress={logOut}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>

        <Pressable style={styles.completion}>
          <View>
            <Text style={styles.completionTitle}>Your profile is almost complete</Text>
            <Text style={styles.completionText}>Add a photo to finish setting up your account</Text>
          </View>
          <LineIcon name="›" color={closetTheme.ink} />
        </Pressable>

        {isEditingProfile && (
          <View style={styles.editProfilePanel}>
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
                      placeholderTextColor="#B9AB94"
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
            <Pressable style={styles.addLook} onPress={() => onNavigate('try-on')}>
              <LineIcon name="+" color={closetTheme.ink} />
              <Text style={styles.addLookText}>Add look</Text>
            </Pressable>

            <View style={styles.filterRow}>
              <Text style={styles.filterText}>Newest⌄</Text>
              <View style={styles.filterActions}>
                <LineIcon name="⌕" color={closetTheme.ink} />
                <LineIcon name="☷" color={closetTheme.ink} />
                <Text style={styles.selectText}>Select</Text>
              </View>
            </View>

            <View style={styles.pills}>
              <Pressable style={styles.pill}>
                <Text style={styles.pillText}>+ Add Lookbook</Text>
              </Pressable>
              <Pressable style={styles.pill}>
                <Text style={styles.pillText}>Worn Looks</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.tripsPanel}>
            <Pressable style={styles.addTrip} onPress={() => onNavigate('trip-planner')}>
              <LineIcon name="+" color={closetTheme.ink} />
              <Text style={styles.addLookText}>Add trip</Text>
            </Pressable>
            <View style={styles.tripEmpty}>
              <Text style={styles.tripEmptyTitle}>No trips planned yet</Text>
              <Text style={styles.tripEmptyText}>Create packing lists and outfit plans for upcoming travel.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function formatMemberSince(createdAt: string) {
  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return 'Member since today';
  }

  const month = createdDate.toLocaleString('en', { month: 'short' });
  const year = String(createdDate.getFullYear()).slice(-2);

  return `Member since ${month} '${year}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    gap: 22,
    marginTop: 38,
  },
  avatarLarge: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 58,
    height: 116,
    justifyContent: 'center',
    position: 'relative',
    width: 116,
  },
  avatarBadge: {
    alignItems: 'center',
    backgroundColor: closetTheme.navy,
    borderColor: closetTheme.cream,
    borderRadius: 23,
    borderWidth: 3,
    bottom: 0,
    height: 46,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    width: 46,
  },
  profileMeta: {
    flex: 1,
    gap: 22,
  },
  name: {
    color: closetTheme.ink,
    fontSize: 25,
    fontWeight: '900',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  followText: {
    color: closetTheme.ink,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 24,
  },
  memberText: {
    color: closetTheme.muted,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 3,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  actionText: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 3,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 48,
  },
  logoutText: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  iconAction: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 3,
    borderWidth: 1,
    justifyContent: 'center',
    width: 52,
  },
  completion: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    padding: 16,
  },
  completionTitle: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  completionText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 28,
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
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  filterText: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  filterActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
  },
  selectText: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  pill: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pillText: {
    color: closetTheme.ink,
    fontSize: 14,
    fontWeight: '900',
  },
});
