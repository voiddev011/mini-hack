import { expect, it } from 'vitest';
import { evaluateAlertRules, alertEventKey } from '../alertRules';

const metric = { value: 12, unit: 't CO₂e', source: 'company.pdf', page: 2, reportingColumn: 'FY2024-25 standalone', confirmation: 'User-confirmed PDF extraction candidate; not independently audited by TrustCarbon.' };
const analysis = { company: 'Company A', report: { reportingYear: 'FY2024-25', confirmedMetrics: { scope1: metric } }, latestTotal: { value: 500 }, growthPercent: 50 };
const rule = { id: 'rule1', company: 'Company A', enabled: true, metric: 'scope1', operator: 'gt', threshold: 10, unit: 't CO₂e' };
it('evaluates strict thresholds and carries document evidence', () => {
  expect(evaluateAlertRules([rule], analysis)).toEqual([expect.objectContaining({ observed_value: 12, evidence: expect.objectContaining({ source: 'company.pdf', page: 2, reporting_column: 'FY2024-25 standalone' }) })]);
  expect(evaluateAlertRules([{ ...rule, operator: 'lt', threshold: 13 }], analysis)).toHaveLength(1);
  expect(evaluateAlertRules([{ ...rule, threshold: 12 }], analysis)).toEqual([]);
});
it('skips unavailable, disabled, other-company and incompatible-unit rules', () => {
  for (const patch of [{ enabled: false }, { company: 'B' }, { metric: 'scope3' }, { metric: 'reported_total' }, { metric: 'yoy_change_percent' }, { unit: 'Mt CO₂e' }, { threshold: NaN }, { operator: 'gte' }]) {
    expect(evaluateAlertRules([{ ...rule, ...patch }], analysis)).toEqual([]);
  }
});
it('requires confirmation and complete source/page/column evidence', () => {
  for (const patch of [{ confirmation: '' }, { source: '' }, { page: null }, { reportingColumn: '' }, { reportingColumn: 'FY2023-24 standalone' }, { unit: 'Not stated in extracted row' }, { value: null }]) {
    expect(evaluateAlertRules([rule], { ...analysis, report: { ...analysis.report, confirmedMetrics: { scope1: { ...metric, ...patch } } } })).toEqual([]);
  }
});
it('uses only an explicitly confirmed YoY row, never calculated endpoint growth', () => {
  const yoy = { ...metric, value: 15, unit: '%' };
  expect(evaluateAlertRules([{ ...rule, metric: 'yoy_change_percent', unit: '%' }], { ...analysis, report: { ...analysis.report, confirmedMetrics: { yoyChangePercent: yoy } } })).toHaveLength(1);
});
it('deduplication identity excludes evaluation time and preserves different values and years', () => {
  const event = evaluateAlertRules([rule], analysis)[0];
  expect(alertEventKey(event)).toBe(alertEventKey({ ...event, triggered_at: 'later' }));
  expect(alertEventKey(event)).not.toBe(alertEventKey({ ...event, observed_value: 13 }));
  expect(alertEventKey(event)).not.toBe(alertEventKey({ ...event, reporting_year: 'FY2025-26' }));
});
