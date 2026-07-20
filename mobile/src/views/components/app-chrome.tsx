import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarChoice, ScreenId } from '@/models/closet';
import { useClosetStore } from '@/stores/closet-store';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';

type ScreenProps = {
  avatarMenuActions?: AvatarMenuAction[];
  children: ReactNode;
  notifications?: AppNotification[];
  title?: string;
  onNavigate: (screen: ScreenId) => void;
  activeTab?: ScreenId;
  showBottomNav?: boolean;
  showStatus?: boolean;
};

export type AvatarMenuAction = {
  label: string;
  onPress: () => void;
};

export type AppNotification = {
  id: string;
  text: string;
  title: string;
};

export function AppScreen({
  activeTab = 'home',
  avatarMenuActions,
  children,
  notifications,
  onNavigate,
  showBottomNav = true,
  showStatus = true,
  title,
}: ScreenProps) {
  const { currentUser } = useClosetStore();
  const userInitial = initialForUsername(currentUser?.username);
  const userAvatar = currentUser?.avatar ?? 'shirt';
  const defaultNotifications = useAppNotifications(currentUser?.username);
  const shownNotifications = notifications ?? defaultNotifications;
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const hasAvatarMenu = Boolean(avatarMenuActions?.length);
  const hasUnreadNotification = shownNotifications.some((notification) => !readNotificationIds.includes(notification.id));

  function pressAvatar() {
    if (hasAvatarMenu) {
      setIsAvatarMenuOpen((isOpen) => !isOpen);
      return;
    }

    onNavigate('account');
  }

  return (
    <SafeAreaView style={styles.safe}>
      {showStatus && <StatusRow />}
      {title && (
        <View style={styles.pageHead}>
          <Text style={styles.pageTitle}>{title}</Text>
          {isAvatarMenuOpen && <Pressable style={styles.avatarMenuBackdrop} onPress={() => setIsAvatarMenuOpen(false)} />}
          <View style={styles.pageActions}>
            <NotificationButton
              unread={hasUnreadNotification}
              onPress={() => {
                setIsNotificationsOpen((isOpen) => !isOpen);
                setReadNotificationIds(shownNotifications.map((notification) => notification.id));
              }}
            />
            <AvatarButton avatar={userAvatar} initial={userInitial} onPress={pressAvatar} />
          </View>
          {isNotificationsOpen && <NotificationMenu notifications={shownNotifications} />}
          {isAvatarMenuOpen && avatarMenuActions && (
            <View style={styles.avatarMenu}>
              {avatarMenuActions.map((action, index) => (
                <Pressable
                  key={action.label}
                  style={[styles.avatarMenuItem, index === avatarMenuActions.length - 1 && styles.avatarMenuItemLast]}
                  onPress={() => {
                    setIsAvatarMenuOpen(false);
                    action.onPress();
                  }}>
                  <Text style={styles.avatarMenuText}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
      <View style={styles.body}>{children}</View>
      {showBottomNav && <BottomNav activeTab={activeTab} avatar={userAvatar} initial={userInitial} onNavigate={onNavigate} />}
    </SafeAreaView>
  );
}

export function StatusRow() {
  const [currentTime, setCurrentTime] = useState(() => formatStatusTime(new Date()));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatStatusTime(new Date())), 30000);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>{currentTime}</Text>
      <Text style={styles.statusText}>||||  ^  |||</Text>
    </View>
  );
}

export function AvatarButton({
  initial,
  onPress,
}: {
  avatar?: AvatarChoice;
  initial?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.avatar}>
      <Text style={styles.avatarInitial}>{initial ?? 'U'}</Text>
    </Pressable>
  );
}

export function NotificationButton({
  onPress,
  unread = true,
}: {
  onPress?: () => void;
  unread?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.notificationButton}>
      <BellIcon />
      {unread && <View style={styles.notificationDot} />}
    </Pressable>
  );
}

export function useAppNotifications(username?: string | null) {
  const [previousSeenAt] = useState(() => readLastSeenAt(username));

  useEffect(() => {
    if (!username || !canUseLocalStorage()) {
      return;
    }

    globalThis.localStorage.setItem(lastSeenKey(username), new Date().toISOString());
  }, [username]);

  return useMemo(() => buildNotifications(previousSeenAt), [previousSeenAt]);
}

export function BottomNav({
  activeTab,
  avatar = 'initial',
  initial,
  onNavigate,
}: {
  activeTab: ScreenId;
  avatar?: AvatarChoice;
  initial?: string;
  onNavigate: (screen: ScreenId) => void;
}) {
  const tabs: Array<{ id: ScreenId; icon: ReactNode }> = [
    { id: 'home', icon: <Text style={styles.navGlyph}>⌂</Text> },
    { id: 'discover', icon: <Text style={styles.navGlyph}>✦</Text> },
    { id: 'add', icon: <NavAddIcon /> },
    { id: 'closet', icon: <NavClosetIcon /> },
    { id: 'account', icon: <Text style={styles.navInitial}>{initial ?? 'U'}</Text> },
  ];

  return (
    <View style={styles.navbar}>
      <View pointerEvents="none" style={styles.navAddBump} />
      {tabs.map((tab) => {
        const selected =
          activeTab === tab.id || (activeTab === 'wishlist' && tab.id === 'closet');

        return (
          <Pressable
            key={tab.id}
            onPress={() => onNavigate(tab.id)}
            style={[
              styles.navButton,
              tab.id === 'add' && styles.navAddButton,
              selected && tab.id !== 'add' && styles.navButtonActive,
            ]}>
            <View style={[styles.navIconFrame, tab.id === 'add' && styles.navAddIconFrame]}>{tab.icon}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function initialForUsername(username?: string | null) {
  return username?.trim().charAt(0).toUpperCase() || 'U';
}

function NotificationMenu({ notifications }: { notifications: AppNotification[] }) {
  return (
    <View style={styles.notificationMenu}>
      {notifications.length > 0 ? (
        notifications.map((notification) => (
          <View key={notification.id} style={styles.notificationMenuItem}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationText}>{notification.text}</Text>
          </View>
        ))
      ) : (
        <View style={styles.notificationMenuItem}>
          <Text style={styles.notificationTitle}>All caught up</Text>
          <Text style={styles.notificationText}>No reminders right now.</Text>
        </View>
      )}
    </View>
  );
}

function buildNotifications(previousSeenAt: string) {
  const today = new Date();
  const notifications: AppNotification[] = [];
  const isStartOfWeek = today.getDay() === 0 || today.getDay() === 1;

  if (isStartOfWeek) {
    notifications.push({
      id: 'weekly-outfit-plan',
      text: 'Plan a few looks now so your week starts easier.',
      title: 'Plan your week outfits',
    });
  }

  if (canUseLocalStorage() && globalThis.localStorage.getItem('bove-closet-trip-reminder') === '1') {
    notifications.push({
      id: 'trip-planning',
      text: 'Add activities or review your packed looks before you travel.',
      title: 'Continue trip planning',
    });
  }

  if (previousSeenAt) {
    const lastSeenDate = new Date(previousSeenAt);
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    if (!Number.isNaN(lastSeenDate.getTime()) && today.getTime() - lastSeenDate.getTime() >= weekMs) {
      notifications.unshift({
        id: 'hiatus-return',
        text: 'Your closet missed you. Check what still works for your week.',
        title: 'Welcome back',
      });
    }
  }

  return notifications;
}

function readLastSeenAt(username?: string | null) {
  if (!username || !canUseLocalStorage()) {
    return '';
  }

  return globalThis.localStorage.getItem(lastSeenKey(username)) ?? '';
}

function lastSeenKey(username: string) {
  return `bove-closet-last-seen:${username.toLowerCase()}`;
}

function canUseLocalStorage() {
  return typeof globalThis !== 'undefined' && 'localStorage' in globalThis;
}

export function ProfileAvatarMark({
  accent = closetTheme.blush,
  avatar = 'shirt',
  color = closetTheme.camel,
  initial,
  size = 48,
}: {
  accent?: string;
  avatar?: AvatarChoice;
  color?: string;
  initial?: string;
  size?: number;
}) {
  if (avatar === 'initial') {
    return <Text style={[styles.profileAvatarInitial, { color, fontSize: Math.round(size * 0.58), lineHeight: size }]}>{initial ?? 'U'}</Text>;
  }

  if (avatar === 'hanger') {
    return <MiniHanger color={color} size={size} />;
  }

  const category = avatar === 'bag' ? 'bags' : avatar === 'shoe' ? 'shoes' : 'tops';

  return <ClosetIcon category={category} color={color} accent={accent} size={size} />;
}

function NavAddIcon() {
  return (
    <View style={styles.navAddCircle}>
      <View style={styles.navAddLineHorizontal} />
      <View style={styles.navAddLineVertical} />
    </View>
  );
}

function NavClosetIcon() {
  return (
    <View style={styles.navCloset}>
      <View style={[styles.navClosetDoor, styles.navClosetLeftDoor]}>
        <View style={styles.navClosetHandle} />
      </View>
      <View style={[styles.navClosetDoor, styles.navClosetRightDoor]}>
        <View style={styles.navClosetHandle} />
      </View>
    </View>
  );
}

function BellIcon() {
  return (
    <View style={styles.bellIcon}>
      <View style={styles.bellDome} />
      <View style={styles.bellBase} />
      <View style={styles.bellClapper} />
    </View>
  );
}

function MiniHanger({ color, size }: { color: string; size: number }) {
  const barHeight = Math.max(3, Math.round(size * 0.08));
  const armHeight = Math.max(3, Math.round(size * 0.09));
  const hookStroke = Math.max(2, Math.round(size * 0.08));

  return (
    <View style={[styles.miniHanger, { height: size, width: size }]}>
      <View style={[styles.miniHookStem, { backgroundColor: color, height: size * 0.24, width: hookStroke }]} />
      <View
        style={[
          styles.miniHook,
          {
            borderColor: color,
            borderWidth: hookStroke,
            borderLeftWidth: 0,
            height: size * 0.24,
            width: size * 0.22,
          },
        ]}
      />
      <View style={[styles.miniNeck, { backgroundColor: color, height: barHeight, width: size * 0.2 }]} />
      <View style={[styles.miniArm, styles.miniArmLeft, { backgroundColor: color, height: armHeight, width: size * 0.43 }]} />
      <View style={[styles.miniArm, styles.miniArmRight, { backgroundColor: color, height: armHeight, width: size * 0.43 }]} />
      <View style={[styles.miniBar, { backgroundColor: color, height: barHeight, width: size * 0.72 }]} />
    </View>
  );
}

function formatStatusTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
    elevation: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 14,
    zIndex: 20,
  },
  pageTitle: {
    color: closetTheme.ink,
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '700',
  },
  pageActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  notificationButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    width: 36,
  },
  notificationDot: {
    backgroundColor: '#D24531',
    borderColor: closetTheme.white,
    borderRadius: 5,
    borderWidth: 1,
    height: 9,
    position: 'absolute',
    right: 8,
    top: 8,
    width: 9,
  },
  notificationMenu: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    position: 'absolute',
    right: 22,
    top: 58,
    width: 230,
    zIndex: 30,
  },
  notificationMenuItem: {
    borderBottomColor: closetTheme.line,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  notificationTitle: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  notificationText: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 3,
  },
  bellIcon: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    position: 'relative',
    width: 22,
  },
  bellDome: {
    borderColor: closetTheme.ink,
    borderRadius: 8,
    borderWidth: 3,
    borderBottomWidth: 0,
    height: 13,
    position: 'absolute',
    top: 3,
    width: 14,
  },
  bellBase: {
    backgroundColor: closetTheme.ink,
    borderRadius: 2,
    height: 3,
    position: 'absolute',
    top: 15,
    width: 18,
  },
  bellClapper: {
    backgroundColor: closetTheme.ink,
    borderRadius: 2,
    height: 4,
    position: 'absolute',
    top: 18,
    width: 4,
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
  profileAvatarInitial: {
    fontWeight: '900',
    textAlign: 'center',
  },
  miniHanger: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniHookStem: {
    borderRadius: 4,
    position: 'absolute',
    top: '14%',
  },
  miniHook: {
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
    position: 'absolute',
    right: '33%',
    top: '2%',
  },
  miniNeck: {
    borderRadius: 4,
    position: 'absolute',
    top: '36%',
  },
  miniArm: {
    borderRadius: 4,
    position: 'absolute',
    top: '49%',
  },
  miniArmLeft: {
    left: '16%',
    transform: [{ rotate: '-30deg' }],
  },
  miniArmRight: {
    right: '16%',
    transform: [{ rotate: '30deg' }],
  },
  miniBar: {
    borderRadius: 4,
    position: 'absolute',
    top: '68%',
  },
  avatarMenu: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 24,
    position: 'absolute',
    right: 22,
    shadowColor: closetTheme.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    top: 58,
    width: 190,
    zIndex: 999,
  },
  avatarMenuBackdrop: {
    bottom: -720,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 998,
  },
  avatarMenuItem: {
    borderBottomColor: closetTheme.line,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatarMenuItemLast: {
    borderBottomWidth: 0,
  },
  avatarMenuText: {
    color: closetTheme.ink,
    fontSize: 14,
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
    justifyContent: 'space-around',
    minHeight: 84,
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    position: 'relative',
  },
  navAddBump: {
    alignSelf: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 30,
    borderTopWidth: 1,
    height: 60,
    position: 'absolute',
    top: -20,
    width: 60,
    zIndex: 0,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 13,
    height: 56,
    justifyContent: 'center',
    width: 50,
    zIndex: 1,
  },
  navButtonActive: {
    backgroundColor: closetTheme.creamDeep,
  },
  navAddButton: {
    borderRadius: 34,
    height: 56,
    width: 68,
    zIndex: 2,
  },
  navGlyph: {
    color: closetTheme.ink,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  navIconFrame: {
    alignItems: 'center',
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  navAddIconFrame: {
    height: 56,
    width: 56,
  },
  navInitial: {
    color: closetTheme.ink,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  navAddCircle: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    position: 'relative',
    width: 56,
  },
  navAddLineHorizontal: {
    backgroundColor: closetTheme.cream,
    borderRadius: 2,
    height: 3,
    position: 'absolute',
    width: 22,
  },
  navAddLineVertical: {
    backgroundColor: closetTheme.cream,
    borderRadius: 2,
    height: 22,
    position: 'absolute',
    width: 3,
  },
  navCloset: {
    flexDirection: 'row',
    height: 24,
    overflow: 'hidden',
    width: 26,
  },
  navClosetDoor: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    flex: 1,
    justifyContent: 'center',
  },
  navClosetLeftDoor: {
    borderBottomLeftRadius: 3,
    borderRightColor: closetTheme.white,
    borderRightWidth: 1,
    borderTopLeftRadius: 3,
  },
  navClosetRightDoor: {
    borderBottomRightRadius: 3,
    borderLeftColor: closetTheme.white,
    borderLeftWidth: 1,
    borderTopRightRadius: 3,
  },
  navClosetHandle: {
    backgroundColor: closetTheme.cream,
    borderRadius: 2,
    height: 5,
    width: 3,
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
