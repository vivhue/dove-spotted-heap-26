import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenId } from '@/models/closet';
import { useClosetStore } from '@/stores/closet-store';
import { closetTheme } from '@/views/components/closet-theme';

type ScreenProps = {
  children: ReactNode;
  title?: string;
  onNavigate: (screen: ScreenId) => void;
  activeTab?: ScreenId;
  showBottomNav?: boolean;
  showStatus?: boolean;
};

export function AppScreen({
  activeTab = 'home',
  children,
  onNavigate,
  showBottomNav = true,
  showStatus = true,
  title,
}: ScreenProps) {
  const { currentUser } = useClosetStore();
  const userInitial = initialForUsername(currentUser?.username);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      {showStatus && <StatusRow />}
      {title && (
        <View style={styles.pageHead}>
          <Text style={styles.pageTitle}>{title}</Text>
          <AvatarButton initial={userInitial} onPress={() => onNavigate('account')} />
        </View>
      )}
      <View style={styles.body}>{children}</View>
      {showBottomNav && <BottomNav activeTab={activeTab} initial={userInitial} onNavigate={onNavigate} />}
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

export function AvatarButton({ initial, onPress }: { initial?: string; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.avatar}>
      <Text style={styles.avatarInitial}>{initial ?? 'U'}</Text>
    </Pressable>
  );
}

export function BottomNav({
  activeTab,
  initial,
  onNavigate,
}: {
  activeTab: ScreenId;
  initial?: string;
  onNavigate: (screen: ScreenId) => void;
}) {
  const tabs: Array<{ id: ScreenId; icon: ReactNode }> = [
    { id: 'home', icon: <Text style={styles.navGlyph}>⌂</Text> },
    { id: 'discover', icon: <Text style={styles.navGlyph}>✦</Text> },
    { id: 'add', icon: <Text style={styles.navGlyph}>+</Text> },
    { id: 'closet', icon: <NavTshirtIcon /> },
    { id: 'account', icon: <Text style={styles.navInitial}>{initial ?? 'U'}</Text> },
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
            <View style={styles.navIconFrame}>{tab.icon}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function initialForUsername(username?: string | null) {
  return username?.trim().charAt(0).toUpperCase() || 'U';
}

function NavTshirtIcon() {
  return (
    <View style={styles.navTshirt}>
      <View style={[styles.navTshirtSleeve, styles.navTshirtLeftSleeve]} />
      <View style={[styles.navTshirtSleeve, styles.navTshirtRightSleeve]} />
      <View style={styles.navTshirtBody} />
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
  avatarInitial: {
    color: closetTheme.cream,
    fontSize: 17,
    fontWeight: '900',
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
    paddingBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 7,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    height: 38,
    justifyContent: 'center',
    marginHorizontal: 4,
    maxWidth: 72,
  },
  navButtonActive: {
    backgroundColor: closetTheme.creamDeep,
  },
  navIconFrame: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  navGlyph: {
    color: closetTheme.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    textAlign: 'center',
  },
  navInitial: {
    color: closetTheme.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    textAlign: 'center',
  },
  navTshirt: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    width: 28,
  },
  navTshirtBody: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    height: 18,
    overflow: 'hidden',
    width: 16,
  },
  navTshirtSleeve: {
    backgroundColor: closetTheme.ink,
    borderRadius: 5,
    height: 12,
    position: 'absolute',
    top: 5,
    width: 10,
  },
  navTshirtLeftSleeve: {
    left: 3,
    transform: [{ rotate: '-26deg' }],
  },
  navTshirtRightSleeve: {
    right: 3,
    transform: [{ rotate: '26deg' }],
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
