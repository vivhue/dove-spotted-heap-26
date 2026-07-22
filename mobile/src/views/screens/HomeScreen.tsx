import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  browseCategories,
  CategoryId,
  currentUserDisplayName,
  ScreenId,
  WardrobeItem,
} from '@/models/closet';
import {
  getCachedWeatherRecommendation,
  getCachedWeatherSummary,
  getCurrentWeather,
  getWeatherOutfitRecommendation,
  WeatherOutfitRecommendation,
  WeatherSummary,
} from '@/services/weather-recommendation';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen, AvatarButton, initialForUsername, NotificationButton, NotificationMenu, useAppNotifications } from '@/views/components/app-chrome';
import { closetTheme, closetTypography } from '@/views/components/closet-theme';
import { CalendarIcon, ClosetIcon, LineIcon } from '@/views/components/closet-icons';

type Props = {
  activeCategory: CategoryId;
  onCategoryChange: (category: CategoryId) => void;
  onNavigate: (screen: ScreenId) => void;
};

export function HomeScreen({
  onCategoryChange,
  onNavigate,
}: Props) {
  const [surpriseIndex, setSurpriseIndex] = useState(0);
  const [weatherLocation, setWeatherLocation] = useState('Singapore');
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummary | null>(() => getCachedWeatherSummary('Singapore'));
  const [weatherRecommendation, setWeatherRecommendation] = useState<WeatherOutfitRecommendation | null>(null);
  const [weatherError, setWeatherError] = useState('');
  const [isRecommending, setIsRecommending] = useState(false);
  const [weatherVariant, setWeatherVariant] = useState(0);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const hasLoadedInitialWeather = useRef(false);
  const { applyOutfit, closetItems, currentUser, selectedOutfit, toggleWornItem } = useClosetStore();
  const notifications = useAppNotifications(currentUser?.username, closetItems.length);
  const hasUnreadNotification = notifications.some((notification) => !readNotificationIds.includes(notification.id));
  const featuredItems = closetItems;
  const greeting = greetingForTime(currentDate);
  const timeLabel = formatClockTime(currentDate);
  const shownWeather = weatherRecommendation?.weather ?? weatherSummary;
  const weatherHeadline = shownWeather
    ? weatherHeadlineFor(shownWeather)
    : 'Check today\'s weather';
  const weatherDisplayItems = useMemo(
    () => (weatherRecommendation ? weatherRecommendation.selectedItems : closetItems).slice(0, 3),
    [closetItems, weatherRecommendation]
  );
  const categoriesWithItems = useMemo(
    () =>
      browseCategories
        .map((category) => ({
          ...category,
          items: closetItems.filter((item) => item.category === category.id),
        }))
        .filter((category) => category.items.length > 0),
    [closetItems]
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 30000);

    return () => clearInterval(timer);
  }, []);

  function surpriseMe() {
    if (featuredItems.length === 0) {
      return;
    }

    const nextIndex = (surpriseIndex + 1) % featuredItems.length;
    setSurpriseIndex(nextIndex);
    onCategoryChange(featuredItems[nextIndex].category);
  }

  async function recommendForWeather(nextVariant = weatherVariant, options: { silent?: boolean } = {}) {
    if (closetItems.length === 0) {
      setWeatherError('Add a few closet items first, then I can recommend from them.');
      return;
    }

    try {
      if (!options.silent) {
        setIsRecommending(true);
      }
      setWeatherError('');
      const result = await getWeatherOutfitRecommendation(weatherLocation, closetItems, nextVariant);
      setWeatherSummary(result.weather);
      setWeatherRecommendation(result);
      setWeatherVariant(nextVariant);
    } catch (error) {
      if (!options.silent) {
        setWeatherRecommendation(null);
      }
      setWeatherError(error instanceof Error ? error.message : 'Could not get the weather recommendation.');
    } finally {
      if (!options.silent) {
        setIsRecommending(false);
      }
    }
  }

  useEffect(() => {
    if (hasLoadedInitialWeather.current) {
      return;
    }

    let isActive = true;
    hasLoadedInitialWeather.current = true;
    const cached = getCachedWeatherSummary(weatherLocation);

    if (cached) {
      setWeatherSummary(cached);
    }

    getCurrentWeather(weatherLocation)
      .then((weather) => {
        if (isActive) {
          setWeatherSummary(weather);
        }
      })
      .catch((error) => {
        if (isActive) {
          setWeatherError(error instanceof Error ? error.message : 'Could not load current weather.');
        }
      });

    return () => {
      isActive = false;
    };
  }, [weatherLocation]);

  useEffect(() => {
    if (closetItems.length === 0 || weatherRecommendation) {
      return;
    }

    const cached = getCachedWeatherRecommendation(weatherLocation, closetItems, 0);

    if (cached) {
      setWeatherSummary(cached.weather);
      setWeatherRecommendation(cached);
      return;
    }

    recommendForWeather(0, { silent: true });
  }, [closetItems.length, weatherRecommendation, weatherLocation]);

  function wearRecommendedOutfit() {
    if (!weatherRecommendation) {
      return;
    }

    applyOutfit(weatherRecommendation.outfit);
    const firstItem = weatherRecommendation.selectedItems[0];

    if (firstItem) {
      onCategoryChange(firstItem.category);
    }

    onNavigate('try-on');
  }

  return (
    <AppScreen activeTab="home" onNavigate={onNavigate}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <Pressable style={styles.calendarButton} onPress={() => onNavigate('calendar')}>
            <CalendarIcon color={closetTheme.ink} size={22} />
          </Pressable>
          <View style={styles.spacer} />
          <View style={styles.topActions}>
            <NotificationButton
              unread={hasUnreadNotification}
              onPress={() => {
                setIsNotificationsOpen((isOpen) => !isOpen);
                setReadNotificationIds(notifications.map((notification) => notification.id));
              }}
            />
            <AvatarButton
              avatar={currentUser?.avatar ?? 'shirt'}
              initial={initialForUsername(currentUser?.username)}
              onPress={() => onNavigate('account')}
            />
          </View>
          {isNotificationsOpen && <NotificationMenu notifications={notifications} />}
        </View>

        <View style={styles.weatherCard}>
          <View style={styles.weatherCardHeader}>
            <View style={styles.weatherHeaderCopy}>
              <Text style={styles.weatherCardLabel}>today&apos;s pick</Text>
              <Text numberOfLines={2} style={styles.weatherCardTitle}>{weatherHeadline}</Text>
            </View>
            <View style={styles.weatherSummary}>
              <View style={styles.weatherTempRow}>
                <LineIcon name={weatherIcon(shownWeather?.condition)} color={closetTheme.ink} />
                <Text style={styles.weatherText}>{shownWeather ? `${shownWeather.temperatureC}°` : '--°'}</Text>
              </View>
              <TextInput
                autoCapitalize="words"
                placeholder="Location"
                placeholderTextColor={closetTheme.muted}
                style={styles.weatherLocationInput}
                value={weatherLocation}
                onChangeText={setWeatherLocation}
                onSubmitEditing={() => recommendForWeather(0)}
                returnKeyType="go"
              />
            </View>
          </View>

          <Text numberOfLines={2} style={styles.recommendationAdvice}>
            {weatherRecommendation ? weatherRecommendation.advice : 'Tap recommend to pick real pieces from your closet.'}
          </Text>

          <View style={styles.recommendedItems}>
            {weatherDisplayItems.length > 0 ? (
              weatherDisplayItems.map((item) => <WeatherItemTile key={item.id} item={item} />)
            ) : (
              <View style={styles.emptyWeatherTile}>
                <Text style={styles.emptyWeatherTileText}>Add closet items to see them here</Text>
              </View>
            )}
          </View>

          {weatherError ? <Text style={styles.weatherError}>{weatherError}</Text> : null}

          <View style={styles.weatherActions}>
            <Pressable
              disabled={isRecommending}
              style={({ pressed }) => [styles.weatherButton, pressed && styles.buttonPressed, isRecommending && styles.weatherButtonDisabled]}
              onPress={() => recommendForWeather(weatherRecommendation ? weatherVariant + 1 : 0)}>
              {isRecommending ? <ActivityIndicator color={closetTheme.cream} /> : <LineIcon name="↻" color={closetTheme.cream} />}
              <Text style={styles.weatherButtonText}>{isRecommending ? 'Checking' : weatherRecommendation ? 'Try another' : 'Recommend outfit'}</Text>
            </Pressable>
            {weatherRecommendation && (
              <Pressable style={({ pressed }) => [styles.wearButton, pressed && styles.buttonPressed]} onPress={wearRecommendedOutfit}>
                <LineIcon name="✓" color={closetTheme.ink} />
                <Text style={styles.wearButtonText}>Wear this</Text>
              </Pressable>
            )}
          </View>

          {weatherRecommendation?.missingCategories.length ? (
            <Text style={styles.missingText}>Missing: {weatherRecommendation.missingCategories.join(', ')}</Text>
          ) : null}

          <Text style={styles.weatherTime}>
            {greeting}, {currentUserDisplayName} - {timeLabel}
          </Text>
        </View>

        <View style={styles.stage}>
          <View style={styles.stageBackground} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Try clothes on your real photo</Text>
          </View>
          <Pressable style={styles.browseHotspot} onPress={() => onNavigate('try-on')}>
            <LineIcon name="✦" color={closetTheme.camelDeep} />
            <Text style={styles.browseHotspotText}>Open try-on</Text>
          </Pressable>
        </View>

        <View style={styles.shuffleRow}>
          <Pressable style={({ pressed }) => [styles.shuffleButton, pressed && styles.buttonPressed]} onPress={surpriseMe}>
            <LineIcon name="⇄" color={closetTheme.camel} />
            <Text style={styles.shuffleText}>surprise me</Text>
          </Pressable>
        </View>

        <View style={styles.categorySections}>
          {categoriesWithItems.map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category.label}</Text>
                <Text style={styles.categoryCount}>{category.items.length}</Text>
              </View>
              <View style={styles.itemGrid}>
                {category.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      toggleWornItem(item);
                      onCategoryChange(item.category);
                    }}
                    style={({ pressed }) => [
                      styles.itemTile,
                      selectedOutfit[item.category] === item.id && styles.itemTileSelected,
                      pressed && styles.swatchPressed,
                    ]}>
                    <View style={styles.itemThumb}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="contain" />
                      ) : (
                        <ClosetIcon category={item.category} color={item.color} accent={item.accent} size={32} />
                      )}
                    </View>
                    <Text numberOfLines={2} style={styles.itemName}>
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

