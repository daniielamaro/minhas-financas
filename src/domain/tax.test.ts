import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  estimateTax,
  inssAutonomoCents,
  monthlyReductionCents,
  progressiveMonthlyTaxCents,
} from './tax.ts';

test('tabela progressiva e redutor batem com o exemplo oficial de R$ 6.000', () => {
  const base = 539_280;
  const bracket = progressiveMonthlyTaxCents(base);
  assert.equal(bracket, 57_429);
  const reduction = monthlyReductionCents(600_000, bracket);
  assert.equal(reduction, 17_975);
  assert.equal(bracket - reduction, 39_454);
});

test('rendimento de R$ 4.500 com desconto simplificado zera o IR', () => {
  const base = 389_280;
  const bracket = progressiveMonthlyTaxCents(base);
  assert.equal(bracket, 20_039);
  const reduction = monthlyReductionCents(450_000, bracket);
  assert.equal(reduction, 20_039);
  assert.equal(bracket - reduction, 0);
});

test('PF usa a opção que gera menos imposto', () => {
  const estimate = estimateTax({
    kind: 'PF',
    grossCents: 600_000,
    deductibleCents: 0,
    yearToDateGrossCents: 600_000,
    meiActivity: 'servicos',
    issRate: 0.03,
    inssEnabled: true,
    reserveRate: 0,
    pjRate: 0.06,
  });
  assert.equal(estimate.totalCents, 39_454);
});

test('MEI de serviços soma INSS de 5% e ISS fixo', () => {
  const estimate = estimateTax({
    kind: 'MEI',
    grossCents: 984_000,
    deductibleCents: 0,
    yearToDateGrossCents: 5_864_000,
    meiActivity: 'servicos',
    issRate: 0.03,
    inssEnabled: true,
    reserveRate: 0,
    pjRate: 0.06,
  });
  assert.equal(estimate.totalCents, 8_605);
  assert.equal(estimate.lines[0]?.cents, 8_105);
  assert.equal(estimate.lines[1]?.cents, 500);
});

test('MEI comércio e serviços soma ICMS e ISS', () => {
  const estimate = estimateTax({
    kind: 'MEI',
    grossCents: 100,
    deductibleCents: 0,
    yearToDateGrossCents: 100,
    meiActivity: 'ambos',
    issRate: 0,
    inssEnabled: false,
    reserveRate: 0,
    pjRate: 0,
  });
  assert.equal(estimate.totalCents, 8_705);
});

test('INSS do autônomo respeita piso e teto', () => {
  assert.equal(inssAutonomoCents(0), 0);
  assert.equal(inssAutonomoCents(50_000), 32_420);
  assert.equal(inssAutonomoCents(984_000), 169_511);
});

test('autônomo soma INSS, ISS e IR sobre a base reduzida', () => {
  const estimate = estimateTax({
    kind: 'AUTONOMO',
    grossCents: 984_000,
    deductibleCents: 185_000,
    yearToDateGrossCents: 984_000,
    meiActivity: 'servicos',
    issRate: 0.03,
    inssEnabled: true,
    reserveRate: 0,
    pjRate: 0.06,
  });
  assert.equal(estimate.totalCents, 281_267);
});

test('PJ aplica a alíquota informada sobre o ganho bruto', () => {
  const estimate = estimateTax({
    kind: 'PJ',
    grossCents: 984_000,
    deductibleCents: 185_000,
    yearToDateGrossCents: 984_000,
    meiActivity: 'servicos',
    issRate: 0,
    inssEnabled: false,
    reserveRate: 0,
    pjRate: 0.06,
  });
  assert.equal(estimate.totalCents, 59_040);
});

test('freelancer não soma a reserva ao imposto', () => {
  const estimate = estimateTax({
    kind: 'FREELANCER',
    grossCents: 600_000,
    deductibleCents: 0,
    yearToDateGrossCents: 600_000,
    meiActivity: 'servicos',
    issRate: 0,
    inssEnabled: false,
    reserveRate: 0.09,
    pjRate: 0,
  });
  assert.equal(estimate.totalCents, 39_454);
  assert.equal(estimate.lines.at(-1)?.cents, 54_000);
});
