import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePalette } from '@/components/usePalette';

export function Card({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <View
      accessibilityLabel={label}
      className="gap-3 rounded-lg border border-outline-variant bg-surface-lowest p-4">
      {children}
    </View>
  );
}

export function MoneyText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <Text className={className} style={{ fontVariant: ['tabular-nums'] }}>
      {children}
    </Text>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  const colors = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-12 flex-row items-center justify-center gap-2 rounded-md bg-primary px-6"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {icon ? <MaterialIcons name={icon} size={18} color={colors.onPrimary} /> : null}
      <Text className="font-title text-label-lg text-on-primary">{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-12 items-center justify-center rounded-md bg-secondary-container px-4"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Text className="font-title text-label-lg text-on-secondary-container">{label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text className="font-title text-label-md text-on-surface">{children}</Text>;
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <Text className="font-body text-body-sm text-error">{children}</Text>;
}

export function SwitchRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const colors = usePalette();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      aria-checked={value}
      accessibilityLabel={title}
      onPress={() => onValueChange(!value)}
      className="min-h-12 flex-row items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-lowest p-4">
      <View className="flex-1 gap-1">
        <Text className="font-title text-title-md text-on-surface">{title}</Text>
        <Text className="font-body text-body-sm text-on-surface-variant">{description}</Text>
      </View>
      <View
        className={`h-7 w-12 justify-center rounded-full px-0.5 ${value ? 'bg-primary' : 'border border-outline-variant bg-surface-high'}`}>
        <View
          className="h-5 w-5 rounded-full"
          style={{
            backgroundColor: value ? colors.onPrimary : colors.outline,
            transform: [{ translateX: value ? 20 : 0 }],
          }}
        />
      </View>
    </Pressable>
  );
}
