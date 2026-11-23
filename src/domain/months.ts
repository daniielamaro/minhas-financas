import { monthKey } from './dates';
import { estimateTax, type TaxEstimate } from './tax';
import type { Entry, LedgerProfile } from './types';

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
  taxCents: number;
  partial: boolean;
};

export type SettledMonth = {
  totals: MonthTotals;
  estimate: TaxEstimate;
  appliedTaxCents: number;
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
    taxCents: 0,
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

export function sumImpostos(entries: Entry[], month: string, today: string): number {
  return entries.reduce((sum, entry) => {
    if (entry.type !== 'perda' || entry.category !== 'Impostos') return sum;
    if (!countsInMonth(entry, month, today)) return sum;
    return sum + entry.amountCents;
  }, 0);
}

export function applyEstimatedTax(totals: MonthTotals, taxCents: number): MonthTotals {
  const tax = Math.max(0, Math.round(taxCents));
  return {
    ...totals,
    taxCents: tax,
    losses: totals.losses + tax,
    net: totals.net - tax,
  };
}

export function settleMonth(entries: Entry[], profile: LedgerProfile, month: string, today: string): SettledMonth {
  const base = aggregateMonth(entries, month, today);
  const booked = sumImpostos(entries, month, today);
  const active = base.gains > 0 || base.losses > 0 || month === monthKey(today);
  const estimate = estimateTax({
    kind: profile.kind,
    grossCents: base.gains,
    deductibleCents: base.deductible,
    yearToDateGrossCents: sumGainsYearToDate(entries, month, today),
    meiActivity: profile.meiActivity,
    issRate: profile.issRate,
    inssEnabled: profile.inssEnabled,
    reserveRate: profile.reserveRate,
    pjRate: profile.pjRate,
  });
  const added = active ? Math.max(0, estimate.totalCents - booked) : 0;
  return {
    totals: applyEstimatedTax(base, added),
    estimate,
    appliedTaxCents: active ? estimate.totalCents : 0,
  };
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
