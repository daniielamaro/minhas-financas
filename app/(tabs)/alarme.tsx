import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { usePalette } from '@/components/usePalette';
import { Card, PrimaryButton, SwitchRow } from '@/components/ui';
import { useFinance } from '@/src/db/FinanceContext';
import { WEEKDAYS, formatClock, parseClock } from '@/src/domain/dates';

const PRESETS = ['09:00', '20:00', '21:30'];

export default function AlarmeScreen() {
  const colors = usePalette();
  const { alarm, alarmNotice, setAlarm } = useFinance();
  const [enabled, setEnabled] = useState(alarm.enabled);
  const [time, setTime] = useState(formatClock(alarm.hour, alarm.minute));
  const [days, setDays] = useState<number[]>(alarm.days);
  const [sound, setSound] = useState(alarm.sound);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const clock = parseClock(time);
  const activeDays = WEEKDAYS.filter((day) => days.includes(day.id)).map((day) => day.label);
  const summary = !enabled
    ? 'Alarme pausado'
    : activeDays.length === 0
      ? 'Escolha ao menos um dia da semana'
      : `Ativo às ${clock ? formatClock(clock.hour, clock.minute) : time} em: ${activeDays.join(', ')}`;

  function toggleDay(id: number) {
    setSaved(false);
    setDays((current) => (current.includes(id) ? current.filter((day) => day !== id) : [...current, id].sort((a, b) => a - b)));
  }

  async function save() {
    const parsed = parseClock(time);
    if (!parsed) {
      setError('Use um horário válido, como 20:00.');
      setSaved(false);
      return;
    }
    if (enabled && days.length === 0) {
      setError('Escolha ao menos um dia da semana.');
      setSaved(false);
      return;
    }
    setError('');
    await setAlarm({ enabled, hour: parsed.hour, minute: parsed.minute, days, sound });
    setSaved(true);
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 24 }}>
      <View className="gap-1">
        <Text className="font-title text-label-md text-on-surface-variant">Rotina de atualização</Text>
        <Text className="font-display text-headline-lg text-on-surface">Alarme e Lembretes</Text>
      </View>

      <SwitchRow
        title="Alarme diário"
        description="Lembra de registrar ganhos e perdas no horário e nos dias escolhidos."
        value={enabled}
        onValueChange={(next) => {
          setEnabled(next);
          setSaved(false);
        }}
      />

      <Card label="Horário do alarme">
        <View className="flex-row items-center justify-between">
          <Text className="font-display-semibold text-headline-sm text-on-surface">Horário do alarme</Text>
          <MaterialIcons name="schedule" size={20} color={colors.primary} />
        </View>
        <View className="gap-3 rounded-md bg-surface-low p-3">
          <TextInput
            accessibilityLabel="Escolher horário do alarme"
            value={time}
            onChangeText={(value) => {
              setTime(value);
              setSaved(false);
            }}
            placeholder="20:00"
            placeholderTextColor={colors.outline}
            className="font-display text-display-mobile text-on-surface"
          />
          <View className="flex-row flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const selected = time === preset;
              return (
                <Pressable
                  key={preset}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setTime(preset);
                    setSaved(false);
                  }}
                  className={`min-h-11 items-center justify-center rounded-full px-3 ${
                    selected ? 'bg-primary' : 'border border-outline-variant bg-surface-lowest'
                  }`}>
                  <Text className={`font-mono text-mono-md ${selected ? 'text-on-primary' : 'text-on-surface-variant'}`}>{preset}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card label="Dias da semana">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-display-semibold text-headline-sm text-on-surface">Dias da semana</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDays(WEEKDAYS.map((day) => day.id));
              setSaved(false);
            }}
            hitSlop={8}>
            <Text className="font-title text-label-md text-primary">Todos os dias</Text>
          </Pressable>
        </View>
        <View className="flex-row gap-1">
          {WEEKDAYS.map((day) => {
            const selected = days.includes(day.id);
            return (
              <Pressable
                key={day.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={day.label}
                onPress={() => toggleDay(day.id)}
                className={`h-11 flex-1 items-center justify-center rounded-full ${
                  selected ? 'bg-primary' : 'bg-surface-low'
                }`}>
                <Text className={`font-title text-label-sm ${selected ? 'text-on-primary' : 'text-on-surface-variant'}`}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="font-body text-body-sm text-on-surface-variant">{summary}</Text>
      </Card>

      <SwitchRow
        title="Som e vibração"
        description={
          Platform.OS === 'ios'
            ? 'O iOS avisa no horário, mas não deixa o som repetir até você lançar.'
            : 'No Android o aviso usa um canal de alta importância. O sistema não mantém um alarme em loop.'
        }
        value={sound}
        onValueChange={(next) => {
          setSound(next);
          setSaved(false);
        }}
      />

      <View className="flex-row items-start gap-3 rounded-lg bg-secondary-container p-3">
        <MaterialIcons name="notifications-active" size={20} color={colors.onSecondaryContainer} />
        <View className="flex-1 gap-1">
          <Text className="font-title text-label-sm text-on-secondary-container">Prévia da notificação • {clock ? formatClock(clock.hour, clock.minute) : time}</Text>
          <Text className="font-body text-body-sm text-on-secondary-container">
            Hora de atualizar seus ganhos e perdas de hoje em Minhas Finanças.
          </Text>
        </View>
      </View>

      {error ? <Text className="font-body text-body-sm text-error">{error}</Text> : null}
      {saved ? <Text className="font-body text-body-sm text-primary">Alarme salvo.</Text> : null}
      {alarmNotice ? <Text className="font-body text-body-sm text-on-surface-variant">{alarmNotice}</Text> : null}
      <Text className="font-body text-body-sm text-on-surface-variant">
        {Platform.OS === 'web'
          ? 'Neste navegador a preferência fica salva. O aviso no horário só é agendado no celular.'
          : 'Registrar abre a tela de lançamento. Adiar 15 min cria um novo aviso único.'}
      </Text>
      <View className="pb-4">
        <PrimaryButton label={saved ? 'Alarme salvo' : 'Salvar alarme'} onPress={() => void save()} />
      </View>
    </ScrollView>
  );
}
