import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { currentUserDisplayName, ScreenId, WardrobeItem } from '@/models/closet';
import {
  getCachedWeatherRecommendation,
  getCachedWeatherSummary,
  getCurrentWeather,
  getWeatherOutfitRecommendation,
  WeatherOutfitRecommendation,
  WeatherSummary,
} from '@/services/weather-recommendation';
import { useClosetStore } from '@/stores/closet-store';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';

type Props = {
  onCategoryChange?: (category: WardrobeItem['category']) => void;
  onNavigate: (screen: ScreenId) => void;
};

export function TodaysPickCard({ onCategoryChange, onNavigate }: Props) {
  const [weatherLocation, setWeatherLocation] = useState('Singapore');
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummary | null>(() => getCachedWeatherSummary('Singapore'));
  const [weatherRecommendation, setWeatherRecommendation] = useState<WeatherOutfitRecommendation | null>(null);
  const [weatherError, setWeatherError] = useState('');
  const [isRecommending, setIsRecommending] = useState(false);
  const [weatherVariant, setWeatherVariant] = useState(0);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const hasLoadedInitialWeather = useRef(false);
  const { applyOutfit, closetItems } = useClosetStore();
  const shownWeather = weatherRecommendation?.weather ?? weatherSummary;
  const weatherHeadline = shownWeather ? weatherHeadlineFor(shownWeather) : 'Check today\'s weather';
  const timeLabel = formatClockTime(currentDate);
  const greeting = greetingForTime(currentDate);
  const weatherDisplayItems = useMemo(
    () => (weatherRecommendation ? weatherRecommendation.selectedItems : closetItems).slice(0, 3),
    [closetItems, weatherRecommendation]
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 30000);

    return () => clearInterval(timer);
  }, []);

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

  function wearRecommendedOutfit() {
    if (!weatherRecommendation) {
      return;
    }

    applyOutfit(weatherRecommendation.outfit);
    const firstItem = weatherRecommendation.selectedItems[0];

    if (firstItem) {
      onCategoryChange?.(firstItem.category);
    }

    onNavigate('try-on');
  }

  return (
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
            returnKeyType="go"
            style={styles.weatherLocationInput}
            value={weatherLocation}
            onChangeText={setWeatherLocation}
            onSubmitEditing={() => recommendForWeather(0)}
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
  weatherCard: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
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
  weatherText: {
    color: closetTheme.ink,
    fontSize: 22,
    fontWeight: '900',
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
    borderRadius: 6,
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
    borderRadius: 6,
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
    borderRadius: 6,
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
    borderRadius: 6,
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
});
