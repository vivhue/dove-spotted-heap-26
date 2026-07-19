import { CategoryId, WardrobeItem } from '@/models/closet';
import type { SelectedOutfit } from '@/stores/closet-store';

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog' | 'unknown';

export type WeatherSummary = {
  condition: WeatherCondition;
  conditionLabel: string;
  country?: string;
  locationName: string;
  temperatureC: number;
  time: string;
  windKph: number;
};

export type WeatherOutfitRecommendation = {
  advice: string;
  missingCategories: CategoryId[];
  outfit: Partial<SelectedOutfit>;
  reason: string;
  selectedItems: WardrobeItem[];
  weather: WeatherSummary;
};

type GeocodingResponse = {
  results?: {
    country?: string;
    latitude: number;
    longitude: number;
    name: string;
  }[];
};

type ForecastResponse = {
  current?: {
    temperature_2m?: number;
    time?: string;
    weather_code?: number;
    wind_speed_10m?: number;
  };
};

const categoryOrder: CategoryId[] = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];
const weatherCacheMaxAgeMs = 20 * 60 * 1000;
const weatherStorageKey = 'bove:last-weather';
type CachedWeather = { fetchedAt: number; locationKey: string; weather: WeatherSummary };
type WeatherStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};
let cachedWeather: CachedWeather | null = readCachedWeatherCache();
let cachedRecommendation:
  | {
      closetKey: string;
      fetchedAt: number;
      locationKey: string;
      recommendation: WeatherOutfitRecommendation;
      variant: number;
    }
  | null = null;

export async function getWeatherOutfitRecommendation(location: string, closetItems: WardrobeItem[], variant = 0) {
  const locationKey = normalizeLocation(location);
  const closetKey = closetItems.map((item) => item.id).join('|');
  const cached = cachedRecommendation;

  if (
    cached &&
    cached.locationKey === locationKey &&
    cached.closetKey === closetKey &&
    cached.variant === variant &&
    !isCacheExpired(cached.fetchedAt)
  ) {
    return cached.recommendation;
  }

  const weather = await getCurrentWeather(location);
  const recommendation = buildWeatherOutfitRecommendation(weather, closetItems, variant);
  cachedRecommendation = {
    closetKey,
    fetchedAt: Date.now(),
    locationKey,
    recommendation,
    variant,
  };

  return recommendation;
}

export async function getCurrentWeather(location: string): Promise<WeatherSummary> {
  const query = location.trim();

  if (!query) {
    throw new Error('Enter a country or city first.');
  }

  const locationKey = normalizeLocation(query);

  if (cachedWeather && cachedWeather.locationKey === locationKey && !isCacheExpired(cachedWeather.fetchedAt)) {
    return cachedWeather.weather;
  }

  const geoResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
  );
  const geoPayload = (await geoResponse.json()) as GeocodingResponse;
  const place = geoPayload.results?.[0];

  if (!geoResponse.ok || !place) {
    throw new Error(`Could not find weather for ${query}. Try a city, like Singapore or London.`);
  }

  const forecastResponse = await fetch(
    [
      'https://api.open-meteo.com/v1/forecast',
      `?latitude=${encodeURIComponent(String(place.latitude))}`,
      `&longitude=${encodeURIComponent(String(place.longitude))}`,
      '&current=temperature_2m,weather_code,wind_speed_10m',
      '&timezone=auto',
    ].join('')
  );
  const forecastPayload = (await forecastResponse.json()) as ForecastResponse;
  const current = forecastPayload.current;

  if (!forecastResponse.ok || !current || typeof current.temperature_2m !== 'number') {
    throw new Error(`Could not load current weather for ${place.name}.`);
  }

  const condition = weatherCodeToCondition(current.weather_code);

  const weather = {
    condition,
    conditionLabel: conditionToLabel(condition),
    country: place.country,
    locationName: place.name,
    temperatureC: Math.round(current.temperature_2m),
    time: current.time ?? '',
    windKph: Math.round(current.wind_speed_10m ?? 0),
  };

  writeCachedWeatherCache({
    fetchedAt: Date.now(),
    locationKey,
    weather,
  });

  return weather;
}

export function getCachedWeatherSummary(location: string) {
  const locationKey = normalizeLocation(location);

  if (cachedWeather && cachedWeather.locationKey === locationKey && !isCacheExpired(cachedWeather.fetchedAt)) {
    return cachedWeather.weather;
  }

  return null;
}

export function getCachedWeatherRecommendation(location: string, closetItems: WardrobeItem[], variant = 0) {
  const locationKey = normalizeLocation(location);
  const closetKey = closetItems.map((item) => item.id).join('|');
  const cached = cachedRecommendation;

  if (
    cached &&
    cached.locationKey === locationKey &&
    cached.closetKey === closetKey &&
    cached.variant === variant &&
    !isCacheExpired(cached.fetchedAt)
  ) {
    return cached.recommendation;
  }

  return null;
}

export function buildWeatherOutfitRecommendation(
  weather: WeatherSummary,
  closetItems: WardrobeItem[],
  variant = 0
): WeatherOutfitRecommendation {
  const selectedItems = categoryOrder
    .map((category, categoryIndex) => pickItemForWeather(category, closetItems, weather, variant, categoryIndex))
    .filter((item): item is WardrobeItem => Boolean(item));
  const outfit = selectedItems.reduce<Partial<SelectedOutfit>>((nextOutfit, item) => {
    nextOutfit[item.category] = item.id;
    return nextOutfit;
  }, {});
  const selectedCategories = new Set(selectedItems.map((item) => item.category));
  const missingCategories = categoryOrder.filter(
    (category) => !selectedCategories.has(category) && category !== 'accessories'
  );

  return {
    advice: weatherAdvice(weather),
    missingCategories,
    outfit,
    reason: recommendationReason(weather),
    selectedItems,
    weather,
  };
}

