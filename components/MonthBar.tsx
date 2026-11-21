import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { usePalette } from '@/components/usePalette';
import { addMonths } from '@/src/domain/dates';

export function MonthBar({
  label,
  month,
  onChange,
}: {
  label: string;
  month: string;
  onChange: (month: string) => void;
}) {
  const colors = usePalette();
  return (
    <View className="flex-row items-center justify-between gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
        onPress={() => onChange(addMonths(month, -1))}
        hitSlop={8}
        className="h-11 w-11 items-center justify-center rounded-full"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <MaterialIcons name="chevron-left" size={24} color={colors.onSurface} />
      </Pressable>
      <Text className="flex-1 text-center font-title text-label-md text-on-surface-variant">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próximo mês"
        onPress={() => onChange(addMonths(month, 1))}
        hitSlop={8}
        className="h-11 w-11 items-center justify-center rounded-full"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <MaterialIcons name="chevron-right" size={24} color={colors.onSurface} />
      </Pressable>
    </View>
  );
}
