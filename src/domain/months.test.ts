import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addMonths, clampDay, lastMonths, monthsInclusive } from './dates.ts';
import { aggregateMonth, changeRatio, sumGainsYearToDate } from './months.ts';
import type { Entry } from './types.ts';

function entry(partial: Partial<Entry> & Pick<Entry, 'type' | 'nature' | 'amountCents' | 'date'>): Entry {
  return {
    id: partial.id ?? partial.date + partial.type,
    description: partial.description ?? 'Item',
    category: partial.category ?? 'Serviços',
    deductible: partial.deductible ?? false,
    recurrenceId: partial.recurrenceId ?? null,
    createdAt: partial.createdAt ?? partial.date,
    updatedAt: partial.updatedAt ?? partial.date,
    ...partial,
  };
}

test('mês atual ignora lançamentos futuros e separa fixo de variável', () => {
  const totals = aggregateMonth(
    [
      entry({ type: 'ganho', nature: 'fixo', amountCents: 620_000, date: '2026-11-05' }),
      entry({ type: 'ganho', nature: 'variavel', amountCents: 320_000, date: '2026-11-18' }),
      entry({ type: 'perda', nature: 'fixo', amountCents: 185_000, date: '2026-11-10', deductible: true }),
      entry({ type: 'perda', nature: 'variavel', amountCents: 50_000, date: '2026-11-22' }),
      entry({ type: 'ganho', nature: 'fixo', amountCents: 10_000, date: '2026-10-05' }),
    ],
    '2026-11',
    '2026-11-21',
  );

  assert.equal(totals.gainsFixed, 620_000);
  assert.equal(totals.gainsVariable, 320_000);
  assert.equal(totals.lossesFixed, 185_000);
  assert.equal(totals.losses, 185_000);
  assert.equal(totals.deductible, 185_000);
  assert.equal(totals.net, 755_000);
  assert.equal(totals.partial, true);
});

test('variação usa o módulo do mês anterior', () => {
  assert.equal(changeRatio(642_000, 562_000), (642_000 - 562_000) / 562_000);
  assert.equal(changeRatio(100, 0), null);
});

test('ganhos do ano somam até o mês visto e até hoje', () => {
  const entries = [
    entry({ type: 'ganho', nature: 'variavel', amountCents: 100, date: '2026-01-10' }),
    entry({ type: 'ganho', nature: 'variavel', amountCents: 200, date: '2026-11-20' }),
    entry({ type: 'ganho', nature: 'variavel', amountCents: 400, date: '2026-11-22' }),
    entry({ type: 'perda', nature: 'variavel', amountCents: 50, date: '2026-11-01' }),
    entry({ type: 'ganho', nature: 'variavel', amountCents: 900, date: '2025-12-01' }),
  ];
  assert.equal(sumGainsYearToDate(entries, '2026-11', '2026-11-21'), 300);
});

test('calendário gera meses e encurta o dia 31', () => {
  assert.deepEqual(lastMonths('2026-11', 6), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.deepEqual(monthsInclusive('2026-11', '2027-01'), ['2026-11', '2026-12', '2027-01']);
  assert.equal(clampDay('2026-02', 31), '2026-02-28');
});