function WeatherItemTile({ item }: { item: WardrobeItem }) {
  return (
    <View style={styles.recommendedTile}>
      <View style={styles.recommendedTileImageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.recommendedTileImage} resizeMode="contain" />
        ) : (
          <ClosetIcon category={item.category} color={item.color} accent={item.accent} size={30} />
        )}
      </View>
      <Text numberOfLines={2} style={styles.recommendedTileText}>
        {item.name}
      </Text>
    </View>
  );
}

function weatherIcon(condition?: WeatherOutfitRecommendation['weather']['condition']) {
  if (condition === 'rain') return '☂';
  if (condition === 'snow') return '❄';
  if (condition === 'storm') return '☇';
  if (condition === 'cloudy' || condition === 'fog') return '☁';
  return '☁';
}

function weatherHeadlineFor(weather: WeatherSummary) {
  const temperature = weather.temperatureC;

  if (temperature <= 0) return 'Warm layers, it is freezing';
  if (temperature <= 12) return 'Bundle up, it is cold';
  if (temperature <= 20) return 'Light layers, it is cool';
  if (temperature >= 29) return 'Keep it breezy, it is hot';
  if (weather.condition === 'rain' || weather.condition === 'storm') {
    return 'Rain-ready pieces today';
  }

  return 'Light layers, it is warm';
}

