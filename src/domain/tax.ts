import type { MeiActivity, ProfileKind } from './types';

/** Vigência conferida para 2026. Não é apuração oficial. */
export const TAX_YEAR = 2026;

export const SALARIO_MINIMO_CENTS = 162_100;
export const INSS_TETO_CENTS = 847_555;
export const MEI_ANNUAL_LIMIT_CENTS = 8_100_000;
export const MEI_ISS_CENTS = 500;
export const MEI_ICMS_CENTS = 100;
export const SIMPLIFIED_DISCOUNT_CENTS = 60_720;
export const IR_REDUCTION_CAP_CENTS = 31_289;
export const IR_REDUCTION_FULL_UP_TO_CENTS = 500_000;
export const IR_REDUCTION_PARTIAL_UP_TO_CENTS = 735_000;
export const IR_REDUCTION_INTERCEPT_CENTS = 97_862;
export const IR_REDUCTION_SLOPE = 0.133145;

export const VIGENCE_NOTE =
  'Vigência 2026: tabela mensal da Lei 15.191/2025, redutor da Lei 15.270/2025, salário mínimo de R$ 1.621,00 (Decreto 12.797/2025) e teto do MEI de R$ 81.000,00.';

export const DISCLAIMER =
  'Estimativa para organização pessoal. Não substitui contador, DAS, DARF nem a Receita Federal.';

const MONTHLY_BRACKETS = [
  { upToCents: 242_880, rate: 0, deductionCents: 0 },
  { upToCents: 282_665, rate: 0.075, deductionCents: 18_216 },
  { upToCents: 375_105, rate: 0.15, deductionCents: 39_416 },
  { upToCents: 466_468, rate: 0.225, deductionCents: 67_549 },
  { upToCents: Number.POSITIVE_INFINITY, rate: 0.275, deductionCents: 90_873 },
] as const;

export type TaxInput = {
  kind: ProfileKind;
  grossCents: number;
  deductibleCents: number;
  yearToDateGrossCents: number;
  meiActivity: MeiActivity;
  issRate: number;
  inssEnabled: boolean;
  reserveRate: number;
  pjRate: number;
};

export type TaxLine = {
  label: string;
  cents: number;
};

export type TaxEstimate = {
  totalCents: number;
  effectiveRate: number;
  regime: string;
  dueLabel: string;
  lines: TaxLine[];
  note: string;
};

export function progressiveMonthlyTaxCents(baseCents: number): number {
  if (baseCents <= 0) return 0;
  const bracket =
    MONTHLY_BRACKETS.find((item) => baseCents <= item.upToCents) ??
    MONTHLY_BRACKETS[MONTHLY_BRACKETS.length - 1];
  return Math.max(0, Math.round(baseCents * bracket.rate) - bracket.deductionCents);
}

export function monthlyReductionCents(rendimentosCents: number, bracketTaxCents: number): number {
  if (bracketTaxCents <= 0 || rendimentosCents <= 0) return 0;
  if (rendimentosCents <= IR_REDUCTION_FULL_UP_TO_CENTS) {
    return Math.min(bracketTaxCents, IR_REDUCTION_CAP_CENTS);
  }
  if (rendimentosCents <= IR_REDUCTION_PARTIAL_UP_TO_CENTS) {
    const reduction = Math.round(IR_REDUCTION_INTERCEPT_CENTS - IR_REDUCTION_SLOPE * rendimentosCents);
    return Math.min(bracketTaxCents, Math.max(0, reduction));
  }
  return 0;
}

export function inssAutonomoCents(grossCents: number): number {
  if (grossCents <= 0) return 0;
  const base = Math.min(Math.max(grossCents, SALARIO_MINIMO_CENTS), INSS_TETO_CENTS);
  return Math.round(base * 0.2);
}

function clampRate(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0) return 0;
  if (rate > 1) return 1;
  return rate;
}

function effective(totalCents: number, grossCents: number): number {
  if (grossCents <= 0) return 0;
  return totalCents / grossCents;
}

type IrChoice = {
  baseCents: number;
  bracketTaxCents: number;
  reductionCents: number;
  taxCents: number;
  usedSimplified: boolean;
};

function chooseIr(grossCents: number, itemizedDeductions: number): IrChoice {
  const gross = Math.max(0, grossCents);
  const itemizedBase = Math.max(0, gross - Math.max(0, itemizedDeductions));
  const simplifiedBase = Math.max(0, gross - SIMPLIFIED_DISCOUNT_CENTS);
  const itemizedBracket = progressiveMonthlyTaxCents(itemizedBase);
  const simplifiedBracket = progressiveMonthlyTaxCents(simplifiedBase);
  const itemizedReduction = monthlyReductionCents(gross, itemizedBracket);
  const simplifiedReduction = monthlyReductionCents(gross, simplifiedBracket);
  const itemizedTax = itemizedBracket - itemizedReduction;
  const simplifiedTax = simplifiedBracket - simplifiedReduction;
  if (simplifiedTax < itemizedTax) {
    return {
      baseCents: simplifiedBase,
      bracketTaxCents: simplifiedBracket,
      reductionCents: simplifiedReduction,
      taxCents: simplifiedTax,
      usedSimplified: true,
    };
  }
  return {
    baseCents: itemizedBase,
    bracketTaxCents: itemizedBracket,
    reductionCents: itemizedReduction,
    taxCents: itemizedTax,
    usedSimplified: false,
  };
}

