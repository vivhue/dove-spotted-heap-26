import { Text, TextInput } from 'react-native';

import { closetTypography } from '@/views/components/closet-theme';

type ComponentWithDefaultProps = {
  defaultProps?: {
    style?: unknown;
    [key: string]: unknown;
  };
};

function applyDefaultFont(component: ComponentWithDefaultProps) {
  component.defaultProps = component.defaultProps ?? {};

  const existingStyle = component.defaultProps.style;
  component.defaultProps.style = existingStyle
    ? [closetTypography.text, existingStyle]
    : closetTypography.text;
}

applyDefaultFont(Text as ComponentWithDefaultProps);
applyDefaultFont(TextInput as ComponentWithDefaultProps);
