import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { INDIA_STATE_DATA } from "../data/realData";
import { INDIA_ADMIN1_REGIONS } from "../data/indiaAdmin1Regions";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  getCountrySectorEmissions,
  getIndiaStateEmission,
} from "../services/climateTraceService";

function latestAtYear(rows, country, year) {
  return rows
    .filter((row) => row.country === country && row.year <= year)
    .sort((first, second) => second.year - first.year)[0];
}

export default function SimulatorPanel() {
  const { data, loading, error, selectedYear } = useDashboardData();
  const [searchParams] = useSearchParams();
  const [entityType, setEntityType] = useState(
    searchParams.get("type") || "country",
  );
  const [country, setCountry] = useState(
    searchParams.get("country") || "India",
  );
  const [state, setState] = useState("IN-MH");
  const [stateEmission, setStateEmission] = useState(null);
  const [loadingState, setLoadingState] = useState(false);
  const [stateError, setStateError] = useState("");
  const [sectorData, setSectorData] = useState([]);
  const [sectorError, setSectorError] = useState("");
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [reduction, setReduction] = useState(10);
  const [sectorReductions, setSectorReductions] = useState({});

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
  const countryRecord = data
    ? latestAtYear(data.rows, country, selectedYear)
    : null;
  const stateRegion = INDIA_ADMIN1_REGIONS.find((row) => row.id === state);
  const stateSnapshot = INDIA_STATE_DATA.find(
    (row) => row.state === stateRegion?.name,
  );

  useEffect(() => {
    if (entityType !== "state" || selectedYear < 2021) {
      setStateEmission(null);
      setStateError("");
      setLoadingState(false);
      return undefined;
    }
    let active = true;
    setLoadingState(true);
    setStateError("");
    getIndiaStateEmission({ stateId: state, year: selectedYear })
      .then((record) => {
        if (active) setStateEmission(record);
      })
      .catch((loadError) => {
        if (active)
          setStateError(
            loadError.message ||
              "Climate TRACE state emissions could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoadingState(false);
      });
    return () => {
      active = false;
    };
  }, [entityType, selectedYear, state]);

  useEffect(() => {
    if (entityType !== "sector" || selectedYear < 2021) {
      setSectorData([]);
      setSectorError("");
      return undefined;
    }
    let active = true;
    setLoadingSectors(true);
    setSectorError("");
    getCountrySectorEmissions({ countryCode: "IND", year: selectedYear })
      .then((records) => {
        if (active) setSectorData(records);
      })
      .catch((loadError) => {
        if (active)
          setSectorError(
            loadError.message ||
              "Climate TRACE sector data could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoadingSectors(false);
      });
    return () => {
      active = false;
    };
  }, [entityType, selectedYear]);

  const simulated = useMemo(() => {
    if (entityType === "state") {
      if (!stateRegion || !Number.isFinite(stateEmission?.emissionsMt))
        return null;
      const current = stateEmission.emissionsMt;
      const reductionMt = (current * reduction) / 100;
      return {
        current,
        reduction: reductionMt,
        simulated: current - reductionMt,
        percent: reduction,
        unit: "Mt CO₂e",
        coverage: `${stateRegion.name} · ${selectedYear} · Climate TRACE`,
      };
    }
    if (entityType === "sector") {
      if (!sectorData.length) return null;
      const current = sectorData.reduce(
        (sum, sector) => sum + sector.emissionsMt,
        0,
      );
      const reductionMt = sectorData.reduce(
        (sum, sector) =>
          sum +
          sector.emissionsMt * ((sectorReductions[sector.sector] || 0) / 100),
        0,
      );
      return {
        current,
        reduction: reductionMt,
        simulated: current - reductionMt,
        percent: current ? (reductionMt / current) * 100 : 0,
        unit: "Mt CO₂e",
        coverage: "India · Climate TRACE sector aggregates",
      };
    }
    if (!countryRecord) return null;
    const current = countryRecord.co2Mt;
    const reductionMt = (current * reduction) / 100;
    return {
      current,
      reduction: reductionMt,
      simulated: current - reductionMt,
      percent: reduction,
      unit: "Mt CO₂",
      coverage: `${countryRecord.country} · ${countryRecord.year} · Our World in Data`,
    };
  }, [
    countryRecord,
    entityType,
    reduction,
    sectorData,
    sectorReductions,
    selectedYear,
    stateEmission,
    stateRegion,
  ]);

  const setSectorReduction = (sector, value) => {
    setSectorReductions((current) => ({ ...current, [sector]: Number(value) }));
  };

  return (
    <div className="tc-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">
            INTELLIGENCE / USER-DEFINED SCENARIO
          </span>
          <h1>TrustCarbon Scenario</h1>
          <p>
            Explore a transparent, static emissions reduction scenario using
            observed historical values. This is not an official forecast.
          </p>
        </div>
        <span className="tc-stage-tag">NOT A FORECAST</span>
      </header>
      {loading && (
        <div className="tc-state-card" role="status">
          Loading country records…
        </div>
      )}
      {error && (
        <div className="tc-state-card tc-error" role="alert">
          {error}
        </div>
      )}
      <section className="tc-panel tc-scenario-inputs">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">SCENARIO INPUTS</span>
            <h2>Choose the entity and reduction assumption</h2>
          </div>
        </div>
        <div className="tc-scenario-selects">
          <label>
            ENTITY TYPE
            <select
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
            >
              <option value="country">Country</option>
              <option value="state">Indian state</option>
              <option value="sector">India sector</option>
            </select>
          </label>
          {entityType === "country" && (
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
          )}
          {entityType === "state" && (
            <label>
              INDIAN STATE / UNION TERRITORY
              <select
                value={state}
                onChange={(event) => setState(event.target.value)}
              >
                {INDIA_ADMIN1_REGIONS.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {entityType === "country" && countryRecord && (
          <label className="tc-reduction-control">
            <span>
              <strong>TOTAL EMISSIONS REDUCTION</strong>
              <b>−{reduction}%</b>
            </span>
            <input
              type="range"
              min="0"
              max="50"
              value={reduction}
              onChange={(event) => setReduction(Number(event.target.value))}
            />
            <small>
              Assumed uniform reduction against the selected historical
              reporting year; no causal or policy response is modeled.
            </small>
          </label>
        )}
        {entityType === "sector" && (
          <div className="tc-scenario-sector-controls">
            {selectedYear < 2021 && (
              <p className="tc-empty-note">
                Climate TRACE India sector totals are available from 2021. Use
                the global year selector to choose 2021 or later.
              </p>
            )}
            {loadingSectors && (
              <p role="status">Loading Climate TRACE sector totals…</p>
            )}
            {sectorError && (
              <p className="tc-error" role="alert">
                {sectorError}
              </p>
            )}
            {sectorData.map((sector) => (
              <label className="tc-reduction-control" key={sector.sector}>
                <span>
                  <strong>{sector.sector.toUpperCase()}</strong>
                  <b>−{sectorReductions[sector.sector] || 0}%</b>
                </span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={sectorReductions[sector.sector] || 0}
                  onChange={(event) =>
                    setSectorReduction(sector.sector, event.target.value)
                  }
                />
                <small>
                  Observed {sector.emissionsMt.toFixed(2)} Mt CO₂e ·{" "}
                  {sector.year}
                </small>
              </label>
            ))}
          </div>
        )}
        {entityType === "state" && (
          <div className="tc-state-scenario-note">
            {selectedYear >= 2021 ? (
              <>
                <strong>
                  {stateRegion?.name} ·{" "}
                  {stateEmission?.emissionsMt == null
                    ? "No state total reported"
                    : `${stateEmission.emissionsMt.toFixed(2)} Mt non-forest CO₂e · ${stateEmission.year}`}
                </strong>
                {loadingState && (
                  <p role="status">Loading Climate TRACE state estimates…</p>
                )}
                {stateError && (
                  <p className="tc-error" role="alert">
                    {stateError}
                  </p>
                )}
                {!loadingState &&
                  !stateError &&
                  !Number.isFinite(stateEmission?.emissionsMt) && (
                    <p>
                      No usable Climate TRACE total is available for this state
                      and year. A scenario is not calculated from the undated
                      per-capita fallback.
                    </p>
                  )}
              </>
            ) : (
              <>
                <strong>
                  {stateRegion?.name} ·{" "}
                  {stateSnapshot
                    ? `${stateSnapshot.co2PerCapita.toFixed(2)} kg CO₂/person`
                    : "No snapshot value available"}
                </strong>
                <p>
                  The bundled state data is an undated per-capita snapshot, not
                  an absolute total. State scenarios are available with Climate
                  TRACE admin-level totals from 2021 onward; no value is
                  inferred for earlier years.
                </p>
              </>
            )}
          </div>
        )}

        {entityType === "state" &&
          selectedYear >= 2021 &&
          Number.isFinite(stateEmission?.emissionsMt) && (
            <label className="tc-reduction-control">
              <span>
                <strong>STATE EMISSIONS REDUCTION</strong>
                <b>−{reduction}%</b>
              </span>
              <input
                type="range"
                min="0"
                max="50"
                value={reduction}
                onChange={(event) => setReduction(Number(event.target.value))}
              />
              <small>
                Assumed uniform reduction against the selected Climate TRACE
                reporting year; this scenario is not a forecast.
              </small>
            </label>
          )}
      </section>

      {simulated ? (
        <section className="tc-scenario-results">
          <div className="tc-scenario-result-heading">
            <span className="tc-eyebrow">
              SIMULATED IMPACT / {selectedYear}
            </span>
            <h2>TrustCarbon Scenario</h2>
            <p>{simulated.coverage}</p>
          </div>
          <div className="tc-scenario-result-grid">
            <article>
              <span>OBSERVED EMISSIONS</span>
              <strong>
                {simulated.current.toFixed(2)} <small>{simulated.unit}</small>
              </strong>
            </article>
            <article className="tc-result-highlight">
              <span>SIMULATED EMISSIONS</span>
              <strong>
                {simulated.simulated.toFixed(2)} <small>{simulated.unit}</small>
              </strong>
            </article>
            <article>
              <span>ABSOLUTE REDUCTION</span>
              <strong>
                {simulated.reduction.toFixed(2)} <small>{simulated.unit}</small>
              </strong>
            </article>
            <article>
              <span>SCENARIO REDUCTION</span>
              <strong>{simulated.percent.toFixed(1)}%</strong>
            </article>
          </div>
          <p className="tc-page-footnote">
            The simulated value is arithmetic: observed baseline × (1 −
            user-selected reduction). It is not an emissions forecast or an
            official TrustCarbon target.
          </p>
        </section>
      ) : (
        entityType !== "state" &&
        !loading &&
        !loadingSectors &&
        !sectorError && (
          <div className="tc-state-card">
            No observed emissions are available for this entity and selected
            historical year.
          </div>
        )
      )}
    </div>
  );
}
