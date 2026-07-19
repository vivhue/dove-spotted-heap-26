import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenId } from '@/models/closet';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';

type ScreenProps = {
  children: ReactNode;
  title?: string;
  onNavigate: (screen: ScreenId) => void;
  activeTab?: ScreenId;
  showStatus?: boolean;
};

export function AppScreen({
  activeTab = 'home',
  children,
  onNavigate,
  showStatus = true,
  title,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      {showStatus && <StatusRow />}
      {title && (
        <View style={styles.pageHead}>
          <Text style={styles.pageTitle}>{title}</Text>
          <AvatarButton onPress={() => onNavigate('account')} />
        </View>
      )}
      <View style={styles.body}>{children}</View>
      <BottomNav activeTab={activeTab} onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

export function StatusRow() {
  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>9:41</Text>
      <Text style={styles.statusText}>||||  ^  |||</Text>
    </View>
  );
}

export function AvatarButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.avatar}>
      <LineIcon name="u" color={closetTheme.cream} />
    </Pressable>
  );
}

export function BottomNav({
  activeTab,
  onNavigate,
}: {
  activeTab: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}) {
  const tabs: Array<{ id: ScreenId; icon: ReactNode }> = [
    { id: 'home', icon: <LineIcon name="⌂" /> },
    { id: 'discover', icon: <LineIcon name="✦" /> },
    { id: 'add', icon: <LineIcon name="+" /> },
    { id: 'closet', icon: <ClosetIcon size={25} /> },
    { id: 'account', icon: <LineIcon name="u" /> },
  ];

  return (
    <View style={styles.navbar}>
      {tabs.map((tab) => {
        const selected =
          activeTab === tab.id || (activeTab === 'wishlist' && tab.id === 'closet');

        return (
          <Pressable
            key={tab.id}
            onPress={() => onNavigate(tab.id)}
            style={[styles.navButton, selected && styles.navButtonActive]}>
            {tab.icon}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  children,
  selected = false,
}: {
  children: ReactNode;
  selected?: boolean;
}) {
  return (
    <View style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: closetTheme.cream,
  },
  status: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 8,
    paddingBottom: 4,
  },
  statusText: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  pageHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  pageTitle: {
    color: closetTheme.ink,
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '700',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: closetTheme.navy,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  body: {
    flex: 1,
  },
  navbar: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderTopColor: closetTheme.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 48,
  },
  navButtonActive: {
    backgroundColor: closetTheme.creamDeep,
  },
  chip: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: closetTheme.ink,
    borderColor: closetTheme.ink,
  },
  chipText: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: closetTheme.cream,
  },
});