function irLines(choice: IrChoice): TaxLine[] {
  const lines: TaxLine[] = [{ label: 'Base tributável', cents: choice.baseCents }];
  if (choice.reductionCents > 0) {
    lines.push({ label: 'Imposto pela tabela, antes do redutor', cents: choice.bracketTaxCents });
    lines.push({ label: 'Redutor de 2026', cents: choice.reductionCents });
  }
  lines.push({ label: 'IR estimado', cents: choice.taxCents });
  return lines;
}

function meiNote(yearToDateGrossCents: number): string {
  const used = Math.max(0, yearToDateGrossCents);
  const percent = (used / MEI_ANNUAL_LIMIT_CENTS) * 100;
  const percentLabel = percent.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const money = (used / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (used > MEI_ANNUAL_LIMIT_CENTS) {
    return `Os ganhos de ${TAX_YEAR} somam ${money}, acima do teto anual de R$ 81.000,00. O DAS desta estimativa continua fixo; passar do teto pode desenquadrar o MEI.`;
  }
  return `Os ganhos de ${TAX_YEAR} somam ${money} (${percentLabel}%) do teto anual de R$ 81.000,00. O DAS não muda com o faturamento do mês.`;
}

export function estimateTax(input: TaxInput): TaxEstimate {
  const gross = Math.max(0, Math.round(input.grossCents));
  const deductible = Math.max(0, Math.round(input.deductibleCents));

  if (input.kind === 'MEI') {
    const inss = Math.round(SALARIO_MINIMO_CENTS * 0.05);
    const lines: TaxLine[] = [{ label: 'INSS (5% do salário mínimo)', cents: inss }];
    if (input.meiActivity === 'servicos' || input.meiActivity === 'ambos') {
      lines.push({ label: 'ISS fixo', cents: MEI_ISS_CENTS });
    }
    if (input.meiActivity === 'comercio' || input.meiActivity === 'ambos') {
      lines.push({ label: 'ICMS fixo', cents: MEI_ICMS_CENTS });
    }
    const total = lines.reduce((sum, line) => sum + line.cents, 0);
    const activityLabel =
      input.meiActivity === 'servicos' ? 'Serviços' : input.meiActivity === 'comercio' ? 'Comércio' : 'Comércio e serviços';
    return {
      totalCents: total,
      effectiveRate: effective(total, gross),
      regime: `DAS fixo mensal • ${activityLabel}`,
      dueLabel: 'Vence dia 20',
      lines,
      note: meiNote(input.yearToDateGrossCents),
    };
  }

  if (input.kind === 'PJ') {
    const rate = clampRate(input.pjRate);
    const total = Math.round(gross * rate);
    const percent = (rate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return {
      totalCents: total,
      effectiveRate: effective(total, gross),
      regime: `Simples Nacional • alíquota informada de ${percent}%`,
      dueLabel: 'Vence dia 20',
      lines: [{ label: `DAS estimado (${percent}% sobre o ganho bruto)`, cents: total }],
      note: 'A faixa real depende do faturamento dos últimos 12 meses. 6% é só a primeira faixa do Anexo III. Esta estimativa não calcula o Fator R.',
    };
  }

  if (input.kind === 'AUTONOMO') {
    const inss = input.inssEnabled ? inssAutonomoCents(gross) : 0;
    const iss = Math.round(gross * clampRate(input.issRate));
    const choice = chooseIr(gross, deductible + inss);
    const total = inss + iss + choice.taxCents;
    const issPercent = (clampRate(input.issRate) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    const lines: TaxLine[] = [
      {
        label: input.inssEnabled
          ? 'INSS estimado (20% entre o salário mínimo e o teto)'
          : 'INSS não incluído',
        cents: inss,
      },
      { label: `ISS estimado (${issPercent}%)`, cents: iss },
      ...irLines(choice),
    ];
    return {
      totalCents: total,
      effectiveRate: effective(total, gross),
      regime: 'Contribuinte individual • INSS + ISS + Carnê-Leão',
      dueLabel: 'Carnê-Leão no mês seguinte',
      lines,
      note: choice.usedSimplified
        ? 'O desconto simplificado de R$ 607,20 reduziu o IR mais do que as deduções informadas. O plano de 20% do INSS não pode ficar abaixo do salário mínimo nem acima do teto.'
        : 'O IR usa os ganhos menos INSS e despesas dedutíveis. O plano de 20% do INSS não pode ficar abaixo do salário mínimo nem acima do teto.',
    };
  }

  const choice = chooseIr(gross, deductible);
  const lines = irLines(choice);
  const reserve = Math.round(gross * clampRate(input.reserveRate));
  if (input.kind === 'FREELANCER' && reserve > 0) {
    lines.push({ label: 'Reserva sugerida (não entra no imposto)', cents: reserve });
  }

  const simplifiedNote = choice.usedSimplified
    ? 'O desconto simplificado mensal de R$ 607,20 foi usado porque ficou menor do que as deduções informadas.'
    : 'As deduções informadas reduziram a base. Se forem menores que R$ 607,20, a estimativa compara com o desconto simplificado.';

  if (input.kind === 'FREELANCER') {
    return {
      totalCents: choice.taxCents,
      effectiveRate: effective(choice.taxCents, gross),
      regime: 'Pessoa física • Carnê-Leão',
      dueLabel: 'Carnê-Leão no mês seguinte',
      lines,
      note: `Freelancer não é um regime tributário. A conta é a mesma da pessoa física. ${simplifiedNote}`,
    };
  }

  return {
    totalCents: choice.taxCents,
    effectiveRate: effective(choice.taxCents, gross),
    regime: 'Carnê-Leão • tabela progressiva mensal',
    dueLabel: 'Carnê-Leão no mês seguinte',
    lines,
    note: simplifiedNote,
  };
}
