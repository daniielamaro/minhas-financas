export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatSignedCents(cents: number, type: 'ganho' | 'perda'): string {
  const formatted = formatCents(Math.abs(cents));
  return type === 'ganho' ? `+ ${formatted}` : `− ${formatted}`;
}

export function formatAmountInput(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '').replace(/R\$/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function parsePercent(input: string): number | null {
  const normalized = input.trim().replace('%', '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return value / 100;
}

export function formatPercentRate(rate: number, digits = 0): string {
  return (rate * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(digits, 2),
  });
}

export function formatRatio(ratio: number): string {
  return `${Math.abs(ratio * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}
