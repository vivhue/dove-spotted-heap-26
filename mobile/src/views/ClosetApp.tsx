import { Platform, StyleSheet, Text, View } from 'react-native';

import { useClosetApp } from '@/controllers/use-closet-app';
import { useClosetStore } from '@/stores/closet-store';
import { closetTheme } from '@/views/components/closet-theme';
import { AccountScreen } from '@/views/screens/AccountScreen';
import { AddItemScreen } from '@/views/screens/AddItemScreen';
import { CalendarScreen } from '@/views/screens/CalendarScreen';
import { DashboardScreen } from '@/views/screens/DashboardScreen';
import { DiscoverScreen } from '@/views/screens/DiscoverScreen';
import { HomeScreen } from '@/views/screens/HomeScreen';
import { SplashScreen } from '@/views/screens/SplashScreen';
import { TripPlannerScreen } from '@/views/screens/TripPlannerScreen';
import { TryOnScreen } from '@/views/screens/TryOnScreen';
import { WardrobeScreen } from '@/views/screens/WardrobeScreen';

export function ClosetApp() {
  const { currentUser } = useClosetStore();
  const {
    activeCategory,
    goTo,
    measurements,
    screen,
    setActiveCategory,
    updateMeasurement,
  } = useClosetApp();
  const needsAccount = !currentUser && screen !== 'splash';
  const shownScreen = needsAccount ? 'account' : screen;

  function openAfterLanding() {
    goTo(currentUser ? 'dashboard' : 'account');
  }

  function openDashboardAfterAuth() {
    goTo('dashboard');
  }

  const content = (
    <>
      {shownScreen === 'splash' && <SplashScreen onNavigate={openAfterLanding} />}
      {shownScreen === 'home' && (
        <HomeScreen
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onNavigate={goTo}
        />
      )}
      {shownScreen === 'dashboard' && (
        <DashboardScreen
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onNavigate={goTo}
        />
      )}
      {shownScreen === 'closet' && <WardrobeScreen mode="closet" onNavigate={goTo} />}
      {shownScreen === 'wishlist' && <WardrobeScreen mode="wishlist" onNavigate={goTo} />}
      {shownScreen === 'add' && <AddItemScreen onNavigate={goTo} />}
      {shownScreen === 'try-on' && <TryOnScreen onNavigate={goTo} />}
      {shownScreen === 'trip-planner' && <TripPlannerScreen onNavigate={goTo} />}
      {shownScreen === 'account' && (
        <AccountScreen
          measurements={measurements}
          onAuthenticated={openDashboardAfterAuth}
          onMeasurementChange={updateMeasurement}
          onNavigate={goTo}
        />
      )}
      {shownScreen === 'discover' && <DiscoverScreen onNavigate={goTo} />}
      {shownScreen === 'calendar' && <CalendarScreen onNavigate={goTo} />}
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webRoot}>
        <Text style={styles.lab}>
          bove closet <Text style={styles.labStrong}>UI concept</Text>
        </Text>
        <View style={styles.deviceWrap}>
          <View style={[styles.sideButton, styles.sideButtonLeftTop]} />
          <View style={[styles.sideButton, styles.sideButtonLeftMiddle]} />
          <View style={[styles.sideButton, styles.sideButtonRight]} />
          <View style={[styles.deviceBody, styles.webPhoneShadow]}>
            <View pointerEvents="none" style={styles.deviceHighlight} />
            <View style={styles.screenGlass}>
              <View pointerEvents="none" style={styles.dynamicIsland}>
                <View style={styles.speaker} />
                <View style={styles.camera} />
              </View>
              <View style={styles.screenClip}>{content}</View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  webRoot: {
    alignItems: 'center',
    backgroundColor: '#16131C',
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    padding: 40,
  },
  lab: {
    color: '#C9BDB0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  labStrong: {
    color: closetTheme.camel,
  },
  deviceWrap: {
    height: 824,
    maxHeight: '92%',
    maxWidth: '100%',
    position: 'relative',
    width: 399,
  },
  webPhoneShadow: {
    boxShadow:
      '0 0 0 1px rgba(255,255,255,.08), inset 0 0 0 1px rgba(255,255,255,.08), 0 32px 70px -24px rgba(0,0,0,.82), 0 12px 26px -18px rgba(201,154,107,.45)',
  } as never,
  sideButton: {
    backgroundColor: '#09070D',
    borderRadius: 4,
    position: 'absolute',
    width: 5,
    zIndex: 0,
  },
  sideButtonLeftTop: {
    height: 58,
    left: -3,
    top: 132,
  },
  sideButtonLeftMiddle: {
    height: 82,
    left: -3,
    top: 216,
  },
  sideButtonRight: {
    height: 96,
    right: -3,
    top: 190,
  },
  deviceBody: {
    backgroundColor: '#0C0A10',
    borderColor: '#1E1A25',
    borderRadius: 58,
    borderWidth: 1,
    height: '100%',
    overflow: 'hidden',
    padding: 12,
    width: '100%',
    zIndex: 1,
  },
  deviceHighlight: {
    borderColor: 'rgba(255,255,255,.1)',
    borderRadius: 54,
    borderWidth: 1,
    bottom: 4,
    left: 4,
    position: 'absolute',
    right: 4,
    top: 4,
    zIndex: 2,
  },
  screenGlass: {
    backgroundColor: closetTheme.cream,
    borderRadius: 46,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  dynamicIsland: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#0c0a10',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 9,
    height: 31,
    justifyContent: 'center',
    position: 'absolute',
    top: 12,
    width: 126,
    zIndex: 20,
  },
  speaker: {
    backgroundColor: '#191620',
    borderRadius: 3,
    height: 5,
    width: 42,
  },
  camera: {
    backgroundColor: '#111827',
    borderColor: '#202A42',
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    width: 10,
  },
  screenClip: {
    flex: 1,
    overflow: 'hidden',
  },
});
