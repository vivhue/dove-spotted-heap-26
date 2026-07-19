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
  onMeasurementChange: (field: keyof BodyMeasurements, value: string) => void;
  onNavigate: (screen: ScreenId) => void;
};

export function AccountScreen({ measurements, onMeasurementChange, onNavigate }: Props) {
  const { closetItems, wishlistItems } = useClosetStore();
  const itemCount = closetItems.length + wishlistItems.length;

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
            <ClosetIcon category="tops" color={closetTheme.camel} accent={closetTheme.blush} size={68} />
            <View style={styles.avatarBadge}>
              <LineIcon name="u" color={closetTheme.cream} />
            </View>
          </View>

          <View style={styles.profileMeta}>
            <Text style={styles.name}>Aishani</Text>
            <View style={styles.stats}>
              <Stat value="0" label="looks" />
              <Stat value="0" label="avatars" />
              <Stat value={String(itemCount)} label="items" />
            </View>
          </View>
        </View>

        <Text style={styles.followText}>0 followers   0 following</Text>
        <Text style={styles.memberText}>Member since May '26</Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionText}>Edit profile</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionText}>Share profile</Text>
          </Pressable>
          <Pressable style={styles.iconAction}>
            <LineIcon name="+" color={closetTheme.ink} />
          </Pressable>
        </View>

        <Pressable style={styles.completion}>
          <View>
            <Text style={styles.completionTitle}>Your profile is almost complete</Text>
            <Text style={styles.completionText}>Add a photo to finish setting up your account</Text>
          </View>
          <LineIcon name="›" color={closetTheme.ink} />
        </Pressable>

        <View style={styles.tabs}>
          <Text style={[styles.tabText, styles.tabTextSelected]}>Looks</Text>
          <Text style={styles.tabText}>Body</Text>
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
                  placeholderTextColor="#B9AB94"
                  selectTextOnFocus
                  style={styles.measurementInput}
                  value={measurements[field]}
                />
              </View>
            ))}
          </View>
        </View>

        <Pressable style={styles.addLook}>
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
    marginTop: 18,
    padding: 14,
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
  addLookText: {
    color: closetTheme.ink,
    fontSize: 17,
    fontWeight: '900',
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