function pickItemForWeather(
  category: CategoryId,
  items: WardrobeItem[],
  weather: WeatherSummary,
  variant: number,
  categoryIndex: number
) {
  const categoryItems = items.filter((item) => item.category === category);

  if (categoryItems.length === 0) {
    return undefined;
  }

  const rankedItems = [...categoryItems].sort((left, right) => scoreItem(right, weather) - scoreItem(left, weather));
  const candidateWindow = rankedItems.slice(0, Math.min(4, rankedItems.length));
  const variantIndex = Math.abs(variant + categoryIndex * 2) % candidateWindow.length;

  return candidateWindow[variantIndex];
}

function scoreItem(item: WardrobeItem, weather: WeatherSummary) {
  const text = searchableText(item);
  const temperature = weather.temperatureC;
  let score = 0;

  if (item.category === 'outerwear') {
    score += temperature <= 12 ? 80 : temperature <= 20 ? 45 : -20;
  }

  if (item.category === 'tops') {
    if (temperature <= 8) score += hasAny(text, ['sweater', 'knit', 'thermal', 'hoodie', 'wool']) ? 60 : 10;
    else if (temperature <= 20) score += hasAny(text, ['long', 'shirt', 'knit', 'hoodie']) ? 35 : 12;
    else score += hasAny(text, ['tee', 't-shirt', 'tank', 'linen', 'cotton', 'short']) ? 38 : 8;
  }

  if (item.category === 'bottoms') {
    if (temperature <= 10) score += hasAny(text, ['jeans', 'trouser', 'pants', 'wool', 'denim']) ? 42 : 8;
    else score += hasAny(text, ['skirt', 'short', 'linen']) ? 28 : 14;
  }

  if (item.category === 'shoes') {
    if (weather.condition === 'rain' || weather.condition === 'snow') {
      score += hasAny(text, ['boot', 'leather', 'waterproof', 'sneaker']) ? 45 : 4;
    } else if (temperature >= 26) {
      score += hasAny(text, ['sandal', 'loafer', 'sneaker']) ? 30 : 10;
    } else {
      score += hasAny(text, ['boot', 'sneaker', 'loafer']) ? 28 : 10;
    }
  }

  if (weather.condition === 'rain' || weather.condition === 'storm') {
    score += hasAny(text, ['rain', 'waterproof', 'trench', 'coat', 'jacket', 'boot']) ? 36 : 0;
  }

  if (weather.condition === 'snow' || temperature <= 0) {
    score += hasAny(text, ['coat', 'puffer', 'wool', 'thermal', 'knit', 'boot', 'scarf']) ? 55 : 0;
  }

  if (temperature >= 28) {
    score += hasAny(text, ['linen', 'cotton', 'tank', 'tee', 'short', 'dress', 'sandal']) ? 35 : 0;
    score -= hasAny(text, ['wool', 'puffer', 'coat', 'thermal']) ? 35 : 0;
  }

  return score;
}

function searchableText(item: WardrobeItem) {
  return [
    item.name,
    item.category,
    item.color,
    item.texture,
    item.pattern,
    item.primaryColor,
    item.subcategory,
    ...(item.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function hasAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

function normalizeLocation(location: string) {
  return location.trim().toLowerCase();
}

function isCacheExpired(fetchedAt: number) {
  return Date.now() - fetchedAt > weatherCacheMaxAgeMs;
}

function getWeatherStorage() {
  return (globalThis as { localStorage?: WeatherStorage }).localStorage ?? null;
}

function readCachedWeatherCache() {
  const storage = getWeatherStorage();

  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(weatherStorageKey);

    return rawValue ? (JSON.parse(rawValue) as CachedWeather) : null;
  } catch {
    return null;
  }
}

function writeCachedWeatherCache(nextCachedWeather: CachedWeather) {
  cachedWeather = nextCachedWeather;

  try {
    getWeatherStorage()?.setItem(weatherStorageKey, JSON.stringify(nextCachedWeather));
  } catch {
    // If storage is unavailable or full, the in-memory cache still works for this session.
  }
}

function weatherAdvice(weather: WeatherSummary) {
  const temperature = weather.temperatureC;

  if (temperature <= -1) return 'Layer up heavily: warm outerwear, covered legs, and boots.';
  if (temperature <= 8) return 'Wear a proper coat or jacket with warm layers.';
  if (temperature <= 16) return 'A jacket or knit layer will keep the outfit comfortable.';
  if (temperature >= 29) return 'Keep it breathable: light tops, airy bottoms, and easy shoes.';
  if (weather.condition === 'rain' || weather.condition === 'storm') return 'Pick rain-safe layers and shoes.';

  return 'Comfortable weather: a balanced outfit should work well.';
}

function recommendationReason(weather: WeatherSummary) {
  const rainText =
    weather.condition === 'rain' || weather.condition === 'storm'
      ? ' It may be wet, so rain-safe outerwear or shoes are prioritised.'
      : '';

  return `${weather.locationName} is ${weather.temperatureC}°C with ${weather.conditionLabel.toLowerCase()}.${rainText}`;
}

function weatherCodeToCondition(code?: number): WeatherCondition {
  if (code === undefined) return 'unknown';
  if ([0, 1].includes(code)) return 'clear';
  if ([2, 3].includes(code)) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'unknown';
}

function conditionToLabel(condition: WeatherCondition) {
  const labels: Record<WeatherCondition, string> = {
    clear: 'Clear',
    cloudy: 'Cloudy',
    fog: 'Foggy',
    rain: 'Rain',
    snow: 'Snow',
    storm: 'Storm',
    unknown: 'Weather',
  };

  return labels[condition];
}
