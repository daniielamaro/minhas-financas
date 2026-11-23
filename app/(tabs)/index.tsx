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
import { changeRatio, settleMonth, share } from '@/src/domain/months';
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

  const settled = useMemo(() => {
    if (!profile) return [];
    return lastMonths(month, 6).map((item) => settleMonth(entries, profile, item, today));
  }, [entries, month, profile, today]);
  const current = settled.find((item) => item.totals.month === month);
  const totals = current?.totals;
  const previous = settled.find((item) => item.totals.month === lastMonths(month, 2)[0])?.totals;
  const ratio = totals && previous ? changeRatio(totals.net, previous.net) : null;
  const series = settled.map((item) => item.totals);
  const maxValue = Math.max(1, ...series.flatMap((item) => [item.gains, item.losses]));
  const recent = entries.filter((entry) => entry.date.startsWith(month) && (month !== monthKey(today) || entry.date <= today)).slice(0, 3);
  const tax = current?.estimate ?? null;

  if (!profile || !tax || !totals) {
    return <View className="flex-1 bg-surface" />;
  }
  const selected = series.find((item) => item.month === chartMonth) ?? totals;
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
              <MoneyText className="font-display text-on-surface" maxFontSize={28}>
                {formatCents(totals.net)}
              </MoneyText>
            </View>
            <View className="max-w-[42%] shrink flex-row items-center gap-1 rounded-full bg-secondary-container px-2 py-1">
              <MaterialIcons
                name={ratio !== null && ratio < 0 ? 'trending-down' : 'trending-up'}
                size={14}
                color={colors.onSecondaryContainer}
              />
              <Text className="shrink font-title text-label-sm text-on-secondary-container" numberOfLines={2}>
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
              <MoneyText className="font-display-semibold text-on-surface" maxFontSize={17}>
                {formatCents(totals.gains)}
              </MoneyText>
              <Text className="font-body text-body-sm text-on-surface-variant" numberOfLines={2}>
                Fixo {formatCents(totals.gainsFixed)} • Var {formatCents(totals.gainsVariable)}
              </Text>
            </View>
            <View className="flex-1 gap-1 rounded-md bg-surface-low p-3">
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="arrow-downward" size={16} color={colors.error} />
                <Text className="font-title text-label-sm text-error">Perdas</Text>
              </View>
              <MoneyText className="font-display-semibold text-on-surface" maxFontSize={17}>
                {formatCents(totals.losses)}
              </MoneyText>
              <Text className="font-body text-body-sm text-on-surface-variant" numberOfLines={2}>
                Fixo {formatCents(totals.lossesFixed)} • Var {formatCents(totals.lossesVariable)}
              </Text>
              {current.appliedTaxCents > 0 ? (
                <Text className="font-body text-body-sm text-on-surface-variant" numberOfLines={2}>
                  Imposto estimado {formatCents(current.appliedTaxCents)}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="min-w-0 flex-1 font-display-semibold text-headline-sm text-on-surface" numberOfLines={1}>
            Ganhos vs Perdas por mês
          </Text>
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
            <MoneyText mode="end" className="font-mono text-primary" maxFontSize={13}>
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
          <Text className="font-body text-body-sm text-on-surface-variant" numberOfLines={2}>
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
            taxShare={share(totals.taxCents, totals.losses)}
            fixedClass="bg-error"
            variableClass="bg-error-container"
            taxClass="bg-warning"
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
          <MoneyText mode="end" className="font-title text-warning" maxFontSize={15}>
            {formatCents(tax.totalCents)}
          </MoneyText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Composition({
  label,
  total,
  fixedShare,
  taxShare = 0,
  fixedClass,
  variableClass,
  taxClass,
  amountClass,
}: {
  label: string;
  total: number;
  fixedShare: number;
  taxShare?: number;
  fixedClass: string;
  variableClass: string;
  taxClass?: string;
  amountClass: string;
}) {
  const fixedPercent = Math.round(fixedShare * 100);
  const taxPercent = Math.round(taxShare * 100);
  const variablePercent = total > 0 ? Math.max(0, 100 - fixedPercent - taxPercent) : 0;
  const caption =
    total > 0
      ? `${label} (${fixedPercent}% fixo / ${variablePercent}% variável${taxPercent > 0 ? ` / ${taxPercent}% imposto` : ''})`
      : `${label} (sem movimento)`;
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="min-w-0 flex-1 font-title text-label-md text-on-surface" numberOfLines={2}>
          {caption}
        </Text>
        <MoneyText mode="end" className={`font-mono ${amountClass}`} maxFontSize={13}>
          {formatCents(total)}
        </MoneyText>
      </View>
      <View className="h-2.5 flex-row overflow-hidden rounded-full bg-surface-high">
        {total > 0 ? (
          <>
            <View className={`h-full ${fixedClass}`} style={{ width: `${fixedPercent}%` }} />
            <View className={`h-full ${variableClass}`} style={{ width: `${variablePercent}%` }} />
            {taxPercent > 0 && taxClass ? <View className={`h-full ${taxClass}`} style={{ width: `${taxPercent}%` }} /> : null}
          </>
        ) : null}
      </View>
    </View>
  );
}
