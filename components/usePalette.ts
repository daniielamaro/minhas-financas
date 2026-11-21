import { useColorScheme } from 'react-native';

import { palette, type Palette, type Scheme } from '@/src/theme/tokens';

export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function usePalette(): Palette {
  return palette[useScheme()];
}
