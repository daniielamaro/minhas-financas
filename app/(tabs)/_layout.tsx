import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { MinhasFinancasTabBar } from '@/components/MinhasFinancasTabBar';
import { ProfileSheet } from '@/components/ProfileSheet';
import { useFinance } from '@/src/db/FinanceContext';

export default function TabLayout() {
  const { ready, error, profile } = useFinance();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="font-body text-body-md text-on-surface">Carregando Minhas Finanças…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center font-body text-body-md text-on-surface">{error}</Text>
      </View>
    );
  }

  const mustChoose = profile === null;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <AppHeader onOpenProfile={() => setProfileOpen(true)} />
        <Tabs tabBar={(props) => <MinhasFinancasTabBar {...props} />} screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="index" options={{ title: 'Painel' }} />
          <Tabs.Screen name="lancar" options={{ title: 'Lançar' }} />
          <Tabs.Screen name="impostos" options={{ title: 'Impostos' }} />
          <Tabs.Screen name="alarme" options={{ title: 'Alarme' }} />
        </Tabs>
      </SafeAreaView>
      <ProfileSheet visible={profileOpen || mustChoose} dismissable={!mustChoose} onClose={() => setProfileOpen(false)} />
    </View>
  );
}
