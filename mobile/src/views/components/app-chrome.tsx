import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarChoice, ScreenId } from '@/models/closet';
import { ScheduledOutfits, useClosetStore } from '@/stores/closet-store';
import { getCachedWeatherSummary } from '@/services/weather-recommendation';
import { closetPaperBackground, closetTheme, closetTypography } from '@/views/components/closet-theme';
import { CalendarIcon, ClosetIcon } from '@/views/components/closet-icons';
import { PixelAvatar } from '@/views/components/pixel-avatar';

const plannerWeatherLocation = 'Singapore';

type ScreenProps = {
  avatarMenuActions?: AvatarMenuAction[];
  children: ReactNode;
  notifications?: AppNotification[];
  title?: string;
  titleOffsetY?: number;
  onNavigate: (screen: ScreenId) => void;
  activeTab?: ScreenId;
  bottomNavOverlay?: boolean;
  showBottomNav?: boolean;
  showStatus?: boolean;
  showStylist?: boolean;
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
  activeTab,
  avatarMenuActions,
  children,
  notifications,
  onNavigate,
  showStatus = true,
  showStylist = true,
  title,
  titleOffsetY = 0,
}: ScreenProps) {
  const { closetItems, currentUser, scheduledOutfits } = useClosetStore();
  const userInitial = initialForUsername(currentUser?.username);
  const userAvatar = currentUser?.avatar ?? 'shirt';
  const defaultNotifications = useAppNotifications(currentUser?.username, closetItems.length, scheduledOutfits);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardAvoiding}>
        {showStatus && <StatusRow />}
        <View pointerEvents="box-none" style={styles.topShortcuts}>
          <Pressable accessibilityLabel="Go home" style={styles.homeShortcut} onPress={() => onNavigate('home')}>
            <PixelHomeIcon color={closetTheme.ink} />
          </Pressable>
          {isAvatarMenuOpen && <Pressable style={styles.avatarMenuBackdrop} onPress={() => setIsAvatarMenuOpen(false)} />}
          <View style={styles.topShortcutActions}>
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
        {title && (
          <View style={[styles.pageHead, titleOffsetY !== 0 && { paddingTop: Math.max(0, 78 + titleOffsetY) }]}>
            <Text style={styles.pageTitle}>{title}</Text>
          </View>
        )}
        {shownNotifications.length > 0 && <NotificationStrip notifications={shownNotifications} />}
        <View style={styles.body}>{children}</View>
      </KeyboardAvoidingView>
      {showStylist && <BottomAvatarTrack bottomOffset={18} isMoving={activeTab === 'home'} onPress={() => onNavigate('discover')} />}
    </SafeAreaView>
  );
}

const avatarTrackTripDurationMs = 22000;

