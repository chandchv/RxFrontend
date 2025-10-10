/**
 * Theme configuration for React Native Paper
 */

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Custom color palette
const colors = {
  primary: '#2196F3',
  primaryContainer: '#E3F2FD',
  secondary: '#03DAC6',
  secondaryContainer: '#E0F2F1',
  tertiary: '#FF9800',
  tertiaryContainer: '#FFF3E0',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  background: '#FAFAFA',
  error: '#F44336',
  errorContainer: '#FFEBEE',
  warning: '#FF9800',
  warningContainer: '#FFF3E0',
  success: '#4CAF50',
  successContainer: '#E8F5E8',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#1976D2',
  onSecondary: '#000000',
  onSecondaryContainer: '#00695C',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#E65100',
  onSurface: '#212121',
  onSurfaceVariant: '#757575',
  onBackground: '#212121',
  onError: '#FFFFFF',
  onErrorContainer: '#C62828',
  onWarning: '#FFFFFF',
  onWarningContainer: '#E65100',
  onSuccess: '#FFFFFF',
  onSuccessContainer: '#2E7D32',
  outline: '#E0E0E0',
  outlineVariant: '#F5F5F5',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#303030',
  inverseOnSurface: '#FFFFFF',
  inversePrimary: '#90CAF9',
  elevation: {
    level0: 'transparent',
    level1: '#F8F9FA',
    level2: '#F1F3F4',
    level3: '#E8EAED',
    level4: '#E0E3E6',
    level5: '#D2D7DB',
  },
  disabled: '#BDBDBD',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...colors,
  },
  roundness: 8,
  fonts: {
    ...MD3LightTheme.fonts,
    displayLarge: {
      ...MD3LightTheme.fonts.displayLarge,
      fontFamily: 'System',
    },
    displayMedium: {
      ...MD3LightTheme.fonts.displayMedium,
      fontFamily: 'System',
    },
    displaySmall: {
      ...MD3LightTheme.fonts.displaySmall,
      fontFamily: 'System',
    },
    headlineLarge: {
      ...MD3LightTheme.fonts.headlineLarge,
      fontFamily: 'System',
    },
    headlineMedium: {
      ...MD3LightTheme.fonts.headlineMedium,
      fontFamily: 'System',
    },
    headlineSmall: {
      ...MD3LightTheme.fonts.headlineSmall,
      fontFamily: 'System',
    },
    titleLarge: {
      ...MD3LightTheme.fonts.titleLarge,
      fontFamily: 'System',
      fontWeight: '600',
    },
    titleMedium: {
      ...MD3LightTheme.fonts.titleMedium,
      fontFamily: 'System',
      fontWeight: '500',
    },
    titleSmall: {
      ...MD3LightTheme.fonts.titleSmall,
      fontFamily: 'System',
      fontWeight: '500',
    },
    bodyLarge: {
      ...MD3LightTheme.fonts.bodyLarge,
      fontFamily: 'System',
    },
    bodyMedium: {
      ...MD3LightTheme.fonts.bodyMedium,
      fontFamily: 'System',
    },
    bodySmall: {
      ...MD3LightTheme.fonts.bodySmall,
      fontFamily: 'System',
    },
    labelLarge: {
      ...MD3LightTheme.fonts.labelLarge,
      fontFamily: 'System',
      fontWeight: '500',
    },
    labelMedium: {
      ...MD3LightTheme.fonts.labelMedium,
      fontFamily: 'System',
      fontWeight: '500',
    },
    labelSmall: {
      ...MD3LightTheme.fonts.labelSmall,
      fontFamily: 'System',
      fontWeight: '500',
    },
  },
};

// Dark theme colors
const darkColors = {
  ...colors,
  primary: '#90CAF9',
  primaryContainer: '#1565C0',
  secondary: '#80CBC4',
  secondaryContainer: '#00695C',
  tertiary: '#FFB74D',
  tertiaryContainer: '#E65100',
  surface: '#121212',
  surfaceVariant: '#1E1E1E',
  background: '#000000',
  error: '#EF5350',
  errorContainer: '#B71C1C',
  warning: '#FFB74D',
  warningContainer: '#E65100',
  success: '#66BB6A',
  successContainer: '#2E7D32',
  onPrimary: '#000000',
  onPrimaryContainer: '#E3F2FD',
  onSecondary: '#000000',
  onSecondaryContainer: '#E0F2F1',
  onTertiary: '#000000',
  onTertiaryContainer: '#FFF3E0',
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#BDBDBD',
  onBackground: '#FFFFFF',
  onError: '#000000',
  onErrorContainer: '#FFEBEE',
  onWarning: '#000000',
  onWarningContainer: '#FFF3E0',
  onSuccess: '#000000',
  onSuccessContainer: '#E8F5E8',
  outline: '#424242',
  outlineVariant: '#2E2E2E',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#FFFFFF',
  inverseOnSurface: '#000000',
  inversePrimary: '#2196F3',
  elevation: {
    level0: 'transparent',
    level1: '#1E1E1E',
    level2: '#232323',
    level3: '#252525',
    level4: '#272727',
    level5: '#2C2C2C',
  },
  disabled: '#616161',
  placeholder: '#757575',
  backdrop: 'rgba(0, 0, 0, 0.7)',
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  roundness: 8,
  fonts: {
    ...lightTheme.fonts,
  },
};

// Default theme (light)
export const theme = lightTheme;

// Theme utilities
export const getTheme = (isDark = false) => {
  return isDark ? darkTheme : lightTheme;
};

// Common spacing values
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Common border radius values
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Common elevation values
export const elevation = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  xxl: 16,
};

// Animation durations
export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Breakpoints for responsive design
export const breakpoints = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};

export default theme;