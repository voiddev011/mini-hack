function escapeHtml(value) {
  return String(value ?? 'Data unavailable')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sourceMetric(label, metric) {
  if (!Number.isFinite(metric?.value)) return `<li><strong>${escapeHtml(label)}:</strong> Data unavailable</li>`;
  return `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(metric.value)} ${escapeHtml(metric.unit)} — Reported by company · ${escapeHtml(metric.source)}, page ${escapeHtml(metric.page)}, ${escapeHtml(metric.reportingColumn || 'reporting column not confirmed')}.</li>`;
}

export function buildCorporateReportHtml(analysis, { greenScenario, complianceStatus, officialTargetStatus, industry } = {}) {
  const metrics = analysis.currentMetrics || {};
  const metricRows = [
    sourceMetric('Scope 1', metrics.scope1),
    sourceMetric('Scope 2', metrics.scope2),
    sourceMetric('Scope 3', metrics.scope3),
    sourceMetric('Total reported GHG emissions', metrics.reportedTotal),
    sourceMetric('Emissions intensity', metrics.emissionsIntensity),
    sourceMetric('Total energy consumption', metrics.totalEnergy),
    sourceMetric('Renewable energy consumption', metrics.renewableEnergy),
  ].join('');
  const facilities = analysis.facilityMatches.length
    ? analysis.facilityMatches.map((source) => `<li>${escapeHtml(source.name)} — ${escapeHtml(source.emissionsMt?.toFixed(2) ?? 'Data unavailable')} Mt CO₂e, Climate TRACE ${escapeHtml(source.year)}; a named facility estimate, not a company inventory.</li>`).join('')
    : '<li>No matching Climate TRACE facility record in the checked ranked sample.</li>';
  const score = analysis.score === null ? 'Data unavailable'
    : `${analysis.score}/100 · ${analysis.scoreLevel} · TrustCarbon-created score, not an official rating.`;
  const actionRows = analysis.recommendations.map((item) => (
    `<li><strong>${escapeHtml(item.label)}: ${escapeHtml(item.title)}</strong><br>Reason: ${escapeHtml(item.reason)}<br>Current metric: ${escapeHtml(item.currentMetric)}<br>Target/scenario: ${escapeHtml(item.scenario)}<br>Estimated impact: ${escapeHtml(item.estimatedImpact)}</li>`
  )).join('');
  const anomalyRows = analysis.anomalies.length
    ? analysis.anomalies.map((item) => `<li>${escapeHtml(item.year)} · ${escapeHtml(item.changePercent.toFixed(1))}% · ${escapeHtml(item.deviation.toFixed(2))}σ — ${escapeHtml(item.explanation)}</li>`).join('')
    : '<li>No anomaly reported; minimum available history may not be sufficient for statistical screening.</li>';
  const thresholdRows = (analysis.thresholdAlerts || []).map((event) =>
    `<li>${escapeHtml(event.evidence.metric)}: ${escapeHtml(event.observed_value)} ${escapeHtml(event.evidence.unit)}; threshold ${escapeHtml(event.evidence.operator === 'gt' ? '>' : '<')} ${escapeHtml(event.threshold)}. Reporting year: ${escapeHtml(event.reporting_year)}. Source: ${escapeHtml(event.evidence.source)}, page ${escapeHtml(event.evidence.page)}, ${escapeHtml(event.evidence.reporting_column)}.</li>`
  ).join('') || '<li>No configured threshold is met by the available user-confirmed metrics.</li>';
  const generatedAt = new Date().toISOString();

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TrustCarbon Corporate Carbon Report · ${escapeHtml(analysis.company)}</title><style>body{font:15px/1.6 Arial,sans-serif;color:#263b2e;max-width:980px;margin:40px auto;padding:0 24px}h1,h2{color:#254631}h2{margin-top:32px;border-bottom:1px solid #dbe6dc;padding-bottom:7px}li{margin:8px 0}.note{background:#f4f7f3;padding:14px}.source{color:#63786a;font-size:12px}a{color:#2d7247}@page{margin:18mm}@media print{body{max-width:none;margin:0;padding:0;color:#000}h1,h2,a{color:#000}.note{background:none;border:1px solid #aaa}li{break-inside:avoid;page-break-inside:avoid}h2{break-after:avoid}} </style></head><body><header><p>TRUSTCARBON / CORPORATE CARBON INTELLIGENCE</p><h1>${escapeHtml(analysis.company)}</h1><p>Reporting year: ${escapeHtml(analysis.report?.reportingYear || 'Not reported')} · Industry: ${escapeHtml(industry || 'Data unavailable')} · Generated: ${escapeHtml(generatedAt)}</p></header><p class="note"><strong>Data boundary:</strong> This report separates company-reported document values, Climate TRACE facility estimates, TrustCarbon calculations, user-defined benchmarks and scenarios. It does not make a legal compliance determination.</p><h2>Company profile</h2><ul><li>Company: ${escapeHtml(analysis.company)}</li><li>Industry: ${escapeHtml(industry || 'Data unavailable')}</li><li>BRSR source: ${escapeHtml(analysis.report?.sourceUrl || analysis.report?.fileName || 'Not reported')}</li><li>Document data status: ${escapeHtml(analysis.report ? 'User-confirmed PDF extraction candidates; not independently verified' : 'Data unavailable')}</li></ul><h2>Reported emissions and environmental indicators</h2><ul>${metricRows}</ul><h2>Climate TRACE facility information</h2><ul>${facilities}</ul><p class="source">Matched source sample is limited to the 100 highest-ranked returned India records for the selected year. A name match does not establish asset ownership, corporate boundary, or Scope classification. Facility values are not summed into a company inventory.</p><h2>Industry comparison</h2><p>${escapeHtml(analysis.benchmarkComparable ? `TrustCarbon Benchmark comparison: current reported intensity ${analysis.intensityValue} ${analysis.intensityUnit}; benchmark ${analysis.benchmarkValue} ${analysis.intensityUnit}; gap ${analysis.intensityGap}.` : 'No compatible industry benchmark is configured. No peer comparison is claimed.')}</p><h2>Anomalies</h2><ul>${anomalyRows}</ul><h2>Threshold alerts</h2><p>User-configured thresholds, not regulatory limits. Evaluated on the currently loaded user-confirmed report data; no automated monitoring or external alert delivery.</p><ul>${thresholdRows}</ul><h2>Compliance context</h2><p>${escapeHtml(complianceStatus || analysis.complianceStatus)} Official regulatory target: ${escapeHtml(officialTargetStatus || 'No target and company applicability verified.')}</p><h2>Green Credit / restoration scenario</h2><p>${escapeHtml(greenScenario || 'No scenario configured. Green Credits are not treated as carbon credits or offsets.')}</p><h2>TrustCarbon corporate carbon pressure</h2><p>${escapeHtml(score)}</p><ul>${analysis.scoreDimensions.map((dimension) => `<li>${escapeHtml(dimension.label)}: ${escapeHtml(dimension.pressure.toFixed(1))}/100 risk pressure — ${escapeHtml(dimension.evidence)} (weight ${escapeHtml(dimension.weight)}; source: ${escapeHtml(dimension.source)})</li>`).join('')}</ul><p>Score formula: weighted mean of available dimensions only, re-normalized over their weights. Missing reporting is a data-completeness risk, not proof of high emissions. This is not an official government rating.</p><h2>TrustCarbon Action Plan</h2><ol>${actionRows}</ol><footer class="source">TrustCarbon calculations are descriptive and source-bound. Downloaded ${escapeHtml(generatedAt)}.</footer></body></html>`;
}

export function downloadCorporateReport(analysis, context) {
  const html = buildCorporateReportHtml(analysis, context);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${analysis.company.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'company'}-trustcarbon-report.html`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function printCorporateReport(analysis, context) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Allow pop-ups for TrustCarbon to open the printable report.');
  popup.opener = null;
  popup.document.open();
  popup.document.write(buildCorporateReportHtml(analysis, context));
  popup.document.close();
  popup.focus();
  popup.setTimeout(() => popup.print(), 250);
}
