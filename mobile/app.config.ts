import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';

const config = appJson.expo as ExpoConfig;

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? config.extra?.apiUrl ?? 'http://localhost:8080';

export default {
  ...config,
  extra: {
    ...config.extra,
    apiUrl,
  },
} satisfies ExpoConfig;