function BottomAvatarTrack({ bottomOffset, isMoving, onPress }: { bottomOffset: number; isMoving: boolean; onPress: () => void }) {
  const { currentUser, guidedMode } = useClosetStore();
  const [walkProgress] = useState(() => new Animated.Value(0));
  const [trackWidth, setTrackWidth] = useState(0);
  const [showHelpBubble, setShowHelpBubble] = useState(false);
  const avatarWidth = 58;
  const travelDistance = Math.max(0, trackWidth - avatarWidth);
  const walkingTranslateX = walkProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travelDistance],
  });

  function rememberTrackWidth(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  useEffect(() => {
    walkProgress.setValue(0);
    setShowHelpBubble(false);

    if (!isMoving) {
      return;
    }

    let hideBubbleTimer: ReturnType<typeof setTimeout> | undefined;
    const showBubble = () => {
      setShowHelpBubble(true);
      if (hideBubbleTimer) clearTimeout(hideBubbleTimer);
      hideBubbleTimer = setTimeout(() => setShowHelpBubble(false), 4500);
    };
    let laterCenterCrossings: ReturnType<typeof setInterval> | undefined;
    const firstCenterCrossing = setTimeout(() => {
      showBubble();
      laterCenterCrossings = setInterval(showBubble, avatarTrackTripDurationMs);
    }, avatarTrackTripDurationMs / 2);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(walkProgress, {
          duration: avatarTrackTripDurationMs,
          easing: Easing.inOut(Easing.quad),
          isInteraction: false,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(walkProgress, {
          duration: avatarTrackTripDurationMs,
          easing: Easing.inOut(Easing.quad),
          isInteraction: false,
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      clearTimeout(firstCenterCrossing);
      if (laterCenterCrossings) clearInterval(laterCenterCrossings);
      if (hideBubbleTimer) clearTimeout(hideBubbleTimer);
    };
  }, [isMoving, walkProgress]);

  return (
    <View pointerEvents="box-none" style={[styles.avatarTrack, { bottom: bottomOffset }]} onLayout={rememberTrackWidth}>
      <View pointerEvents="none" style={styles.avatarTrackLine} />
      <Animated.View style={[styles.walkingAvatar, { transform: [{ translateX: isMoving ? walkingTranslateX : 0 }] }]}>
        {guidedMode && showHelpBubble && (
          <View pointerEvents="none" style={styles.avatarHelpBubble}>
            <Text style={styles.avatarHelpText}>Tap here for help</Text>
            <View style={styles.avatarHelpTailBorder} />
          </View>
        )}
        <Pressable accessibilityLabel="Open Style chat" style={styles.walkingAvatarButton} onPress={onPress}>
          <PixelAvatar config={currentUser?.pixelAvatar} scale={0.34} />
        </Pressable>
      </Animated.View>
    </View>
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
  unread = false,
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

export function useAppNotifications(username?: string | null, closetItemCount = 0, scheduledOutfits: ScheduledOutfits = {}) {
  const [previousSeenAt, setPreviousSeenAt] = useState(() => readLastSeenAt(username));

  useEffect(() => {
    if (!username || !canUseLocalStorage()) {
      return;
    }

    globalThis.localStorage.setItem(lastSeenKey(username), new Date().toISOString());
  }, [username]);

  useEffect(() => {
    setPreviousSeenAt(readLastSeenAt(username));
  }, [username]);

  return useMemo(
    () => buildNotifications(previousSeenAt, closetItemCount, scheduledOutfits),
    [closetItemCount, previousSeenAt, scheduledOutfits]
  );
}

export function BottomNav({
  activeTab,
  overlay = false,
  onNavigate,
}: {
  activeTab: ScreenId;
  avatar?: AvatarChoice;
  initial?: string;
  overlay?: boolean;
  onNavigate: (screen: ScreenId) => void;
}) {
  const tabs: { icon: (selected: boolean) => ReactNode; id: ScreenId; label: string; matches: ScreenId[] }[] = [
    {
      id: 'home',
      label: 'Home',
      matches: ['home'],
      icon: (selected) => <PixelHomeIcon color={selected ? closetTheme.camelDeep : closetTheme.muted} />,
    },
    {
      id: 'closet',
      label: 'Closet',
      matches: ['closet', 'wishlist', 'add'],
      icon: (selected) => <PixelTshirtIcon color={selected ? closetTheme.camelDeep : closetTheme.muted} />,
    },
    {
      id: 'try-on',
      label: 'Try-On',
      matches: ['try-on'],
      icon: (selected) => <TryOnNavIcon color={selected ? closetTheme.camelDeep : closetTheme.muted} />,
    },
    {
      id: 'discover',
      label: 'Style',
      matches: ['discover'],
      icon: (selected) => <SpeechBubbleIcon color={selected ? closetTheme.camelDeep : closetTheme.muted} />,
    },
    {
      id: 'calendar',
      label: 'Planner',
      matches: ['calendar', 'trip-planner'],
      icon: (selected) => <CalendarIcon color={selected ? closetTheme.camelDeep : closetTheme.muted} size={28} />,
    },
    {
      id: 'account',
      label: 'Profile',
      matches: ['account'],
      icon: (selected) => <ProfileNavIcon color={selected ? closetTheme.camelDeep : closetTheme.muted} />,
    },
  ];

  return (
    <View style={[styles.navbar, overlay && styles.navbarOverlay]}>
      {tabs.map((tab) => {
        const selected = tab.matches.includes(activeTab);

        return (
          <Pressable
            key={tab.id}
            onPress={() => onNavigate(tab.id)}
            style={[styles.navButton, selected && styles.navButtonActive]}>
            <View style={styles.navIconFrame}>{tab.icon(selected)}</View>
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function initialForUsername(username?: string | null) {
  return username?.trim().charAt(0).toUpperCase() || 'U';
}

export function NotificationMenu({ notifications }: { notifications: AppNotification[] }) {
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

function NotificationStrip({ notifications }: { notifications: AppNotification[] }) {
  const primary = notifications[0];

  if (!primary) {
    return null;
  }

  return (
    <View style={styles.notificationStrip}>
      <Text style={styles.notificationStripLabel}>Reminder</Text>
      <View style={styles.notificationStripBody}>
        <Text style={styles.notificationStripTitle}>{primary.title}</Text>
        <Text numberOfLines={2} style={styles.notificationStripText}>
          {primary.text}
        </Text>
      </View>
      {notifications.length > 1 && <Text style={styles.notificationStripCount}>+{notifications.length - 1}</Text>}
    </View>
  );
}

function buildNotifications(previousSeenAt: string, closetItemCount: number, scheduledOutfits: ScheduledOutfits) {
  const today = new Date();
  const todayKey = formatDateKey(today);
  const todaySchedule = scheduledOutfits[todayKey] ?? [];
  const weather = getCachedWeatherSummary(plannerWeatherLocation);
  const notifications: AppNotification[] = [];

  if (canUseLocalStorage() && globalThis.localStorage.getItem('bove-closet-trip-reminder') === '1') {
    notifications.push({
      id: 'trip-planning',
      text: 'You started a trip plan. Continue choosing outfits and packing pieces before you travel.',
      title: 'Continue trip planning',
    });
  }

  if (closetItemCount > 0) {
    notifications.push({
      id: `daily-outfit-${todayKey}`,
      text:
        todaySchedule.length > 0
          ? 'You already planned an outfit for today. Open the calendar if you want to review it before heading out.'
          : 'You have not planned today\'s outfit yet. Open the calendar to pick a look before the day gets busy.',
      title: todaySchedule.length > 0 ? 'You planned this outfit for today' : 'Today\'s outfit is not planned',
    });
  }

  if (weather && (weather.condition === 'rain' || weather.condition === 'storm')) {
    notifications.push({
      id: `rain-jacket-${plannerWeatherLocation}-${todayKey}`,
      text: `The current weather in ${weather.locationName} is rainy, so add a jacket or umbrella before you head out.`,
      title: 'Rain expected today, add a jacket',
    });
  }

  if (previousSeenAt) {
    const lastSeenDate = new Date(previousSeenAt);
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    if (!Number.isNaN(lastSeenDate.getTime()) && today.getTime() - lastSeenDate.getTime() >= weekMs) {
      notifications.unshift({
        id: 'hiatus-return',
        text: 'It has been a while. Review your closet and refresh what you want to wear this week.',
        title: 'Welcome back',
      });
    }
  }

  return notifications;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
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

  // Every remaining AvatarChoice is a garment category ClosetIcon can draw.
  return <ClosetIcon category={avatar} color={color} accent={accent} size={size} />;
}

function PixelHomeIcon({ color }: { color: string }) {
  const blocks = [
    { x: 3, y: 0 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { accent: true, x: 3, y: 3 },
    { x: 4, y: 3 },
    { x: 5, y: 3 },
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { accent: true, x: 3, y: 4 },
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
  ];

  return (
    <View style={styles.pixelShirt}>
      {blocks.map((block) => (
        <View
          key={`${block.x}-${block.y}`}
          style={[
            styles.pixelShirtBlock,
            {
              backgroundColor: block.accent ? closetTheme.camel : color,
              left: block.x * 4,
              top: block.y * 4,
            },
          ]}
        />
      ))}
    </View>
  );
}

function PixelTshirtIcon({ color }: { color: string }) {
  const blocks = [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { accent: true, x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 0, y: 3 },
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 4, y: 3 },
    { x: 5, y: 3 },
    { x: 6, y: 3 },
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 3, y: 4 },
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
  ];

  return (
    <View style={styles.pixelShirt}>
      {blocks.map((block) => (
        <View
          key={`${block.x}-${block.y}`}
          style={[
            styles.pixelShirtBlock,
            {
              backgroundColor: block.accent ? closetTheme.camel : color,
              left: block.x * 4,
              top: block.y * 4,
            },
          ]}
        />
      ))}
    </View>
  );
}

function TryOnNavIcon({ color }: { color: string }) {
  return (
    <View style={styles.tryOnNavIcon}>
      <Text style={[styles.tryOnSparkle, { color }]}>✧</Text>
      <Text style={[styles.tryOnPlus, { color }]}>+</Text>
    </View>
  );
}

function SpeechBubbleIcon({ color }: { color: string }) {
  return (
    <View style={styles.speechIcon}>
      <View style={[styles.speechCircle, { borderColor: color }]} />
      <View style={[styles.speechTail, { borderBottomColor: color }]} />
    </View>
  );
}

function ProfileNavIcon({ color }: { color: string }) {
  return (
    <View style={styles.profileNavIcon}>
      <View style={[styles.profileHead, { borderColor: color }]} />
      <View style={[styles.profileShoulders, { borderColor: color }]} />
    </View>
  );
}

function BellIcon() {
  return (
    <View style={styles.bellIcon}>
      <View style={styles.bellCap} />
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
    ...closetPaperBackground,
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
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
    paddingTop: 78,
    zIndex: 20,
  },
  pageTitle: {
    color: closetTheme.ink,
    ...closetTypography.text,
    fontSize: 28,
    fontWeight: '700',
  },
  topShortcuts: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 18,
    position: 'absolute',
    right: 18,
    top: 28,
    zIndex: 1200,
  },
  homeShortcut: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,252,245,0.88)',
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  topShortcutActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  notificationButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.blueWash,
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
    elevation: 80,
    position: 'absolute',
    right: 22,
    shadowColor: closetTheme.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    top: 58,
    width: 230,
    zIndex: 1000,
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
  notificationStrip: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 248, 236, 0.96)',
    borderBottomColor: closetTheme.line,
    borderBottomWidth: 1,
    borderTopColor: closetTheme.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  notificationStripBody: {
    flex: 1,
    gap: 2,
  },
  notificationStripCount: {
    alignSelf: 'center',
    color: closetTheme.camelDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  notificationStripLabel: {
    backgroundColor: closetTheme.camel,
    borderRadius: 999,
    color: closetTheme.white,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  notificationStripText: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  notificationStripTitle: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  bellIcon: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    position: 'relative',
    width: 24,
  },
  bellCap: {
    borderColor: closetTheme.ink,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 3,
    borderBottomWidth: 0,
    height: 8,
    position: 'absolute',
    top: 2,
    width: 12,
  },
  bellDome: {
    borderColor: closetTheme.ink,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderWidth: 3,
    borderBottomWidth: 0,
    height: 16,
    position: 'absolute',
    top: 6,
    width: 20,
  },
  bellBase: {
    backgroundColor: closetTheme.ink,
    borderRadius: 3,
    height: 3,
    position: 'absolute',
    top: 19,
    width: 22,
  },
  bellClapper: {
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    borderColor: closetTheme.ink,
    borderWidth: 3,
    borderTopWidth: 0,
    height: 7,
    position: 'absolute',
    top: 20,
    width: 11,
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
  avatarTrack: {
    height: 54,
    left: 18,
    position: 'absolute',
    right: 18,
    zIndex: 45,
  },
  avatarTrackLine: {
    backgroundColor: 'rgba(16,35,59,0.24)',
    bottom: 8,
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  walkingAvatar: {
    bottom: 4,
    height: 58,
    justifyContent: 'flex-end',
    position: 'absolute',
    width: 58,
  },
  walkingAvatarButton: {
    alignItems: 'center',
    height: 58,
    justifyContent: 'flex-end',
    width: 58,
  },
  avatarHelpBubble: {
    alignItems: 'center',
    backgroundColor: '#F4F5DF',
    borderColor: closetTheme.ink,
    borderRadius: 2,
    borderWidth: 3,
    bottom: 64,
    justifyContent: 'center',
    left: -43,
    minHeight: 46,
    paddingHorizontal: 10,
    position: 'absolute',
    shadowColor: '#D8CCBA',
    shadowOffset: { height: 4, width: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    width: 144,
    zIndex: 3,
  },
  avatarHelpText: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  avatarHelpTailBorder: {
    backgroundColor: '#F4F5DF',
    borderBottomColor: closetTheme.ink,
    borderBottomWidth: 3,
    borderLeftColor: closetTheme.ink,
    borderLeftWidth: 3,
    borderRightColor: closetTheme.ink,
    borderRightWidth: 3,
    bottom: -14,
    height: 16,
    position: 'absolute',
    width: 14,
  },
  navbar: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderTopColor: closetTheme.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 104,
    paddingBottom: 18,
    paddingHorizontal: 8,
    paddingTop: 14,
    position: 'relative',
  },
  navbarOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 60,
  },
  navButton: {
    alignItems: 'center',
    gap: 5,
    height: 68,
    justifyContent: 'center',
    minWidth: 48,
    zIndex: 1,
  },
  navButtonActive: {
    backgroundColor: 'transparent',
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
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navLabel: {
    color: closetTheme.muted,
    ...closetTypography.text,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 15,
    textAlign: 'center',
  },
  navLabelActive: {
    color: closetTheme.camelDeep,
  },
  pixelShirt: {
    height: 30,
    position: 'relative',
    width: 30,
  },
  pixelShirtBlock: {
    height: 4,
    position: 'absolute',
    width: 4,
  },
  tryOnNavIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    position: 'relative',
    width: 32,
  },
  tryOnSparkle: {
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 34,
  },
  tryOnPlus: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 14,
    position: 'absolute',
    right: -2,
    top: 0,
  },
  speechIcon: {
    height: 30,
    position: 'relative',
    width: 32,
  },
  speechCircle: {
    borderRadius: 15,
    borderWidth: 3,
    height: 28,
    left: 2,
    position: 'absolute',
    top: 0,
    width: 28,
  },
  speechTail: {
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderLeftWidth: 4,
    bottom: 0,
    height: 0,
    left: 6,
    position: 'absolute',
    transform: [{ rotate: '-30deg' }],
    width: 0,
  },
  profileNavIcon: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    position: 'relative',
    width: 32,
  },
  profileHead: {
    borderRadius: 8,
    borderWidth: 3,
    height: 14,
    position: 'absolute',
    top: 1,
    width: 14,
  },
  profileShoulders: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 3,
    borderBottomWidth: 0,
    height: 13,
    position: 'absolute',
    top: 18,
    width: 26,
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
    backgroundColor: closetTheme.navy,
    borderColor: closetTheme.navy,
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
