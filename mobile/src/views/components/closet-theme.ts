import { Platform } from 'react-native';

export const closetTheme = {
  cream: '#F7EFE2',
  creamDeep: '#E7EFF7',
  blueWash: '#E7EFF7',
  blueMist: '#D4E3EF',
  ink: '#10233B',
  camel: '#D6B17E',
  camelDeep: '#2F5F8F',
  navy: '#1E4B73',
  blush: '#C89583',
  sage: '#7FA8BA',
  line: '#C9D4DE',
  white: '#FFFCF5',
  muted: '#6B7C8E',
  night: '#08172A',
};

const appFontFamily = Platform.select({
  android: 'sans-serif',
  ios: 'System',
  web: 'Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif',
  default: 'sans-serif',
});

export const closetTypography = {
  appFont: appFontFamily,
  text: { fontFamily: appFontFamily },
};