function greetingForTime(date: Date) {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

function formatClockTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 18,
  },
  topbar: {
    alignItems: 'center',
    elevation: 60,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 8,
    position: 'relative',
    zIndex: 60,
  },
  weatherText: {
    color: closetTheme.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  weatherSmall: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  calendarButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  spacer: {
    flex: 1,
  },
  topActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  stage: {
    alignItems: 'center',
    height: 198,
    justifyContent: 'center',
    marginTop: 10,
    position: 'relative',
  },
  stageBackground: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 28,
    bottom: 18,
    left: 28,
    position: 'absolute',
    right: 28,
    top: 18,
  },
  heroCopy: {
    paddingHorizontal: 42,
    position: 'absolute',
    top: 48,
    zIndex: 2,
  },
  heroTitle: {
    color: closetTheme.ink,
    ...closetTypography.text,
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  browseHotspot: {
    alignItems: 'center',
    backgroundColor: 'rgba(47, 95, 143, 0.12)',
    borderColor: 'rgba(47, 95, 143, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    bottom: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    zIndex: 4,
  },
  browseHotspotText: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  shuffleRow: {
    alignItems: 'center',
    paddingVertical: 7,
  },
  shuffleButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  shuffleText: {
    color: closetTheme.cream,
    fontSize: 12,
    fontWeight: '900',
  },
  weatherCard: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
    zIndex: 0,
  },
  weatherCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  weatherHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  weatherCardLabel: {
    color: closetTheme.camelDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  weatherCardTitle: {
    color: closetTheme.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  weatherTime: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    textAlign: 'center',
  },
  weatherSummary: {
    alignItems: 'flex-end',
    minWidth: 84,
  },
  weatherTempRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  weatherLocationInput: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '800',
    minWidth: 80,
    padding: 0,
    textAlign: 'right',
  },
  weatherActions: {
    flexDirection: 'row',
    gap: 8,
  },
  weatherButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 15,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  weatherButtonDisabled: {
    opacity: 0.72,
  },
  weatherButtonText: {
    color: closetTheme.cream,
    fontSize: 13,
    fontWeight: '900',
  },
  weatherError: {
    color: closetTheme.blush,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  recommendationAdvice: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  recommendedItems: {
    flexDirection: 'row',
    gap: 8,
  },
  recommendedTile: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 12,
    flex: 1,
    gap: 4,
    minHeight: 82,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  recommendedTileImageWrap: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: '100%',
  },
  recommendedTileImage: {
    height: 36,
    width: '95%',
  },
  recommendedTileText: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
    minHeight: 26,
    textAlign: 'center',
  },
  emptyWeatherTile: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 76,
    padding: 10,
  },
  emptyWeatherTileText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  missingText: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  wearButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.camel,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  wearButtonText: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  swatches: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  swatch: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  swatchImage: {
    height: 52,
    width: 52,
  },
  categorySections: {
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  categorySection: {
    gap: 10,
  },
  categoryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryTitle: {
    color: closetTheme.camelDeep,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  categoryCount: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemTile: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    gap: 7,
    minHeight: 112,
    padding: 9,
    width: '47.8%',
  },
  itemTileSelected: {
    borderColor: closetTheme.camel,
  },
  itemThumb: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 13,
    height: 62,
    justifyContent: 'center',
    width: '100%',
  },
  itemImage: {
    height: 58,
    width: '92%',
  },
  itemName: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
    minHeight: 28,
    textAlign: 'center',
  },
  swatchSelected: {
    borderColor: closetTheme.camel,
  },
  swatchPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  catRow: {
    flexDirection: 'row',
    gap: 18,
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  catButton: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    minHeight: 32,
    paddingBottom: 7,
    paddingTop: 4,
  },
  catButtonSelected: {
    borderBottomColor: closetTheme.camelDeep,
  },
  catButtonPressed: {
    opacity: 0.65,
  },
  catText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  catTextSelected: {
    color: closetTheme.camelDeep,
  },
});
