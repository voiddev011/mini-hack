const METRIC_KEYS = { reported_total: 'reportedTotal', scope1: 'scope1', scope2: 'scope2', scope3: 'scope3', emissions_intensity: 'emissionsIntensity', yoy_change_percent: 'yoyChangePercent' };
const companyKey = (value) => value?.trim().toLowerCase().replace(/\s+/g, ' ');

export function alertEventKey(event) {
  return JSON.stringify([event.rule_id, companyKey(event.company), event.reporting_year, event.observed_value]);
}

export function evaluateAlertRules(rules, analysis) {
  // Only confirmed document rows qualify. Derived totals and growth rates are deliberately excluded.
  const metrics = analysis.report?.confirmedMetrics || {};
  return rules.flatMap((rule) => {
    const metric = metrics[METRIC_KEYS[rule.metric]];
    const columnYear = metric?.reportingColumn?.match(/(?:19|20)\d{2}/)?.[0];
    const reportYear = analysis.report?.reportingYear?.match(/(?:19|20)\d{2}/)?.[0];
    if (!rule.enabled || companyKey(rule.company) !== companyKey(analysis.company)
      || !Number.isFinite(rule.threshold) || !['gt', 'lt'].includes(rule.operator)
      || !Number.isFinite(metric?.value) || !metric.source?.trim() || !Number.isInteger(metric.page) || metric.page < 1
      || !metric.confirmation?.startsWith('User-confirmed')
      || !analysis.report?.reportingYear || !metric.reportingColumn?.trim()
      || !columnYear || columnYear !== reportYear || /not stated/i.test(metric.unit || '')
      || !rule.unit || rule.unit !== metric.unit) return [];
    if (!(rule.operator === 'gt' ? metric.value > rule.threshold : metric.value < rule.threshold)) return [];
    return [{
      rule_id: rule.id,
      company: rule.company,
      reporting_year: analysis.report.reportingYear,
      observed_value: metric.value,
      threshold: rule.threshold,
      evidence: { source: metric.source, page: metric.page, reporting_column: metric.reportingColumn, metric: rule.metric, operator: rule.operator, unit: metric.unit },
    }];
  });
}
