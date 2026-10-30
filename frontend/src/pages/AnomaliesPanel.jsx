import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { detectAnomalies } from '../analysis/analysisEngine';
import { useDashboardData } from '../hooks/useDashboardData';

function buildCountryAnomalies(rows, selectedYear) {
  const countries = new Map();
  rows.forEach((row) => {
    if (!row.code || !/^[A-Z]{3}$/.test(row.code)) return;
    const series = countries.get(row.country) || [];
    series.push({ year: row.year, value: row.co2Mt });
    countries.set(row.country, series);
  });
  return [...countries.entries()].flatMap(([entity, observations]) => (
    detectAnomalies(observations.filter((row) => row.year <= selectedYear), {
      window: 10,
      threshold: 2,
      minimumBaseline: 5,
      entity,
      metric: 'Annual CO₂ emissions',
    })
  )).sort((first, second) => second.year - first.year
    || Math.abs(second.deviation) - Math.abs(first.deviation));
}

export default function AnomaliesPanel() {
  const { data, loading, error, selectedYear, setSelectedYear } = useDashboardData();
  const navigate = useNavigate();
  const anomalies = useMemo(
    () => data ? buildCountryAnomalies(data.rows, selectedYear) : [],
    [data, selectedYear],
  );

  return (
    <div className="tc-page">
      <header className="tc-page-heading">
        <div><span className="tc-eyebrow">INTELLIGENCE / STATISTICAL SCREENING</span><h1>Anomalies</h1><p>Unusual annual changes flagged with a rolling z-score against each entity’s prior annual growth record.</p></div>
        <span className="tc-history-indicator"><i /> THROUGH {selectedYear}</span>
      </header>
      <section className="tc-panel tc-method-note">
        <strong>Detection method</strong>
        <span>For each country, compare year-over-year percentage change with up to the preceding 10 available annual changes. A minimum of 5 baseline changes is required. Flag when |z| ≥ 2; severity is descriptive (2.0 low, 2.5 medium, 3.0 high). This is statistical screening, not machine learning or evidence of an error.</span>
      </section>
      {loading && <div className="tc-state-card" role="status">Loading normalized country observations…</div>}
      {error && <div className="tc-state-card tc-error" role="alert">{error}</div>}
      {data && (
        <section className="tc-panel">
          <div className="tc-panel-heading"><div><span className="tc-eyebrow">COUNTRY HISTORY / {selectedYear}</span><h2>{anomalies.length} anomalies detected</h2></div><span className="tc-unit-tag">Annual CO₂ · {data.source}</span></div>
          {anomalies.length ? (
            <div className="tc-anomaly-table-wrap">
              <table className="tc-anomaly-table">
                <thead><tr><th>ENTITY</th><th>YEAR</th><th>METRIC</th><th>CHANGE</th><th>DEVIATION</th><th>SEVERITY</th><th>EXPLANATION</th></tr></thead>
                <tbody>
                  {anomalies.slice(0, 150).map((anomaly) => (
                    <tr key={`${anomaly.entity}-${anomaly.year}`}>
                      <td><button type="button" className="tc-table-jump" onClick={() => navigate(`/explore/global?country=${encodeURIComponent(anomaly.entity)}&year=${anomaly.year}`)}>{anomaly.entity}</button></td>
                      <td><button type="button" className="tc-table-jump" onClick={() => setSelectedYear(anomaly.year)}>{anomaly.year}</button></td>
                      <td>{anomaly.metric}</td>
                      <td>{anomaly.changePercent.toFixed(1)}%</td>
                      <td>{anomaly.deviation.toFixed(2)}σ</td>
                      <td><span className={`tc-severity tc-severity-${anomaly.severity}`}>{anomaly.severity}</span></td>
                      <td>{anomaly.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {anomalies.length > 150 && <p className="tc-table-note">Showing the 150 most recent anomalies of {anomalies.length} detected records.</p>}
            </div>
          ) : <p className="tc-empty-note">No country observations met the minimum baseline and z-score threshold through {selectedYear}.</p>}
        </section>
      )}
    </div>
  );
}
