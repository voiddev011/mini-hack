import { useMemo } from 'react';
import { generateInsights } from '../analysis/analysisEngine';
import { useDashboardData } from '../hooks/useDashboardData';

function buildInsights(rows, year) {
  const entities = new Map();
  rows.forEach((row) => {
    if (!row.code || !/^[A-Z]{3}$/.test(row.code) || row.year > year) return;
    const observations = entities.get(row.country) || [];
    observations.push({ year: row.year, value: row.co2Mt });
    entities.set(row.country, observations);
  });
  return [...entities.entries()].flatMap(([entity, observations]) => {
    const latestYear = observations.at(-1)?.year;
    const yearPeers = rows.filter((row) => row.year === latestYear
      && row.country !== entity && row.code && /^[A-Z]{3}$/.test(row.code));
    const previousYearPeers = rows.filter((row) => row.year === latestYear - 1
      && row.country !== entity && row.code && /^[A-Z]{3}$/.test(row.code));
    return generateInsights({
      entity,
      observations,
      peerEntities: yearPeers.map((row) => ({ id: row.country, value: row.co2Mt })),
      previousPeerEntities: previousYearPeers.map((row) => ({ id: row.country, value: row.co2Mt })),
      metricLabel: 'Annual CO₂ emissions',
    }).map((item) => ({ ...item, entity }));
  })
    .sort((first, second) => severityOrder(second.severity) - severityOrder(first.severity));
}

function severityOrder(severity) {
  return ({ high: 3, medium: 2, low: 1 })[severity] || 0;
}

export default function InsightsPanel() {
  const { data, loading, error, selectedYear } = useDashboardData();
  const insights = useMemo(() => data ? buildInsights(data.rows, selectedYear) : [], [data, selectedYear]);

  return (
    <div className="tc-page">
      <header className="tc-page-heading">
        <div><span className="tc-eyebrow">INTELLIGENCE / CALCULATED OBSERVATIONS</span><h1>Carbon Insights</h1><p>Rule-based observations generated from country histories and peer comparisons. No AI or forecast claims.</p></div>
        <span className="tc-history-indicator"><i /> THROUGH {selectedYear}</span>
      </header>
      <section className="tc-panel tc-method-note"><strong>Transparent thresholds</strong><span>Growth ≥10% or decline ≤−5% over the available span; significant year-on-year change ≥10%; acceleration ≥1.5× the prior mean growth (minimum 4 changes); below-historical-average signal at 10% below the preceding 10 observations; peer comparison uses available country observations for the selected year. Confidence reflects observation coverage, completeness and validation—not predictive certainty.</span></section>
      {loading && <div className="tc-state-card" role="status">Calculating insights…</div>}
      {error && <div className="tc-state-card tc-error" role="alert">{error}</div>}
      {data && (insights.length ? (
        <section className="tc-insight-grid tc-insight-cards">
          {insights.slice(0, 120).map((item, index) => (
            <article className="tc-panel" key={`${item.entity}-${item.type}-${index}`}>
              <div className="tc-insight-card-top"><span className={`tc-severity tc-severity-${item.severity}`}>{item.severity}</span><span className="tc-insight-type">{item.type.replaceAll('_', ' ')}</span></div>
              <span className="tc-eyebrow">{item.entity}</span>
              <h2>{item.title}</h2>
              <p>{item.explanation}</p>
              <footer><span>{item.metric.name}: {Number.isFinite(item.metric.value) ? `${item.metric.value.toFixed(1)}${item.metric.unit || ''}` : 'n/a'}</span><span>Confidence {Math.round(item.confidence * 100)}%</span></footer>
            </article>
          ))}
        </section>
      ) : <div className="tc-state-card">No configured insight thresholds were met by the available observations through {selectedYear}.</div>)}
    </div>
  );
}
