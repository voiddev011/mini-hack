import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import IndustryOverview from "../components/IndustryOverview";
import {
  calculateRank,
  detectAnomalies,
  generateInsights,
  generateSectorConcentrationInsight,
} from "../analysis/analysisEngine";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  getCountrySectorEmissions,
  getRankedEmissionSources,
} from "../services/climateTraceService";

export default function IndustryPanel() {
  const { selectedYear, setSelectedYear } = useDashboardData();
  const year = selectedYear;
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedSector, setSelectedSector] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (year < 2021) {
      setData(null);
      setHistory([]);
      setLoading(false);
      setError("");
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError("");
    Promise.all([
      getCountrySectorEmissions({ countryCode: "IND", year }),
      getRankedEmissionSources({ countryCode: "IND", year, limit: 10 }),
      ...Array.from({ length: year - 2021 }, (_, index) =>
        getCountrySectorEmissions({ countryCode: "IND", year: 2021 + index }),
      ),
    ])
      .then(([sectors, sources, ...pastYears]) => {
        if (active) {
          setData({ sectors, sources });
          setHistory([
            ...pastYears.map((rows, index) => ({
              year: 2021 + index,
              sectors: rows,
            })),
            { year, sectors },
          ]);
          setSelectedSector((current) =>
            sectors.some((sector) => sector.sector === current)
              ? current
              : sectors[0]?.sector || "",
          );
        }
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError.message || "Climate TRACE detail could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [year]);

  const totalMt = useMemo(
    () =>
      data?.sectors.reduce((total, sector) => total + sector.emissionsMt, 0) ??
      0,
    [data],
  );
  const selectedSectorHistory = useMemo(
    () =>
      history.flatMap((row) => {
        const sector = row.sectors.find(
          (item) => item.sector === selectedSector,
        );
        return sector ? [{ year: row.year, value: sector.emissionsMt }] : [];
      }),
    [history, selectedSector],
  );
  const selectedSectorRecord = data?.sectors.find(
    (sector) => sector.sector === selectedSector,
  );
  const sectorRank =
    data && selectedSectorRecord
      ? calculateRank(
          data.sectors.map((sector) => ({
            id: sector.sector,
            value: sector.emissionsTonnes,
          })),
          selectedSector,
        )
      : null;
  const sectorAnomalies = detectAnomalies(selectedSectorHistory, {
    entity: selectedSector,
    metric: "CO₂e emissions (Mt)",
  });
  const sectorInsights = generateInsights({
    entity: selectedSector,
    observations: selectedSectorHistory,
    peerEntities: (data?.sectors || [])
      .filter((sector) => sector.sector !== selectedSector)
      .map((sector) => ({ id: sector.sector, value: sector.emissionsMt })),
    metricLabel: "CO₂e emissions (Mt)",
  });
  const concentrationInsight = generateSectorConcentrationInsight(
    (data?.sectors || []).map((sector) => ({
      entity: sector.sector,
      value: sector.emissionsMt,
    })),
  );

  return (
    <div className="tc-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">EXPLORE / SECTOR INTELLIGENCE</span>
          <h1>Emissions by source.</h1>
          <p>
            Investigate India’s reported sector emissions and source-level
            estimates from Climate TRACE.
          </p>
        </div>
        <span className="tc-history-indicator">
          <i /> HISTORICAL / {year}
        </span>
      </header>

      <div className="tc-data-banner tc-climatetrace-banner">
        <span>
          <i /> DETAILED SOURCE LAYER
        </span>
        <strong>Climate TRACE</strong>
        <small>API v7 · India · CO₂-equivalent, 100-year GWP · {year}</small>
        <a
          href="https://api.climatetrace.org/v7/docs/index.html"
          target="_blank"
          rel="noreferrer"
        >
          API documentation ↗
        </a>
      </div>

      {year < 2021 && (
        <div className="tc-state-card">
          Climate TRACE administrative-area and sector estimates begin in 2021.
          Use the shared historical year slider to select 2021 or later.
          Historical global context remains available for earlier years.
        </div>
      )}
      {loading && (
        <div className="tc-state-card" role="status">
          Loading Climate TRACE sector and source records…
        </div>
      )}
      {error && (
        <div className="tc-state-card tc-error" role="alert">
          <strong>Climate TRACE data could not be loaded.</strong> {error}
          <p>
            Verified source records are not replaced with demo values. The
            illustrative CSV remains available below and is labelled as demo
            data.
          </p>
        </div>
      )}

      {data && (
        <>
          <section
            className="tc-kpi-grid tc-industry-kpis"
            aria-label="Climate TRACE emissions summary"
          >
            <article className="tc-kpi-card tc-kpi-primary">
              <span>REPORTED SECTOR TOTAL</span>
              <strong>{totalMt.toFixed(1)} Mt</strong>
              <small>Sum of returned non-forest sector estimates</small>
            </article>
            <article className="tc-kpi-card">
              <span>SECTORS REPORTED</span>
              <strong>{data.sectors.length}</strong>
              <small>Grouped emissions categories</small>
            </article>
            <article className="tc-kpi-card">
              <span>SOURCE RECORDS</span>
              <strong>{data.sources.length}</strong>
              <small>Highest-ranked available sources</small>
            </article>
            <article className="tc-kpi-card">
              <span>DETAIL LEVEL</span>
              <strong>Source</strong>
              <small>Facility or aggregated source where reported</small>
            </article>
          </section>

          <div className="tc-industry-layout">
            <section className="tc-panel">
              <div className="tc-panel-heading">
                <div>
                  <span className="tc-eyebrow">SECTOR BREAKDOWN / {year}</span>
                  <h2>Where emissions are reported</h2>
                </div>
                <span className="tc-unit-tag">Mt CO₂e</span>
              </div>
              {data.sectors.length ? (
                <div className="tc-sector-list">
                  {data.sectors.map((sector) => (
                    <button
                      type="button"
                      className={`tc-sector-row${selectedSector === sector.sector ? " active" : ""}`}
                      key={sector.sector}
                      onClick={() => setSelectedSector(sector.sector)}
                    >
                      <div>
                        <strong>{sector.sector}</strong>
                        <small>
                          {sector.share === null
                            ? "Share not supplied"
                            : `${sector.share.toFixed(1)}% of reported total`}
                        </small>
                      </div>
                      <span className="tc-ranking-bar">
                        <i
                          style={{
                            width: `${Math.max(2, sector.share || (sector.emissionsMt / totalMt) * 100)}%`,
                          }}
                        />
                      </span>
                      <b>{sector.emissionsMt.toFixed(2)} Mt</b>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="tc-empty-note">
                  No sector records were returned for this year.
                </p>
              )}
            </section>

            <section className="tc-panel">
              <div className="tc-panel-heading">
                <div>
                  <span className="tc-eyebrow">
                    SOURCE INVESTIGATION / {year}
                  </span>
                  <h2>Highest reported sources</h2>
                </div>
                <span className="tc-unit-tag">Top {data.sources.length}</span>
              </div>
              {data.sources.length ? (
                <div className="tc-source-list">
                  {data.sources.map((source, index) => (
                    <article className="tc-facility-row" key={source.id}>
                      <span className="tc-ranking-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <strong>{source.name}</strong>
                        <small>
                          {[source.sector, source.subsector, source.assetType]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </div>
                      <b>
                        {source.emissionsMt === null
                          ? "n/a"
                          : `${source.emissionsMt.toFixed(2)} Mt`}
                      </b>
                      <small className="tc-facility-location">
                        {source.latitude !== null && source.longitude !== null
                          ? `${source.latitude.toFixed(2)}, ${source.longitude.toFixed(2)}`
                          : "Location not reported"}
                      </small>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="tc-empty-note">
                  No source records were returned for this year.
                </p>
              )}
            </section>
          </div>
          <div className="tc-industry-analysis-grid">
            <section className="tc-panel">
              <div className="tc-panel-heading">
                <div>
                  <span className="tc-eyebrow">
                    ANALYSIS ENGINE / {selectedSector}
                  </span>
                  <h2>Sector trend and rank</h2>
                </div>
                <span className="tc-unit-tag">
                  {sectorRank
                    ? `Rank ${sectorRank.rank} of ${sectorRank.total}`
                    : "Rank n/a"}
                </span>
              </div>
              {selectedSectorHistory.length ? (
                <>
                  <div className="tc-sector-history">
                    {selectedSectorHistory.map((item) => (
                      <div key={item.year}>
                        <span>{item.year}</span>
                        <span className="tc-ranking-bar">
                          <i
                            style={{
                              width: `${Math.max(2, (item.value / Math.max(...selectedSectorHistory.map((point) => point.value))) * 100)}%`,
                            }}
                          />
                        </span>
                        <b>{item.value.toFixed(2)} Mt</b>
                      </div>
                    ))}
                  </div>
                  {sectorInsights.map((item, index) => (
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
                  ))}
                  {sectorAnomalies.map((item) => (
                    <button
                      className="tc-anomaly-jump"
                      type="button"
                      key={item.year}
                      onClick={() => setSelectedYear(item.year)}
                    >
                      <strong>{item.year} anomaly</strong>
                      <span>
                        {item.changePercent.toFixed(1)}% ·{" "}
                        {item.deviation.toFixed(2)}σ
                      </span>
                      <small>{item.explanation}</small>
                    </button>
                  ))}
                </>
              ) : (
                <p className="tc-empty-note">
                  No year-over-year sector history is available for this sector
                  yet.
                </p>
              )}
              {concentrationInsight && (
                <div className="tc-insight-callout">
                  <span className="tc-eyebrow">SECTOR MIX</span>
                  <p>{concentrationInsight.explanation}</p>
                </div>
              )}
              {selectedSectorRecord && (
                <Link
                  className="tc-panel-link"
                  to={`/intelligence/simulator?type=sector&sector=${encodeURIComponent(selectedSector)}`}
                >
                  Simulate sector reductions <span>→</span>
                </Link>
              )}
            </section>
            <section className="tc-panel">
              <div className="tc-panel-heading">
                <div>
                  <span className="tc-eyebrow">SCENARIO SHORTCUT</span>
                  <h2>Test a reduction assumption</h2>
                </div>
              </div>
              <p className="tc-scenario-copy">
                Apply user-selected reductions to the available Climate TRACE
                sector baseline for this reporting year. The scenario is
                arithmetic, not a forecast.
              </p>
              <Link
                className="tc-outline-action"
                to={`/intelligence/simulator?type=sector&sector=${encodeURIComponent(selectedSector)}`}
              >
                Open TrustCarbon Scenario <span>→</span>
              </Link>
            </section>
          </div>
          <p className="tc-page-footnote">
            Climate TRACE estimates are detailed source-layer data, not
            real-time observations. Sector totals and source estimates may not
            reconcile exactly because of data coverage and aggregation.
          </p>
        </>
      )}

      {error && (
        <section className="tc-demo-fallback">
          <div>
            <span className="tc-eyebrow">ILLUSTRATIVE ONLY / FALLBACK</span>
            <p>
              The legacy industry explorer is available as illustrative data and
              is not presented as verified emissions.
            </p>
          </div>
          <IndustryOverview />
        </section>
      )}
    </div>
  );
}
