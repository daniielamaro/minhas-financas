import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EntryRow } from '@/components/EntryRow';
import { MonthBar } from '@/components/MonthBar';
import { usePalette } from '@/components/usePalette';
import { Card, MoneyText, PrimaryButton } from '@/components/ui';
import { useFinance } from '@/src/db/FinanceContext';
import { chartMonthLabel, lastMonths, monthKey, monthLabel, periodCaption, todayISO } from '@/src/domain/dates';
import { formatCents, formatRatio } from '@/src/domain/money';
import { aggregateMonth, changeRatio, share, sumGainsYearToDate } from '@/src/domain/months';
import { estimateTax } from '@/src/domain/tax';
import { PROFILE_LABEL } from '@/src/domain/types';

export default function PainelScreen() {
  const colors = usePalette();
  const { entries, profile } = useFinance();
  const today = todayISO();
  const [month, setMonth] = useState(monthKey(today));
  const [chartMonth, setChartMonth] = useState(monthKey(today));

  useEffect(() => {
    setChartMonth(month);
  }, [month]);

  const totals = aggregateMonth(entries, month, today);
  const previous = aggregateMonth(entries, lastMonths(month, 2)[0], today);
  const ratio = changeRatio(totals.net, previous.net);
  const series = useMemo(
    () => lastMonths(month, 6).map((item) => aggregateMonth(entries, item, today)),
    [entries, month, today],
  );
  const maxValue = Math.max(1, ...series.flatMap((item) => [item.gains, item.losses]));
  const selected = series.find((item) => item.month === chartMonth) ?? totals;
  const recent = entries.filter((entry) => entry.date.startsWith(month) && (month !== monthKey(today) || entry.date <= today)).slice(0, 3);
  const tax = profile
    ? estimateTax({
    kind: profile.kind,
    grossCents: totals.gains,
    deductibleCents: totals.deductible,
    yearToDateGrossCents: sumGainsYearToDate(entries, month, today),
    meiActivity: profile.meiActivity,
    issRate: profile.issRate,
    inssEnabled: profile.inssEnabled,
    reserveRate: profile.reserveRate,
    pjRate: profile.pjRate,
  })
    : null;

  if (!profile || !tax) {
    return <View className="flex-1 bg-surface" />;
  }
  const gainFixedShare = share(totals.gainsFixed, totals.gains);
  const lossFixedShare = share(totals.lossesFixed, totals.losses);
  const movement = series.some((item) => item.gains > 0 || item.losses > 0);

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 24 }}>
      <View className="gap-3">
        <MonthBar label={periodCaption(month, today)} month={month} onChange={setMonth} />
        <View className="flex-row items-end justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-title text-label-md text-on-surface-variant">
              {profile.name} · {PROFILE_LABEL[profile.kind]}
            </Text>
            <Text className="font-display text-headline-lg text-on-surface">Painel Mensal</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lançar"
            onPress={() => router.push('/lancar')}
            className="min-h-11 flex-row items-center gap-1 rounded-md bg-primary px-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <MaterialIcons name="add" size={18} color={colors.onPrimary} />
            <Text className="font-title text-label-md text-on-primary">Lançar</Text>
          </Pressable>
        </View>

        <Card label="Resumo do mês">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="font-title text-label-md text-on-surface-variant">Saldo líquido do mês</Text>
              <MoneyText className="font-display text-display-mobile text-on-surface">{formatCents(totals.net)}</MoneyText>
            </View>
            <View className="flex-row items-center gap-1 rounded-full bg-secondary-container px-2 py-1">
              <MaterialIcons
                name={ratio !== null && ratio < 0 ? 'trending-down' : 'trending-up'}
                size={14}
                color={colors.onSecondaryContainer}
              />
              <Text className="font-title text-label-sm text-on-secondary-container">
                {ratio === null ? 'Sem base no mês anterior' : ratio < 0 ? `Queda de ${formatRatio(ratio)}` : `Alta de ${formatRatio(ratio)}`}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-3 border-t border-outline-variant pt-3">
            <View className="flex-1 gap-1 rounded-md bg-surface-low p-3">
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="arrow-upward" size={16} color={colors.primary} />
                <Text className="font-title text-label-sm text-primary">Ganhos</Text>
              </View>
              <MoneyText className="font-display-semibold text-headline-sm text-on-surface">{formatCents(totals.gains)}</MoneyText>
              <Text className="font-body text-body-sm text-on-surface-variant">
                Fixo {formatCents(totals.gainsFixed)} • Var {formatCents(totals.gainsVariable)}
              </Text>
            </View>
            <View className="flex-1 gap-1 rounded-md bg-surface-low p-3">
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="arrow-downward" size={16} color={colors.error} />
                <Text className="font-title text-label-sm text-error">Perdas</Text>
              </View>
              <MoneyText className="font-display-semibold text-headline-sm text-on-surface">{formatCents(totals.losses)}</MoneyText>
              <Text className="font-body text-body-sm text-on-surface-variant">
                Fixo {formatCents(totals.lossesFixed)} • Var {formatCents(totals.lossesVariable)}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-display-semibold text-headline-sm text-on-surface">Ganhos vs Perdas por mês</Text>
          <Text className="font-title text-label-sm text-on-surface-variant">Últimos 6 meses</Text>
        </View>
        <Card>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <View className="h-2.5 w-2.5 rounded-full bg-primary" />
                <Text className="font-title text-label-sm text-on-surface-variant">Ganhos</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="h-2.5 w-2.5 rounded-full bg-error" />
                <Text className="font-title text-label-sm text-on-surface-variant">Perdas</Text>
              </View>
            </View>
            <MoneyText className="font-mono text-mono-md text-primary">
              {`${chartMonthLabel(selected.month)}: ${formatCents(selected.net)}`}
            </MoneyText>
          </View>
          {movement ? (
            <View className="h-40 flex-row items-end gap-2 border-b border-outline-variant pb-2">
              {series.map((item) => {
                const active = item.month === chartMonth;
                return (
                  <Pressable
                    key={item.month}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${monthLabel(item.month)}: ganhos ${formatCents(item.gains)}, perdas ${formatCents(item.losses)}`}
                    onPress={() => setChartMonth(item.month)}
                    className="h-full flex-1 items-center justify-end gap-1">
                    <View className="h-28 w-full flex-row items-end justify-center gap-1">
                      <View
                        className="w-2.5 rounded-sm bg-primary"
                        style={{ height: `${Math.max(item.gains > 0 ? 8 : 0, (item.gains / maxValue) * 100)}%`, opacity: active ? 1 : 0.45 }}
                      />
                      <View
                        className="w-2.5 rounded-sm bg-error"
                        style={{ height: `${Math.max(item.losses > 0 ? 8 : 0, (item.losses / maxValue) * 100)}%`, opacity: active ? 1 : 0.45 }}
                      />
                    </View>
                    <Text className={`font-title text-label-sm ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {chartMonthLabel(item.month)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text className="font-body text-body-md text-on-surface-variant">Sem movimento nos últimos 6 meses.</Text>
          )}
          <Text className="font-body text-body-sm text-on-surface-variant">
            {`${monthLabel(selected.month)}${selected.partial ? ' (parcial)' : ''}: Ganhos ${formatCents(selected.gains)} • Perdas ${formatCents(selected.losses)}`}
          </Text>
        </Card>
      </View>

      <View className="gap-3">
        <Text className="font-display-semibold text-headline-sm text-on-surface">Fixos vs Variáveis</Text>
        <Card>
          <Composition
            label="Ganhos"
            total={totals.gains}
            fixedShare={gainFixedShare}
            fixedClass="bg-primary"
            variableClass="bg-secondary-container"
            amountClass="text-primary"
          />
          <Composition
            label="Perdas"
            total={totals.losses}
            fixedShare={lossFixedShare}
            fixedClass="bg-error"
            variableClass="bg-error-container"
            amountClass="text-error"
          />
        </Card>
      </View>

      <View className="gap-3 pb-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-display-semibold text-headline-sm text-on-surface">Últimos lançamentos</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/lancar')} hitSlop={8}>
            <Text className="font-title text-label-md text-primary">Ver todos</Text>
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <Card>
            <Text className="font-body text-body-md text-on-surface">Nenhum lançamento neste mês.</Text>
            <PrimaryButton label="Registrar agora" icon="add" onPress={() => router.push('/lancar')} />
          </Card>
        ) : (
          recent.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onPress={() => router.push({ pathname: '/lancar', params: { id: entry.id } })} />
          ))
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Imposto estimado de ${profile.name}, ${PROFILE_LABEL[profile.kind]}, ${formatCents(tax.totalCents)}`}
          onPress={() => router.push('/impostos')}
          className="min-h-16 flex-row items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-lowest p-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-md bg-warning-container">
              <MaterialIcons name="account-balance" size={20} color={colors.onWarningContainer} />
            </View>
            <View className="flex-1">
              <Text className="font-title text-title-md text-on-surface">Imposto de {profile.name}</Text>
              <Text className="font-body text-body-sm text-on-surface-variant">
                {monthLabel(month)} • {tax.dueLabel}
              </Text>
            </View>
          </View>
          <MoneyText className="font-title text-title-md text-warning">{formatCents(tax.totalCents)}</MoneyText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Composition({
  label,
  total,
  fixedShare,
  fixedClass,
  variableClass,
  amountClass,
}: {
  label: string;
  total: number;
  fixedShare: number;
  fixedClass: string;
  variableClass: string;
  amountClass: string;
}) {
  const fixedPercent = Math.round(fixedShare * 100);
  const variablePercent = total > 0 ? 100 - fixedPercent : 0;
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 font-title text-label-md text-on-surface">
          {total > 0 ? `${label} (${fixedPercent}% fixo / ${variablePercent}% variável)` : `${label} (sem movimento)`}
        </Text>
        <MoneyText className={`font-mono text-mono-md ${amountClass}`}>{formatCents(total)}</MoneyText>
      </View>
      <View className="h-2.5 flex-row overflow-hidden rounded-full bg-surface-high">
        {total > 0 ? (
          <>
            <View className={`h-full ${fixedClass}`} style={{ width: `${fixedPercent}%` }} />
            <View className={`h-full ${variableClass}`} style={{ width: `${variablePercent}%` }} />
          </>
        ) : null}
      </View>
    </View>
  );
}
