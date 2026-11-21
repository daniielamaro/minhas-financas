import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { usePalette } from '@/components/usePalette';
import { MoneyText } from '@/components/ui';
import { shortDayLabel } from '@/src/domain/dates';
import { formatSignedCents } from '@/src/domain/money';
import type { Entry } from '@/src/domain/types';

export function EntryRow({ entry, onPress }: { entry: Entry; onPress: () => void }) {
  const colors = usePalette();
  const gain = entry.type === 'ganho';
  const iconName = gain
    ? entry.nature === 'fixo'
      ? 'repeat'
      : 'trending-up'
    : entry.nature === 'fixo'
      ? 'home'
      : 'flash-on';
  const natureLabel = entry.nature === 'fixo' ? 'Fixo' : 'Variável';
  const typeLabel = gain ? 'Ganho' : 'Perda';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.description}, ${typeLabel}, ${natureLabel}, ${formatSignedCents(entry.amountCents, entry.type)}`}
      onPress={onPress}
      className="min-h-16 flex-row items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-lowest p-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View className="flex-1 flex-row items-center gap-3">
        <View
          className={`h-10 w-10 items-center justify-center rounded-md ${
            gain ? 'bg-secondary-container' : 'bg-error-container'
          }`}>
          <MaterialIcons
            name={iconName}
            size={20}
            color={gain ? colors.onSecondaryContainer : colors.onErrorContainer}
          />
        </View>
        <View className="flex-1">
          <Text className="font-title text-title-md text-on-surface" numberOfLines={1}>
            {entry.description}
          </Text>
          <Text className="font-body text-body-sm text-on-surface-variant">
            {entry.category} • {natureLabel} • {shortDayLabel(entry.date)}
          </Text>
        </View>
      </View>
      <MoneyText className={`font-title text-title-md ${gain ? 'text-primary' : 'text-error'}`}>
        {formatSignedCents(entry.amountCents, entry.type)}
      </MoneyText>
    </Pressable>
  );
}
