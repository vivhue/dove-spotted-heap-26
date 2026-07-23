import { StyleSheet, Text, TextInput } from 'react-native';

import { closetTypography } from '@/views/components/closet-theme';

type ComponentWithDefaultProps = {
  defaultProps?: {
    style?: unknown;
    [key: string]: unknown;
  };
};

type StyleValue = Record<string, unknown>;
type StyleSheetMap = Record<string, StyleValue>;

const originalCreate = StyleSheet.create.bind(StyleSheet);

function usesBoldFont(fontWeight: unknown) {
  if (typeof fontWeight === 'number') {
    return fontWeight >= 600;
  }

  if (typeof fontWeight !== 'string') {
    return false;
  }

  if (fontWeight === 'bold') {
    return true;
  }

  const numericWeight = Number.parseInt(fontWeight, 10);

  return Number.isFinite(numericWeight) && numericWeight >= 600;
}

StyleSheet.create = ((styles: StyleSheetMap) => {
  const nextStyles = Object.fromEntries(
    Object.entries(styles).map(([key, style]) => {
      if (!style || Array.isArray(style) || typeof style !== 'object' || !usesBoldFont(style.fontWeight) || style.fontFamily) {
        return [key, style];
      }

      return [
        key,
        {
          ...style,
          fontFamily: closetTypography.boldFont,
        },
      ];
    }),
  );

  return originalCreate(nextStyles);
}) as typeof StyleSheet.create;

function applyDefaultFont(component: ComponentWithDefaultProps) {
  component.defaultProps = component.defaultProps ?? {};

  const existingStyle = component.defaultProps.style;
  component.defaultProps.style = existingStyle
    ? [closetTypography.text, existingStyle]
    : closetTypography.text;
}

applyDefaultFont(Text as ComponentWithDefaultProps);
applyDefaultFont(TextInput as ComponentWithDefaultProps);
