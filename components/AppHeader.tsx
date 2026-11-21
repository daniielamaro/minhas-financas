import { MaterialIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { usePalette } from '@/components/usePalette';
import { formatClock } from '@/src/domain/dates';
import { PROFILE_LABEL } from '@/src/domain/types';
import { useFinance } from '@/src/db/FinanceContext';

export function AppHeader({ onOpenProfile }: { onOpenProfile: () => void }) {
  const colors = usePalette();
  const pathname = usePathname();
  const { profile, alarm } = useFinance();
  const onAlarm = pathname.includes('alarme');
  const profileLabel = profile ? profile.name : 'Perfil';
  const profileDescription = profile ? `${profile.name}, ${PROFILE_LABEL[profile.kind]}` : 'Nenhum perfil';
  const alarmLabel = alarm.enabled
    ? `Lembrete às ${formatClock(alarm.hour, alarm.minute)}`
    : 'Lembrete desligado';

  return (
    <View className="flex-row items-center justify-between gap-2 border-b border-outline-variant bg-surface px-4 py-3">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-md bg-primary">
          <MaterialIcons name="account-balance-wallet" size={18} color={colors.onPrimary} />
        </View>
        <Text numberOfLines={1} className="shrink font-display-semibold text-headline-sm text-on-surface">
          Minhas Finanças
        </Text>
      </View>
      <View className="shrink-0 flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Perfil, ${profileDescription}. Abrir perfis.`}
          onPress={onOpenProfile}
          hitSlop={8}
          className="min-h-11 flex-row items-center gap-1 rounded-full bg-secondary-container px-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <MaterialIcons name="badge" size={15} color={colors.onSecondaryContainer} />
          <Text numberOfLines={1} className="max-w-[108px] font-title text-label-md text-on-secondary-container">
            {profileLabel}
          </Text>
          <MaterialIcons name="expand-more" size={15} color={colors.onSecondaryContainer} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={alarmLabel}
          onPress={() => router.push('/alarme')}
          hitSlop={8}
          className={`h-11 w-11 items-center justify-center rounded-full border ${
            onAlarm ? 'border-primary bg-secondary-container' : 'border-outline-variant bg-surface-lowest'
          }`}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <MaterialIcons name={alarm.enabled ? 'alarm-on' : 'alarm'} size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}
