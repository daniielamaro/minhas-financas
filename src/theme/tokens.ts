import { vars } from 'nativewind';

export type Scheme = 'light' | 'dark';

export type Palette = {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  surface: string;
  surfaceLowest: string;
  surfaceLow: string;
  surfaceHigh: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  warning: string;
  warningContainer: string;
  onWarningContainer: string;
};

export const palette: Record<Scheme, Palette> = {
  light: {
    primary: '#005444',
    onPrimary: '#FFFFFF',
    primaryContainer: '#0D6E5B',
    onPrimaryContainer: '#9AEDD5',
    secondary: '#47645B',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#C9EADE',
    onSecondaryContainer: '#18362E',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',
    background: '#F7FAF7',
    surface: '#F7FAF7',
    surfaceLowest: '#FFFFFF',
    surfaceLow: '#F1F4F1',
    surfaceHigh: '#E5E9E6',
    onSurface: '#181C1B',
    onSurfaceVariant: '#3E4945',
    outline: '#6F7975',
    outlineVariant: '#BEC9C4',
    warning: '#92400E',
    warningContainer: '#FEF3C7',
    onWarningContainer: '#78350F',
  },
  dark: {
    primary: '#84D6BF',
    onPrimary: '#00382D',
    primaryContainer: '#0D6E5B',
    onPrimaryContainer: '#9AEDD5',
    secondary: '#ADCDC2',
    onSecondary: '#18362E',
    secondaryContainer: '#324F46',
    onSecondaryContainer: '#C9EADE',
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    background: '#101413',
    surface: '#101413',
    surfaceLowest: '#0B0F0E',
    surfaceLow: '#181C1B',
    surfaceHigh: '#272B29',
    onSurface: '#E0E3E0',
    onSurfaceVariant: '#BEC9C4',
    outline: '#88938E',
    outlineVariant: '#3E4945',
    warning: '#FBBF24',
    warningContainer: '#78350F',
    onWarningContainer: '#FEF3C7',
  },
};

export function themeVars(scheme: Scheme) {
  const colors = palette[scheme];
  return vars({
    '--color-primary': colors.primary,
    '--color-on-primary': colors.onPrimary,
    '--color-primary-container': colors.primaryContainer,
    '--color-on-primary-container': colors.onPrimaryContainer,
    '--color-secondary': colors.secondary,
    '--color-on-secondary': colors.onSecondary,
    '--color-secondary-container': colors.secondaryContainer,
    '--color-on-secondary-container': colors.onSecondaryContainer,
    '--color-error': colors.error,
    '--color-on-error': colors.onError,
    '--color-error-container': colors.errorContainer,
    '--color-on-error-container': colors.onErrorContainer,
    '--color-background': colors.background,
    '--color-surface': colors.surface,
    '--color-surface-lowest': colors.surfaceLowest,
    '--color-surface-low': colors.surfaceLow,
    '--color-surface-high': colors.surfaceHigh,
    '--color-on-surface': colors.onSurface,
    '--color-on-surface-variant': colors.onSurfaceVariant,
    '--color-outline': colors.outline,
    '--color-outline-variant': colors.outlineVariant,
    '--color-warning': colors.warning,
    '--color-warning-container': colors.warningContainer,
    '--color-on-warning-container': colors.onWarningContainer,
  });
}
