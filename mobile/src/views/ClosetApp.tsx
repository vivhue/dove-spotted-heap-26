import { Platform, StyleSheet, Text, View } from 'react-native';

import { useClosetApp } from '@/controllers/use-closet-app';
import { closetPaperBackground, closetTheme } from '@/views/components/closet-theme';
import { AccountScreen } from '@/views/screens/AccountScreen';
import { AddItemScreen } from '@/views/screens/AddItemScreen';
import { CalendarScreen } from '@/views/screens/CalendarScreen';
import { DashboardScreen } from '@/views/screens/DashboardScreen';
import { DiscoverScreen } from '@/views/screens/DiscoverScreen';
import { HomeScreen } from '@/views/screens/HomeScreen';
import { LookHistoryScreen } from '@/views/screens/LookHistoryScreen';
import { SplashScreen } from '@/views/screens/SplashScreen';
import { TripPlannerScreen } from '@/views/screens/TripPlannerScreen';
import { TryOnScreen } from '@/views/screens/TryOnScreen';
import { WardrobeScreen } from '@/views/screens/WardrobeScreen';

export function ClosetApp() {
  const {
    activeCategory,
    editTrip,
    editingTrip,
    goTo,
    measurements,
    saveTrip,
    screen,
    savedTrips,
    setActiveCategory,
    startNewTrip,
    updateMeasurement,
  } = useClosetApp();
  const shownScreen = screen;

  function openAfterLanding() {
    goTo('home');
  }

  function openDashboardAfterAuth() {
    goTo('home');
  }

  function renderScreen(screenId: typeof shownScreen) {
    return (
      <>
        {screenId === 'splash' && <SplashScreen onNavigate={openAfterLanding} />}
        {screenId === 'home' && (
          <HomeScreen
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onNavigate={goTo}
          />
        )}
        {screenId === 'dashboard' && (
          <DashboardScreen
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onNavigate={goTo}
          />
        )}
        {screenId === 'closet' && <WardrobeScreen mode="closet" onNavigate={goTo} />}
        {screenId === 'wishlist' && <WardrobeScreen mode="wishlist" onNavigate={goTo} />}
        {screenId === 'add' && <AddItemScreen onNavigate={goTo} />}
        {screenId === 'try-on' && <TryOnScreen onNavigate={goTo} />}
        {screenId === 'look-history' && <LookHistoryScreen onNavigate={goTo} />}
        {screenId === 'trip-planner' && <TripPlannerScreen editingTrip={editingTrip} onNavigate={goTo} onTripSaved={saveTrip} />}
        {screenId === 'account' && (
          <AccountScreen
            measurements={measurements}
            onAuthenticated={openDashboardAfterAuth}
            onEditTrip={editTrip}
            onMeasurementChange={updateMeasurement}
            onNavigate={goTo}
            onStartTrip={startNewTrip}
            savedTrips={savedTrips}
          />
        )}
        {screenId === 'discover' && <DiscoverScreen measurements={measurements} onNavigate={goTo} />}
        {screenId === 'calendar' && <CalendarScreen onEditTrip={editTrip} onNavigate={goTo} onStartTrip={startNewTrip} savedTrips={savedTrips} />}
      </>
    );
  }

  const content = renderScreen(shownScreen);

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
    backgroundColor: closetTheme.night,
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    padding: 40,
  },
  lab: {
    color: closetTheme.cream,
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
      '0 0 0 1px rgba(255,255,255,.1), inset 0 0 0 1px rgba(255,255,255,.08), 0 32px 70px -24px rgba(0,0,0,.82), 0 12px 26px -18px rgba(214,177,126,.5)',
  } as never,
  sideButton: {
    backgroundColor: '#07101D',
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
    backgroundColor: '#07101D',
    borderColor: '#1B2E48',
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
    ...closetPaperBackground,
    borderRadius: 46,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  dynamicIsland: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#070D18',
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
    backgroundColor: '#172033',
    borderRadius: 3,
    height: 5,
    width: 42,
  },
  camera: {
    backgroundColor: '#14243A',
    borderColor: '#294464',
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
