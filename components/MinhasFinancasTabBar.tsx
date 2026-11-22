import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/components/usePalette';

const TABS: { name: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { name: 'index', label: 'Painel', icon: 'bar-chart' },
  { name: 'lancar', label: 'Lançar', icon: 'add-circle' },
  { name: 'impostos', label: 'Impostos', icon: 'receipt-long' },
  { name: 'alarme', label: 'Alarme', icon: 'alarm' },
];

export function MinhasFinancasTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const colors = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-outline-variant bg-surface-lowest px-2 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
      {state.routes.map((route, index) => {
        const tab = TABS.find((item) => item.name === route.name);
        if (!tab) return null;
        const selected = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!selected && !event.defaultPrevented) navigateToTab(route.key);
            }}
            className={`min-h-12 flex-1 items-center justify-center gap-1 rounded-md py-1 ${
              selected ? 'bg-secondary-container' : ''
            }`}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <MaterialIcons name={tab.icon} size={22} color={selected ? colors.primary : colors.onSurfaceVariant} />
            <Text className={`font-title text-label-sm ${selected ? 'text-primary' : 'text-on-surface-variant'}`}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
