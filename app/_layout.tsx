import '../global.css';

import { Commissioner_400Regular, Commissioner_600SemiBold } from '@expo-google-fonts/commissioner';
import { RedHatDisplay_600SemiBold, RedHatDisplay_700Bold } from '@expo-google-fonts/red-hat-display';
import { SplineSansMono_500Medium } from '@expo-google-fonts/spline-sans-mono';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useScheme } from '@/components/usePalette';
import { FinanceProvider, useFinance } from '@/src/db/FinanceContext';
import { ACTION_REGISTER, ACTION_SNOOZE, snoozeAlarm } from '@/src/notifications/schedule';
import { themeVars } from '@/src/theme/tokens';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    RedHatDisplay_600SemiBold,
    RedHatDisplay_700Bold,
    Commissioner_400Regular,
    Commissioner_600SemiBold,
    SplineSansMono_500Medium,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <FinanceProvider>
        <ThemedShell />
      </FinanceProvider>
    </SafeAreaProvider>
  );
}

function ThemedShell() {
  const scheme = useScheme();
  return (
    <View style={themeVars(scheme)} className="flex-1">
      <View className="flex-1 items-center bg-surface-high">
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NotificationBridge />
      <View className="w-full max-w-md flex-1 bg-background">
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
      </View>
    </View>
  );
}

function NotificationBridge() {
  const { alarm } = useFinance();
  const sound = useRef(alarm.sound);
  sound.current = alarm.sound;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier === ACTION_SNOOZE) {
        void snoozeAlarm(sound.current);
        return;
      }
      if (
        response.actionIdentifier === ACTION_REGISTER ||
        response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        router.push('/lancar');
      }
    });
    return () => subscription.remove();
  }, []);

  return null;
}
