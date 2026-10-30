import { useMemo, useState } from "react";
import {
  calculateCarbonPressure,
  calculateConfidence,
  calculateGrowthRate,
  calculateHistoricalAverage,
  calculateRank,
  calculateYearOverYearChange,
  compareWithAverage,
  detectAnomalies,
  detectAcceleration,
  generateInsights,
} from "../analysis/analysisEngine";
import { useDashboardData } from "../hooks/useDashboardData";

export default function AnalysisEnginePanel() {
  const { data, loading, error, selectedYear, setSelectedYear } =
    useDashboardData();
  const [country, setCountry] = useState("India");
  const [metricKey, setMetricKey] = useState("co2Mt");
  const metricLabel =
    metricKey === "co2Mt"
      ? "Annual CO₂ emissions (Mt)"
      : "CO₂ emissions per capita (tonnes/person)";

  const analysis = useMemo(() => {
    if (!data) return null;
    const series = data.rows
      .filter(
        (row) =>
          row.country === country &&
          row.year <= selectedYear &&
          Number.isFinite(row[metricKey]),
      )
      .map((row) => ({ year: row.year, value: row[metricKey] }))
      .sort((first, second) => first.year - second.year);
    const latest = series.at(-1);
    if (!latest) return { series, latest: null };
    const peerRows = data.rows.filter(
      (row) =>
        row.year === latest.year &&
        row.country !== country &&
        row.code &&
        /^[A-Z]{3}$/.test(row.code) &&
        Number.isFinite(row[metricKey]),
    );
    const rank = calculateRank(
      peerRows.concat([{ id: country, value: latest.value }]),
      country,
    );
    const comparison = compareWithAverage(latest.value, peerRows, {
      valueKey: metricKey,
    });
    const referencePerCapita = data.rows
      .filter(
        (row) =>
          row.year === latest.year &&
          row.code &&
          /^[A-Z]{3}$/.test(row.code) &&
          Number.isFinite(row.perCapitaTonnes),
      )
      .map((row) => row.perCapitaTonnes)
      .reduce(
        (total, value, index, values) => total + value / values.length,
        0,
      );
    const pressure =
      metricKey === "perCapitaTonnes"
        ? calculateCarbonPressure(latest.value, referencePerCapita)
        : null;
    const anomalies = detectAnomalies(series, {
      entity: country,
      metric: metricLabel,
    });
    const insights = generateInsights({
      entity: country,
      observations: series,
      peerEntities: peerRows.map((row) => ({
        id: row.country,
        value: row[metricKey],
      })),
      metricLabel,
    });
    const latestChange = calculateYearOverYearChange(series).at(-1);
    const acceleration = detectAcceleration(series);
    return {
      series,
      latest,
      rank,
      comparison,
      pressure,
      anomalies,
      insights,
      growth: calculateGrowthRate(series),
      historicalAverage: calculateHistoricalAverage(series, {
        beforeYear: latest.year,
        window: 10,
      }),
      latestChange,
      acceleration,
      confidence: calculateConfidence({
        observationCount: series.length,
        completeness: series.length ? 1 : 0,
        validationRate: series.length ? 1 : 0,
      }),
    };
  }, [country, data, metricKey, metricLabel, selectedYear]);

  const countries = useMemo(
    () =>
      data
        ? [
            ...new Set(
              data.rows
                .filter((row) => row.code && /^[A-Z]{3}$/.test(row.code))
                .map((row) => row.country),
            ),
          ].sort((first, second) => first.localeCompare(second))
        : [],
    [data],
  );

  return (
    <div className="tc-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">
            INTELLIGENCE / TRANSPARENT CALCULATIONS
          </span>
          <h1>Analysis Engine</h1>
          <p>
            Descriptive time-series calculations and cross-entity comparisons
            over normalized historical observations.
          </p>
        </div>
      </header>
      <section className="tc-panel tc-scenario-inputs">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">ANALYSIS SCOPE</span>
            <h2>Entity, metric and year</h2>
          </div>
        </div>
        <div className="tc-scenario-selects">
          <label>
            COUNTRY
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              {countries.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            METRIC
            <select
              value={metricKey}
              onChange={(event) => setMetricKey(event.target.value)}
            >
              <option value="co2Mt">Annual CO₂ emissions</option>
              <option value="perCapitaTonnes">CO₂ per capita</option>
            </select>
          </label>
          <div className="tc-analysis-year">
            <span>Selected year</span>
            <strong>{selectedYear}</strong>
          </div>
        </div>
      </section>
      {loading && (
        <div className="tc-state-card" role="status">
          Loading historical observations…
        </div>
      )}
      {error && (
        <div className="tc-state-card tc-error" role="alert">
          {error}
        </div>
      )}
      {analysis?.latest && (
        <>
          <section className="tc-kpi-grid">
            <article className="tc-kpi-card tc-kpi-primary">
              <span>VALUE / {analysis.latest.year}</span>
              <strong>{analysis.latest.value.toFixed(2)}</strong>
              <small>{metricLabel}</small>
            </article>
            <article className="tc-kpi-card">
              <span>PERIOD GROWTH</span>
              <strong>
                {analysis.growth === null
                  ? "n/a"
                  : `${analysis.growth.toFixed(1)}%`}
              </strong>
              <small>
                {analysis.series[0]?.year}–{analysis.latest.year}
              </small>
            </article>
            <article className="tc-kpi-card">
              <span>YEAR-ON-YEAR CHANGE</span>
              <strong>
                {analysis.latestChange?.changePercent === null ||
                !analysis.latestChange
                  ? "n/a"
                  : `${analysis.latestChange.changePercent.toFixed(1)}%`}
              </strong>
              <small>
                {analysis.latestChange
                  ? `${analysis.latestChange.previousYear} → ${analysis.latestChange.year}`
                  : "No prior observation"}
              </small>
            </article>
            <article className="tc-kpi-card">
              <span>RANK / {analysis.latest.year}</span>
              <strong>
                {analysis.rank
                  ? `${analysis.rank.rank} / ${analysis.rank.total}`
                  : "n/a"}
              </strong>
              <small>Against available reporting countries</small>
            </article>
          </section>
          <section className="tc-panel">
            <div className="tc-panel-heading">
              <div>
                <span className="tc-eyebrow">CALCULATION OUTPUT</span>
                <h2>{country}</h2>
              </div>
              <span className="tc-unit-tag">
                Confidence {Math.round(analysis.confidence * 100)}% · data
                sufficiency score
              </span>
            </div>
            <div className="tc-engine-results">
              <div>
                <span>10-observation historical average</span>
                <strong>
                  {analysis.historicalAverage === null
                    ? "n/a"
                    : analysis.historicalAverage.toFixed(2)}
                </strong>
              </div>
              <div>
                <span>Comparison to available peer average</span>
                <strong>
                  {analysis.comparison
                    ? `${analysis.comparison.relation} by ${Math.abs(analysis.comparison.differencePercent ?? 0).toFixed(1)}%`
                    : "n/a"}
                </strong>
              </div>
              <div>
                <span>Per-capita pressure index</span>
                <strong>
                  {analysis.pressure === null
                    ? "Select per-capita metric"
                    : `${analysis.pressure.toFixed(1)} / 100`}
                </strong>
              </div>
              <div>
                <span>Recent growth acceleration</span>
                <strong>
                  {analysis.acceleration?.ratio === null ||
                  !analysis.acceleration
                    ? "Not established"
                    : `${analysis.acceleration.ratio.toFixed(2)}× historical rate`}
                </strong>
              </div>
            </div>
          </section>
          <div className="tc-country-signals">
            <section className="tc-panel">
              <div className="tc-panel-heading">
                <div>
                  <span className="tc-eyebrow">RULE-BASED</span>
                  <h2>Insights</h2>
                </div>
              </div>
              {analysis.insights.length ? (
                analysis.insights.map((item, index) => (
                  <article
                    className="tc-compact-insight"
                    key={`${item.type}-${item.title}-${item.metric?.year ?? index}`}
                  >
                    <span
                      className={`tc-severity tc-severity-${item.severity}`}
                    >
                      {item.severity}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.explanation}</p>
                      <small>
                        Confidence {Math.round(item.confidence * 100)}%
                      </small>
                    </div>
                  </article>
                ))
              ) : (
                <p className="tc-empty-note">No insight thresholds were met.</p>
              )}
            </section>
            <section className="tc-panel">
              <div className="tc-panel-heading">
                <div>
                  <span className="tc-eyebrow">ROLLING STANDARD DEVIATION</span>
                  <h2>Anomalies</h2>
                </div>
                <span className="tc-unit-tag">{analysis.anomalies.length}</span>
              </div>
              {analysis.anomalies.length ? (
                analysis.anomalies.map((item) => (
                  <button
                    className="tc-anomaly-jump"
                    type="button"
                    key={item.year}
                    onClick={() => setSelectedYear(item.year)}
                  >
                    <strong>{item.year}</strong>
                    <span>
                      {item.changePercent.toFixed(1)}% ·{" "}
                      {item.deviation.toFixed(2)}σ
                    </span>
                    <small>{item.explanation}</small>
                  </button>
                ))
              ) : (
                <p className="tc-empty-note">
                  No anomaly exceeded the configured threshold.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
