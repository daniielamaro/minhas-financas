import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { formatClock } from '@/src/domain/dates';

const ITEM = 44;
const VIEWPORT = ITEM * 3;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function clamp(value: number, length: number) {
  return Math.min(length - 1, Math.max(0, value));
}

export function AlarmTimePicker({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  return (
    <View className="gap-2">
      <Text
        accessibilityLabel={`Horário ${formatClock(hour, minute)}, formato 24 horas`}
        className="text-center font-mono text-headline-lg text-on-surface">
        {formatClock(hour, minute)}
      </Text>
      <View className="flex-row">
        <Text className="flex-1 text-center font-title text-label-sm text-on-surface-variant">Hora</Text>
        <View className="w-8" />
        <Text className="flex-1 text-center font-title text-label-sm text-on-surface-variant">Minuto</Text>
      </View>
      <View className="relative flex-row items-center">
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-11 h-11 rounded-md bg-secondary-container"
        />
        <Wheel
          label="Hora"
          length={24}
          value={hour}
          onChange={(next) => onChange(next, minute)}
        />
        <Text className="w-8 text-center font-mono text-headline-sm text-on-secondary-container">:</Text>
        <Wheel
          label="Minuto"
          length={60}
          value={minute}
          onChange={(next) => onChange(hour, next)}
        />
      </View>
    </View>
  );
}

function Wheel({
  label,
  length,
  value,
  onChange,
}: {
  label: string;
  length: number;
  value: number;
  onChange: (next: number) => void;
}) {
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(value * ITEM);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [center, setCenter] = useState(value);

  useEffect(() => {
    const y = value * ITEM;
    if (Math.abs(offset.current - y) <= 2) return;
    offset.current = y;
    setCenter(value);
    list.current?.scrollTo({ y, animated: false });
  }, [value]);

  useEffect(
    () => () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
    },
    [],
  );

  function indexAt(y: number) {
    return clamp(Math.round(y / ITEM), length);
  }

  function onScroll(y: number) {
    offset.current = y;
    const next = indexAt(y);
    setCenter((current) => (current === next ? current : next));
    if (next !== value) onChange(next);
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const snapped = indexAt(offset.current) * ITEM;
      if (Math.abs(offset.current - snapped) > 2) {
        list.current?.scrollTo({ y: snapped, animated: true });
      }
    }, 140);
  }

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: pad(value) }}
      accessibilityActions={[
        { name: 'increment', label: 'Aumentar' },
        { name: 'decrement', label: 'Diminuir' },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') onChange(clamp(value + 1, length));
        if (event.nativeEvent.actionName === 'decrement') onChange(clamp(value - 1, length));
      }}
      className="h-[132px] flex-1 overflow-hidden">
      <ScrollView
        ref={list}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEventThrottle={16}
        contentOffset={{ x: 0, y: value * ITEM }}
        onLayout={() => list.current?.scrollTo({ y: value * ITEM, animated: false })}
        onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
        style={{ height: VIEWPORT, overscrollBehavior: 'contain' }}>
        <View style={{ height: ITEM }} />
        {Array.from({ length }, (_, index) => {
          const distance = Math.abs(index - center);
          const selected = distance === 0;
          return (
            <Pressable
              key={index}
              accessible={false}
              importantForAccessibility="no"
              onPress={() => onChange(index)}
              style={{ height: ITEM, opacity: selected ? 1 : distance === 1 ? 0.55 : 0.28 }}
              className="items-center justify-center">
              <Text
                className={`font-mono ${
                  selected ? 'text-headline-sm text-on-secondary-container' : 'text-title-md text-on-surface-variant'
                }`}>
                {pad(index)}
              </Text>
            </Pressable>
          );
        })}
        <View style={{ height: ITEM }} />
      </ScrollView>
    </View>
  );
}
