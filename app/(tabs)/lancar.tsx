import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { EntryRow } from '@/components/EntryRow';
import { MonthBar } from '@/components/MonthBar';
import { Card, FieldError, FieldLabel, PrimaryButton, SwitchRow } from '@/components/ui';
import { usePalette } from '@/components/usePalette';
import { useFinance } from '@/src/db/FinanceContext';
import { formatBrDate, monthKey, monthLabel, parseBrDate, todayISO } from '@/src/domain/dates';
import { formatAmountInput, formatCents, parseMoneyToCents } from '@/src/domain/money';
import { CATEGORIES, PROFILE_LABEL, type EntryNature, type EntryType } from '@/src/domain/types';

type FormState = {
  type: EntryType;
  nature: EntryNature;
  amount: string;
  description: string;
  category: string;
  date: string;
  deductible: boolean;
  parceled: boolean;
  installments: number;
};

type FormErrors = Partial<Record<'amount' | 'description' | 'date' | 'summary', string>>;

function emptyForm(): FormState {
  return {
    type: 'ganho',
    nature: 'fixo',
    amount: '',
    description: '',
    category: 'Serviços',
    date: formatBrDate(todayISO()),
    deductible: false,
    parceled: false,
    installments: 1,
  };
}

export default function LancarScreen() {
  const colors = usePalette();
  const { entries, profile, saveEntry, removeEntry } = useFinance();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' && params.id.length > 0 ? params.id : undefined;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [feedback, setFeedback] = useState('');
  const [listMonth, setListMonth] = useState(monthKey(todayISO()));
  const [filter, setFilter] = useState<'todos' | EntryNature>('todos');
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!editingId) {
      loadedFor.current = null;
      setForm(emptyForm());
      setErrors({});
      return;
    }
    if (loadedFor.current === editingId) return;
    const entry = entries.find((item) => item.id === editingId);
    if (!entry) {
      loadedFor.current = null;
      router.setParams({ id: '' });
      return;
    }
    loadedFor.current = editingId;
    setListMonth(monthKey(entry.date));
    setFeedback('');
    setErrors({});
    setForm({
      type: entry.type,
      nature: entry.nature,
      amount: formatAmountInput(entry.amountCents),
      description: entry.description,
      category: entry.category,
      date: formatBrDate(entry.date),
      deductible: entry.deductible,
      parceled: false,
      installments: 1,
    });
  }, [editingId, entries]);

  const visibleEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (monthKey(entry.date) !== listMonth) return false;
        if (filter === 'todos') return true;
        return entry.nature === filter;
      }),
    [entries, filter, listMonth],
  );
  const editing = entries.find((entry) => entry.id === editingId);

  async function onSubmit() {
    const nextErrors: FormErrors = {};
    const amountCents = parseMoneyToCents(form.amount);
    const date = parseBrDate(form.date);
    if (amountCents === null || amountCents <= 0) nextErrors.amount = 'Informe um valor maior que zero.';
    if (!form.description.trim()) nextErrors.description = 'Informe uma descrição.';
    if (!date) nextErrors.date = 'Use a data no formato DD/MM/AAAA.';
    if (Object.keys(nextErrors).length > 0) {
      nextErrors.summary = 'Revise os campos destacados.';
      setErrors(nextErrors);
      setFeedback('');
      return;
    }
    const savedParcels =
      !editingId && form.nature === 'variavel' && form.parceled ? Math.min(60, Math.max(2, form.installments)) : 1;
    await saveEntry({
      id: editingId,
      type: form.type,
      nature: form.nature,
      amountCents: amountCents ?? 0,
      description: form.description,
      category: form.category,
      date: date ?? todayISO(),
      deductible: form.deductible,
      installments: savedParcels,
    });
    setErrors({});
    setFeedback(editingId ? 'Alterações salvas.' : savedParcels > 1 ? `${savedParcels} parcelas salvas.` : 'Lançamento salvo.');
    setListMonth(monthKey(date ?? todayISO()));
    if (editingId) router.setParams({ id: '' });
    else setForm(emptyForm());
  }

  function confirmDelete() {
    if (!editingId) return;
    const message = editing?.recurrenceId
      ? 'Excluir só este mês? Os próximos continuam na repetição.'
      : editing?.installmentCount && editing.installmentCount > 1
        ? 'Excluir só esta parcela? As outras continuam.'
        : 'Excluir este lançamento? Esta ação não desfaz.';
    const run = async () => {
      await removeEntry(editingId);
      router.setParams({ id: '' });
      setFeedback('Lançamento excluído.');
    };
    if (Platform.OS === 'web') {
      if (window.confirm(message)) void run();
      return;
    }
    Alert.alert('Excluir lançamento', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => void run() },
    ]);
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 24 }}>
      <View className="gap-1">
        <Text className="font-title text-label-md text-on-surface-variant">
          {profile ? `${profile.name} · ${PROFILE_LABEL[profile.kind]}` : 'Registro financeiro'}
        </Text>
        <Text className="font-display text-headline-lg text-on-surface">Ganhos e Perdas</Text>
      </View>

      <Card label="Novo lançamento">
        {errors.summary ? (
          <Text accessibilityRole="alert" className="font-body text-body-sm text-error">
            {errors.summary}
          </Text>
        ) : null}
        {feedback ? <Text className="font-body text-body-sm text-primary">{feedback}</Text> : null}

        <View className="gap-1">
          <FieldLabel>Tipo de movimento</FieldLabel>
          <View className="flex-row gap-1 rounded-md bg-surface-low p-1">
            <Segment
              label="Ganho"
              icon="arrow-upward"
              selected={form.type === 'ganho'}
              selectedClass="bg-primary"
              onPress={() => setForm((current) => ({ ...current, type: 'ganho', deductible: false }))}
            />
            <Segment
              label="Perda"
              icon="arrow-downward"
              selected={form.type === 'perda'}
              selectedClass="bg-error"
              selectedText="text-on-error"
              onPress={() => setForm((current) => ({ ...current, type: 'perda' }))}
            />
          </View>
        </View>

        <View className="gap-1">
          <FieldLabel>Classificação</FieldLabel>
          <View className="flex-row gap-1 rounded-md bg-surface-low p-1">
            <Segment
              label="Fixo (mensal)"
              icon="repeat"
              selected={form.nature === 'fixo'}
              selectedClass="bg-secondary-container"
              selectedText="text-on-secondary-container"
              onPress={() => setForm((current) => ({ ...current, nature: 'fixo' }))}
            />
            <Segment
              label="Variável"
              icon="flash-on"
              selected={form.nature === 'variavel'}
              selectedClass="bg-secondary-container"
              selectedText="text-on-secondary-container"
              onPress={() => setForm((current) => ({ ...current, nature: 'variavel' }))}
            />
          </View>
        </View>

        <View className="gap-1">
          <FieldLabel>
            {form.nature === 'variavel' && !editingId && form.parceled ? 'Valor de cada parcela' : 'Valor'}
          </FieldLabel>
          <View className="flex-row items-center rounded-md border border-outline-variant bg-surface-lowest px-3">
            <Text className="font-mono text-mono-md text-on-surface-variant">R$</Text>
            <TextInput
              accessibilityLabel="Valor"
              value={form.amount}
              onChangeText={(amount) => setForm((current) => ({ ...current, amount }))}
              placeholder="0,00"
              placeholderTextColor={colors.outline}
              keyboardType="decimal-pad"
              className="min-h-12 flex-1 px-2 font-display-semibold text-headline-sm text-on-surface"
            />
          </View>
          <FieldError>{errors.amount}</FieldError>
        </View>

        <View className="gap-1">
          <FieldLabel>Descrição</FieldLabel>
          <TextInput
            accessibilityLabel="Descrição"
            value={form.description}
            onChangeText={(description) => setForm((current) => ({ ...current, description }))}
            placeholder="Ex.: Projeto de identidade visual"
            placeholderTextColor={colors.outline}
            className="min-h-12 rounded-md border border-outline-variant bg-surface-lowest px-3 font-body text-body-md text-on-surface"
          />
          <FieldError>{errors.description}</FieldError>
        </View>

        <View className="gap-1">
          <FieldLabel>Data</FieldLabel>
          <TextInput
            accessibilityLabel="Data"
            value={form.date}
            onChangeText={(date) => setForm((current) => ({ ...current, date }))}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.outline}
            className="min-h-12 rounded-md border border-outline-variant bg-surface-lowest px-3 font-body text-body-md text-on-surface"
          />
          <FieldError>{errors.date}</FieldError>
        </View>

        <View className="gap-2">
          <FieldLabel>Categoria</FieldLabel>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const selected = form.category === category;
              return (
                <Pressable
                  key={category}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setForm((current) => ({ ...current, category }))}
                  className={`min-h-11 items-center justify-center rounded-full px-3 ${
                    selected ? 'bg-secondary-container' : 'bg-surface-low'
                  }`}>
                  <Text className={`font-title text-label-sm ${selected ? 'text-on-secondary-container' : 'text-on-surface-variant'}`}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {form.type === 'perda' ? (
          <SwitchRow
            title="Despesa dedutível"
            description="Entra na base da estimativa de imposto deste mês."
            value={form.deductible}
            onValueChange={(deductible) => setForm((current) => ({ ...current, deductible }))}
          />
        ) : null}
        {form.nature === 'fixo' ? (
          <Text className="font-body text-body-sm text-on-surface-variant">
            {editing?.recurrenceId
              ? 'Fixo entra todo mês. Alterar o valor aqui vale só para este mês.'
              : 'Fixo entra todo mês, a partir da data escolhida.'}
          </Text>
        ) : editing?.installmentCount && editing.installmentCount > 1 ? (
          <Text className="font-body text-body-sm text-on-surface-variant">
            Parcela {editing.installmentIndex} de {editing.installmentCount}. Alterar o valor vale só para este mês.
          </Text>
        ) : !editingId ? (
          <View className="gap-3">
            <SwitchRow
              title="Parcelas"
              description="Divide o valor em vários meses. Cada parcela usa o mesmo valor."
              value={form.parceled}
              onValueChange={(parceled) =>
                setForm((current) => ({
                  ...current,
                  parceled,
                  installments: parceled ? Math.max(2, current.installments) : 1,
                }))
              }
            />
            {form.parceled ? (
              <InstallmentField
                count={form.installments}
                amountCents={parseMoneyToCents(form.amount)}
                onChange={(installments) => setForm((current) => ({ ...current, installments }))}
              />
            ) : null}
          </View>
        ) : (
          <Text className="font-body text-body-sm text-on-surface-variant">Variável entra só neste mês.</Text>
        )}

        <PrimaryButton
          label={editingId ? 'Salvar alterações' : 'Salvar lançamento'}
          icon="check"
          onPress={() => void onSubmit()}
        />
        {editingId ? (
          <Pressable accessibilityRole="button" onPress={confirmDelete} className="min-h-11 items-center justify-center">
            <Text className="font-title text-label-lg text-error">Excluir lançamento</Text>
          </Pressable>
        ) : null}
      </Card>

      <View className="gap-3 pb-4">
        <MonthBar label={monthLabel(listMonth)} month={listMonth} onChange={setListMonth} />
        <View className="flex-row justify-end gap-1">
          {(
            [
              ['todos', 'Todos'],
              ['fixo', 'Fixos'],
              ['variavel', 'Variáveis'],
            ] as const
          ).map(([value, label]) => {
            const selected = filter === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(value)}
                className={`min-h-11 items-center justify-center rounded-full px-3 ${selected ? 'bg-primary' : 'bg-surface-low'}`}>
                <Text className={`font-title text-label-sm ${selected ? 'text-on-primary' : 'text-on-surface-variant'}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {visibleEntries.length === 0 ? (
          <Text className="font-body text-body-md text-on-surface-variant">Nenhum lançamento neste mês.</Text>
        ) : (
          visibleEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onPress={() => router.setParams({ id: entry.id })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function InstallmentField({
  count,
  amountCents,
  onChange,
}: {
  count: number;
  amountCents: number | null;
  onChange: (count: number) => void;
}) {
  const colors = usePalette();
  const total = amountCents && amountCents > 0 ? amountCents * count : null;
  return (
    <View className="gap-2">
      <FieldLabel>Parcelas</FieldLabel>
      <View className="flex-row items-center justify-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Diminuir parcelas"
          accessibilityState={{ disabled: count <= 2 }}
          disabled={count <= 2}
          onPress={() => onChange(Math.max(2, count - 1))}
          className="h-12 w-12 items-center justify-center rounded-md border border-outline-variant bg-surface-lowest"
          style={({ pressed }) => ({ opacity: count <= 2 ? 0.4 : pressed ? 0.85 : 1 })}>
          <MaterialIcons name="remove" size={22} color={colors.onSurface} />
        </Pressable>
        <Text className="min-w-12 text-center font-mono text-headline-lg text-on-surface">{count}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Aumentar parcelas"
          accessibilityState={{ disabled: count >= 60 }}
          disabled={count >= 60}
          onPress={() => onChange(Math.min(60, count + 1))}
          className="h-12 w-12 items-center justify-center rounded-md border border-outline-variant bg-surface-lowest"
          style={({ pressed }) => ({ opacity: count >= 60 ? 0.4 : pressed ? 0.85 : 1 })}>
          <MaterialIcons name="add" size={22} color={colors.onSurface} />
        </Pressable>
      </View>
      <Text className="font-body text-body-sm text-on-surface-variant">
        {total
          ? `${count} parcelas de ${formatCents(amountCents ?? 0)}. Total ${formatCents(total)}.`
          : `${count} parcelas, uma em cada mês a partir da data escolhida.`}
      </Text>
    </View>
  );
}

function Segment({
  label,
  icon,
  selected,
  selectedClass,
  selectedText = 'text-on-primary',
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  selected: boolean;
  selectedClass: string;
  selectedText?: string;
  onPress: () => void;
}) {
  const colors = usePalette();
  const tone = !selected
    ? colors.onSurfaceVariant
    : selectedText.includes('error')
      ? colors.onError
      : selectedText.includes('secondary')
        ? colors.onSecondaryContainer
        : colors.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-11 flex-1 flex-row items-center justify-center gap-1 rounded-sm px-2 ${selected ? selectedClass : ''}`}>
      <MaterialIcons name={icon} size={16} color={tone} />
      <Text className={`font-title text-label-md ${selected ? selectedText : 'text-on-surface-variant'}`}>{label}</Text>
    </Pressable>
  );
}
