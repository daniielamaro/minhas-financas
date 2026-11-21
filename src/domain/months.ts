import { monthKey } from './dates';
import type { Entry } from './types';

export type MonthTotals = {
  month: string;
  gainsFixed: number;
  gainsVariable: number;
  lossesFixed: number;
  lossesVariable: number;
  gains: number;
  losses: number;
  net: number;
  deductible: number;
  partial: boolean;
};

export function countsInMonth(entry: Entry, month: string, today: string): boolean {
  if (monthKey(entry.date) !== month) return false;
  if (month === monthKey(today) && entry.date > today) return false;
  return true;
}

export function aggregateMonth(entries: Entry[], month: string, today: string): MonthTotals {
  const totals: MonthTotals = {
    month,
    gainsFixed: 0,
    gainsVariable: 0,
    lossesFixed: 0,
    lossesVariable: 0,
    gains: 0,
    losses: 0,
    net: 0,
    deductible: 0,
    partial: month === monthKey(today),
  };

  for (const entry of entries) {
    if (!countsInMonth(entry, month, today)) continue;
    if (entry.type === 'ganho') {
      totals.gains += entry.amountCents;
      if (entry.nature === 'fixo') totals.gainsFixed += entry.amountCents;
      else totals.gainsVariable += entry.amountCents;
    } else {
      totals.losses += entry.amountCents;
      if (entry.nature === 'fixo') totals.lossesFixed += entry.amountCents;
      else totals.lossesVariable += entry.amountCents;
      if (entry.deductible) totals.deductible += entry.amountCents;
    }
  }

  totals.net = totals.gains - totals.losses;
  return totals;
}

export function changeRatio(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function share(part: number, total: number): number {
  if (total <= 0) return 0;
  return part / total;
}

export function sumGainsYearToDate(entries: Entry[], month: string, today: string): number {
  const year = month.slice(0, 4);
  return entries.reduce((sum, entry) => {
    if (entry.type !== 'ganho') return sum;
    if (!entry.date.startsWith(year)) return sum;
    const entryMonth = monthKey(entry.date);
    if (entryMonth > month) return sum;
    if (entryMonth === monthKey(today) && entry.date > today) return sum;
    return sum + entry.amountCents;
  }, 0);
}
