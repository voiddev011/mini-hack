import { useEffect, useMemo, useState } from 'react';
import { calculateTrustScore } from '../analysis/trustScore';
import { useDashboardData } from '../hooks/useDashboardData';
import { getCountrySectorEmissions } from '../services/climateTraceService';

const ASSESSED_YEAR = new Date().getUTCFullYear();

function getDatasetScore(data) {
  const countryRows = data.rows.filter((row) => row.code && /^[A-Z]{3}$/.test(row.code));
  const entities = new Set(countryRows.map((row) => row.country));
  const latestYear = Math.max(...data.years);
  const eligibleRows = countryRows.filter((row) => row.year === latestYear);
  return calculateTrustScore({
    source: data.source,
    sourceCredibility: data.source === 'Our World in Data' ? 95 : 55,
    entityCount: entities.size,
    observations: eligibleRows.map((row) => ({
      entity: row.country,
      year: row.year,
      value: row.co2Tonnes,
      perCapita: row.perCapitaTonnes,
    })),
    requiredFields: ['entity', 'year', 'value'],
    latestYear,
    assessedYear: ASSESSED_YEAR,
    validationRate: countryRows.length ? 100 : 0,
  });
}

function getClimateTraceScore(sectors, assessedYear) {
  return calculateTrustScore({
    source: 'Climate TRACE',
    sourceCredibility: 92,
    entityCount: 1,
    expectedEntityCount: 195,
    observations: sectors.map((sector) => ({
      entity: sector.sector,
      year: sector.year,
      value: sector.emissionsTonnes,
      gas: sector.gas,
    })),
    requiredFields: ['entity', 'year', 'value', 'gas'],
    latestYear: sectors[0]?.year,
    assessedYear,
    validationRate: sectors.length ? 100 : 0,
  });
}

function ScoreCard({ score }) {
  return (
    <article className="tc-panel tc-score-card">
      <div className="tc-panel-heading">
        <div><span className="tc-eyebrow">TRUSTCARBON SOURCE ASSESSMENT</span><h2>{score.source}</h2></div>
        <span className="tc-score-number">{score.score}<small>/100</small></span>
      </div>
      <div className="tc-score-grade">{score.grade} · assessed {ASSESSED_YEAR} · {score.entityCount.toLocaleString()} entities</div>
      <p className="tc-data-boundary-note">Source credibility is an assigned TrustCarbon rubric input, not computed from the data. Assigned value: {score.criteria.sourceCredibility}/100. Latest reporting year: {score.latestYear ?? 'Data unavailable'}.</p>
      <div className="tc-score-criteria">
        {Object.entries(score.criteria).map(([key, value]) => (
          <div className="tc-score-criterion" key={key}>
            <span>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</span>
            <span className="tc-ranking-bar"><i style={{ width: `${value}%` }} /></span>
            <b>{Math.round(value)}</b>
          </div>
        ))}
      </div>
      <p className="tc-score-confidence">Observation confidence: {Math.round(score.confidence * 100)}% · reflects count, completeness, and validation.</p>
    </article>
  );
}

export default function TrustScoresPanel() {
  const { data, loading, error } = useDashboardData();
  const [climateTrace, setClimateTrace] = useState({ rows: [], loading: true, error: '' });
  useEffect(() => {
    let active = true;
    getCountrySectorEmissions({ countryCode: 'IND', year: 2024 })
      .then((rows) => {
        if (active) setClimateTrace({ rows, loading: false, error: '' });
      })
      .catch((loadError) => {
        if (active) setClimateTrace({ rows: [], loading: false, error: loadError.message || 'Climate TRACE assessment sample unavailable.' });
      });
    return () => { active = false; };
  }, []);
  const scores = useMemo(() => data
    ? [getDatasetScore(data), ...(climateTrace.rows.length ? [getClimateTraceScore(climateTrace.rows, ASSESSED_YEAR)] : [])]
    : [], [data, climateTrace.rows]);

  return (
    <div className="tc-page">
      <header className="tc-page-heading"><div><span className="tc-eyebrow">DATA / TRUSTCARBON METHODOLOGY</span><h1>Trust Scores</h1><p>TrustCarbon-created source assessments. These are not official scores issued by OWID, Climate TRACE, or the data provider.</p></div></header>
      <section className="tc-panel tc-method-note"><strong>Scoring methodology · 0–100</strong><span>Weighted rubric: source credibility 25% (TrustCarbon’s documented-provider assessment), observed coverage 20% (unique entities ÷ reference set of 195, capped at 100%), required-field completeness 20%, freshness 15% (−15 points per year from the latest reporting year), and validation 20% (share of observations passing normalized-data validation). Coverage reference and provider credibility inputs are explicit TrustCarbon rubric choices. Corporate submissions are not scored or included.</span></section>
      {loading && <div className="tc-state-card" role="status">Preparing source assessments…</div>}
      {error && <div className="tc-state-card tc-error" role="alert">{error}</div>}
      {data && <div className="tc-score-grid">{scores.map((score) => <ScoreCard score={score} key={score.source} />)}</div>}
      {climateTrace.loading && <div className="tc-state-card" role="status">Assessing Climate TRACE India sector sample…</div>}
      {climateTrace.error && <div className="tc-state-card tc-error" role="alert">Climate TRACE score unavailable: {climateTrace.error}</div>}
      <section className="tc-panel tc-score-future"><span className="tc-eyebrow">FUTURE SOURCE TYPE</span><h2>Corporate datasets</h2><p>No corporate datasets are currently published in the public data layer. Private submissions and pending reviews are excluded from these scores.</p></section>
    </div>
  );
}
