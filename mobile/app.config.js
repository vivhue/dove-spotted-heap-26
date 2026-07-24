const appJson = require('./app.json');

const config = appJson.expo;

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  config.extra?.apiUrl ??
  'https://your-backend.example.com';

module.exports = {
  ...config,
  owner: 'vivhues-team',
  slug: 'bove-closet',
  extra: {
    ...config.extra,
    eas: {
      projectId: '2bd5398c-8d10-42af-b5b9-2539d4327ed5',
    },
    apiUrl,
  },
};
