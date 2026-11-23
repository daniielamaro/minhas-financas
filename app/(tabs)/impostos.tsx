import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { MonthBar } from '@/components/MonthBar';
import { usePalette } from '@/components/usePalette';
import { Card, FieldError, FieldLabel, MoneyText, SecondaryButton, SwitchRow } from '@/components/ui';
import { useFinance } from '@/src/db/FinanceContext';
import { monthKey, monthLabel, todayISO } from '@/src/domain/dates';
import { formatAmountInput, formatCents, formatPercentRate, parseMoneyToCents, parsePercent } from '@/src/domain/money';
import { aggregateMonth, sumGainsYearToDate } from '@/src/domain/months';
import { DISCLAIMER, VIGENCE_NOTE, estimateTax } from '@/src/domain/tax';
import { PROFILE_LABEL, PROFILE_ORDER, type MeiActivity, type ProfileKind } from '@/src/domain/types';

const ACTIVITIES: { id: MeiActivity; label: string }[] = [
  { id: 'servicos', label: 'Serviços' },
  { id: 'comercio', label: 'Comércio' },
  { id: 'ambos', label: 'Ambos' },
];

export default function ImpostosScreen() {
  const colors = usePalette();
  const { entries, profile, updateProfile } = useFinance();
  const today = todayISO();
  const [month, setMonth] = useState(monthKey(today));
  const [dirty, setDirty] = useState(false);
  const [grossText, setGrossText] = useState('0,00');
  const [deductibleText, setDeductibleText] = useState('0,00');
  const [issText, setIssText] = useState(formatPercentRate(profile?.issRate ?? 0.03, 0));
  const [reserveText, setReserveText] = useState(formatPercentRate(profile?.reserveRate ?? 0.09, 0));
  const [pjText, setPjText] = useState(formatPercentRate(profile?.pjRate ?? 0.06, 0));
  const [fieldError, setFieldError] = useState('');
  const [notice, setNotice] = useState('');

  const totals = aggregateMonth(entries, month, today);

  useEffect(() => {
    if (!profile) return;
    setIssText(formatPercentRate(profile.issRate, 0));
    setReserveText(formatPercentRate(profile.reserveRate, 0));
    setPjText(formatPercentRate(profile.pjRate, 0));
  }, [profile]);

  useEffect(() => {
    setDirty(false);
    setFieldError('');
  }, [profile?.id]);

  useEffect(() => {
    if (dirty) return;
    setGrossText(formatAmountInput(totals.gains));
    setDeductibleText(formatAmountInput(totals.deductible));
  }, [dirty, totals.deductible, totals.gains]);

  const estimate = useMemo(() => {
    const gross = parseMoneyToCents(grossText) ?? 0;
    const deductible = parseMoneyToCents(deductibleText) ?? 0;
    if (!profile) return null;
    return estimateTax({
      kind: profile.kind,
      grossCents: gross,
      deductibleCents: deductible,
      yearToDateGrossCents: sumGainsYearToDate(entries, month, today),
      meiActivity: profile.meiActivity,
      issRate: profile.issRate,
      inssEnabled: profile.inssEnabled,
      reserveRate: profile.reserveRate,
      pjRate: profile.pjRate,
    });
  }, [deductibleText, entries, grossText, month, profile, today]);

  function changeMonth(next: string) {
    setMonth(next);
    setDirty(false);
    setNotice('');
  }

  function syncFromEntries() {
    setDirty(false);
    setGrossText(formatAmountInput(totals.gains));
    setDeductibleText(formatAmountInput(totals.deductible));
    setFieldError('');
    setNotice(`Base sincronizada com ${monthLabel(month)}.`);
  }

  function recalculate() {
    const gross = parseMoneyToCents(grossText);
    const deductible = parseMoneyToCents(deductibleText);
    if (gross === null || deductible === null) {
      setFieldError('Use valores como 1.250,00.');
      setNotice('');
      return;
    }
    setFieldError('');
    setNotice('Imposto recalculado.');
  }

  async function choose(kind: ProfileKind) {
    if (!profile) return;
    await updateProfile({ ...profile, kind });
  }

  async function chooseActivity(meiActivity: MeiActivity) {
    if (!profile) return;
    await updateProfile({ ...profile, meiActivity });
  }

  async function commitRate(field: 'issRate' | 'reserveRate' | 'pjRate', text: string, fallback: string) {
    const rate = parsePercent(text);
    if (rate === null) {
      setFieldError('Informe um percentual entre 0 e 100.');
      if (field === 'issRate') setIssText(fallback);
      if (field === 'reserveRate') setReserveText(fallback);
      if (field === 'pjRate') setPjText(fallback);
      return;
    }
    if (!profile) return;
    setFieldError('');
    await updateProfile({ ...profile, [field]: rate });
  }

  if (!profile || !estimate) {
    return <View className="flex-1 bg-surface" />;
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 24 }}>
      <View className="gap-1">
        <Text className="font-title text-label-md text-on-surface-variant">
          {profile.name} · estimativa
        </Text>
        <Text className="font-display text-headline-lg text-on-surface">Cálculo de Imposto</Text>
      </View>

      <View className="gap-2">
        <FieldLabel>Tipo deste perfil</FieldLabel>
        <View className="flex-row flex-wrap gap-2">
          {PROFILE_ORDER.map((kind) => {
            const selected = profile.kind === kind;
            return (
              <Pressable
                key={kind}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => choose(kind)}
                className={`min-h-11 items-center justify-center rounded-full px-4 ${
                  selected ? 'bg-primary' : 'border border-outline-variant bg-surface-lowest'
                }`}>
                <Text className={`font-title text-label-md ${selected ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                  {PROFILE_LABEL[kind]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card label="Resumo do imposto estimado">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="font-title text-title-md text-on-surface">Imposto de {profile.name}</Text>
            <Text className="font-body text-body-sm text-on-surface-variant">{estimate.regime}</Text>
          </View>
          <View className="rounded-full bg-warning-container px-2 py-1">
            <Text className="font-title text-label-sm text-on-warning-container">{estimate.dueLabel}</Text>
          </View>
        </View>
        <View className="flex-row items-end justify-between gap-3">
          <View className="min-w-0 flex-1">
            <MoneyText className="font-display text-on-surface" maxFontSize={28}>
              {formatCents(estimate.totalCents)}
            </MoneyText>
          </View>
          <Text className="shrink font-mono text-mono-md text-primary" numberOfLines={1}>
            {formatPercentRate(estimate.effectiveRate, 2)}% efetivo
          </Text>
        </View>
        <View className="gap-2 border-t border-outline-variant pt-3">
          {estimate.lines.map((line) => (
            <View key={line.label} className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 font-body text-body-sm text-on-surface-variant">{line.label}</Text>
              <MoneyText mode="end" className="font-mono text-on-surface" maxFontSize={13}>
                {formatCents(line.cents)}
              </MoneyText>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-display-semibold text-headline-sm text-on-surface">Base de cálculo</Text>
          <Text className="font-title text-label-sm text-primary">{dirty ? 'Ajuste manual' : `Sincronizado com ${monthLabel(month)}`}</Text>
        </View>
        <MonthBar label={monthLabel(month)} month={month} onChange={changeMonth} />
        <View className="gap-1">
          <FieldLabel>Ganhos brutos no mês</FieldLabel>
          <MoneyInput
            label="Ganhos brutos no mês"
            value={grossText}
            onChangeText={(value) => {
              setDirty(true);
              setGrossText(value);
            }}
          />
        </View>
        <View className="gap-1">
          <FieldLabel>Despesas dedutíveis</FieldLabel>
          <MoneyInput
            label="Despesas dedutíveis"
            value={deductibleText}
            onChangeText={(value) => {
              setDirty(true);
              setDeductibleText(value);
            }}
          />
        </View>
        <FieldError>{fieldError}</FieldError>
        {notice ? (
          <Text accessibilityRole="alert" className="font-body text-body-sm text-primary">
            {notice}
          </Text>
        ) : null}
        <SecondaryButton label="Recalcular imposto" onPress={recalculate} />
        <Pressable accessibilityRole="button" onPress={syncFromEntries} className="min-h-11 items-center justify-center">
          <Text className="font-title text-label-md text-primary">Usar lançamentos do mês</Text>
        </Pressable>
      </Card>

      {profile.kind === 'MEI' ? (
        <View className="gap-2">
          <FieldLabel>Atividade do MEI</FieldLabel>
          <View className="flex-row flex-wrap gap-2">
            {ACTIVITIES.map((activity) => {
              const selected = profile.meiActivity === activity.id;
              return (
                <Pressable
                  key={activity.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => chooseActivity(activity.id)}
                  className={`min-h-11 items-center justify-center rounded-full px-4 ${
                    selected ? 'bg-primary' : 'border border-outline-variant bg-surface-lowest'
                  }`}>
                  <Text className={`font-title text-label-md ${selected ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                    {activity.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {profile.kind === 'AUTONOMO' ? (
        <Card>
          <View className="gap-1">
            <FieldLabel>ISS municipal (%)</FieldLabel>
            <TextInput
              accessibilityLabel="Alíquota de ISS"
              value={issText}
              onChangeText={setIssText}
              onBlur={() => commitRate('issRate', issText, formatPercentRate(profile.issRate, 0))}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.outline}
              className="min-h-12 rounded-md border border-outline-variant bg-surface-lowest px-3 font-body text-body-md text-on-surface"
            />
          </View>
          <SwitchRow
            title="Incluir INSS"
            description="20% do ganho, limitado ao piso do salário mínimo e ao teto do INSS."
            value={profile.inssEnabled}
            onValueChange={(inssEnabled) => updateProfile({ ...profile, inssEnabled })}
          />
        </Card>
      ) : null}

      {profile.kind === 'FREELANCER' ? (
        <Card>
          <View className="gap-1">
            <FieldLabel>Reserva sugerida (%)</FieldLabel>
            <TextInput
              accessibilityLabel="Percentual de reserva"
              value={reserveText}
              onChangeText={setReserveText}
              onBlur={() => commitRate('reserveRate', reserveText, formatPercentRate(profile.reserveRate, 0))}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.outline}
              className="min-h-12 rounded-md border border-outline-variant bg-surface-lowest px-3 font-body text-body-md text-on-surface"
            />
            <Text className="font-body text-body-sm text-on-surface-variant">
              A reserva fica separada do imposto. Zero esconde a sugestão.
            </Text>
          </View>
        </Card>
      ) : null}

      {profile.kind === 'PJ' ? (
        <Card>
          <View className="gap-1">
            <FieldLabel>Alíquota efetiva (%)</FieldLabel>
            <TextInput
              accessibilityLabel="Alíquota efetiva"
              value={pjText}
              onChangeText={setPjText}
              onBlur={() => commitRate('pjRate', pjText, formatPercentRate(profile.pjRate, 0))}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.outline}
              className="min-h-12 rounded-md border border-outline-variant bg-surface-lowest px-3 font-body text-body-md text-on-surface"
            />
          </View>
        </Card>
      ) : null}

      <View className="mb-4 flex-row items-start gap-3 rounded-lg bg-surface-low p-3">
        <MaterialIcons name="info" size={20} color={colors.primary} />
        <View className="flex-1 gap-2">
          <Text className="font-body text-body-sm text-on-surface-variant">{estimate.note}</Text>
          <Text className="font-body text-body-sm text-on-surface-variant">{DISCLAIMER}</Text>
          <Text className="font-body text-body-sm text-on-surface-variant">{VIGENCE_NOTE}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function MoneyInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const colors = usePalette();
  return (
    <View className="flex-row items-center rounded-md border border-outline-variant bg-surface-lowest px-3">
      <Text className="font-mono text-mono-md text-on-surface-variant">R$</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.outline}
        className="min-h-12 flex-1 px-2 font-display-semibold text-headline-sm text-on-surface"
      />
    </View>
  );
}
