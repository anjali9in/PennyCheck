import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const brand = {
  primary: '#176B87',
  secondary: '#B8770A',
  tertiary: '#4B7F52',
  error: '#B3261E',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    secondary: brand.secondary,
    tertiary: brand.tertiary,
    error: brand.error,
    background: '#F7F9FA',
    surface: '#FFFFFF',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#68B8D4',
    secondary: '#E6B56B',
    tertiary: '#8FCF99',
    error: '#F2B8B5',
    background: '#101416',
    surface: '#181D20',
  },
};

export type AppTheme = typeof lightTheme;
