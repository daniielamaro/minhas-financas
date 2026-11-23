import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { AlarmTimePicker } from '@/components/AlarmTimePicker';
import { usePalette } from '@/components/usePalette';
import { Card, PrimaryButton, SwitchRow } from '@/components/ui';
import { useFinance } from '@/src/db/FinanceContext';
import { WEEKDAYS, formatClock } from '@/src/domain/dates';

export default function AlarmeScreen() {
  const colors = usePalette();
  const { alarm, alarmNotice, setAlarm } = useFinance();
  const [enabled, setEnabled] = useState(alarm.enabled);
  const [hour, setHour] = useState(alarm.hour);
  const [minute, setMinute] = useState(alarm.minute);
  const [days, setDays] = useState<number[]>(alarm.days);
  const [sound, setSound] = useState(alarm.sound);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const time = formatClock(hour, minute);
  const activeDays = WEEKDAYS.filter((day) => days.includes(day.id)).map((day) => day.label);
  const summary = !enabled
    ? 'Alarme pausado'
    : activeDays.length === 0
      ? 'Escolha ao menos um dia da semana'
      : `Ativo às ${time} em: ${activeDays.join(', ')}`;

  function chooseTime(nextHour: number, nextMinute: number) {
    setHour(nextHour);
    setMinute(nextMinute);
    setSaved(false);
  }

  function toggleDay(id: number) {
    setSaved(false);
    setDays((current) => (current.includes(id) ? current.filter((day) => day !== id) : [...current, id].sort((a, b) => a - b)));
  }

  async function save() {
    if (enabled && days.length === 0) {
      setError('Escolha ao menos um dia da semana.');
      setSaved(false);
      return;
    }
    setError('');
    await setAlarm({ enabled, hour, minute, days, sound });
    setSaved(true);
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
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
          <AlarmTimePicker hour={hour} minute={minute} onChange={chooseTime} />
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
          Platform.OS === 'web'
            ? 'No celular o alarme toca por cerca de 20 segundos no horário escolhido.'
            : Platform.OS === 'ios'
              ? 'No iPhone o alarme toca por cerca de 20 segundos. A Apple não deixa o som repetir sem parar até você abrir o app.'
              : 'No horário o celular toca cerca de 20 segundos no volume de alarme, mesmo com a tela bloqueada. O aviso fica até você dispensar ou adiar.'
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
          <Text className="font-title text-label-sm text-on-secondary-container">Prévia do alarme • {time}</Text>
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
          ? 'Neste navegador a preferência fica salva. O alarme no horário só toca no celular.'
          : 'Registrar abre a tela de lançamento. Adiar 15 min faz o alarme tocar de novo. O toque longo entra no aplicativo instalado.'}
      </Text>
      <View className="pb-4">
        <PrimaryButton label={saved ? 'Alarme salvo' : 'Salvar alarme'} onPress={() => void save()} />
      </View>
    </ScrollView>
  );
}
