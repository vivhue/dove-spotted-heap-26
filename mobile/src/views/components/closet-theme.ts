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

export const closetPaperBackground = {
  backgroundColor: closetTheme.cream,
  experimental_backgroundImage:
    'linear-gradient(rgba(47,95,143,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(47,95,143,0.08) 1px, transparent 1px)',
  backgroundSize: '16px 16px',
} as const;

const appFontFamily = Platform.select({
  android: 'monospace',
  ios: 'Menlo',
  web: '"Courier New", "Lucida Console", Monaco, ui-monospace, monospace',
  default: 'monospace',
});

export const closetTypography = {
  appFont: appFontFamily,
  text: { fontFamily: appFontFamily },
};
