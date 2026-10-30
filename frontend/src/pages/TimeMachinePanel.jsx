import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { exploreYear, rankAtYear } from "../analysis/timeMachine";
import { INDIA_ADMIN1_REGIONS } from "../data/indiaAdmin1Regions";
import { useDashboardData } from "../hooks/useDashboardData";
import { getIndiaStateEmission } from "../services/climateTraceService";

const LAST_COMPLETED_YEAR = new Date().getUTCFullYear() - 1;
const display = (value, unit = "") =>
  Number.isFinite(value)
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unit}`
    : "Data unavailable";

export default function TimeMachinePanel() {
  const { data, loading, error } = useDashboardData();
  const [mode, setMode] = useState("country");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("IN-MH");
  const [year, setYear] = useState(2021);
  const [baseline, setBaseline] = useState(2021);
  const [playing, setPlaying] = useState(false);
  const [stateData, setStateData] = useState({
    id: "",
    rows: [],
    loading: false,
    error: "",
  });
  const countryRows = useMemo(
    () =>
      (data?.rows || []).filter(
        (row) =>
          data.source !== "Our World in Data" || /^[A-Z]{3}$/.test(row.code),
      ),
    [data],
  );
  const countries = useMemo(
    () => [...new Set(countryRows.map((row) => row.country))].sort(),
    [countryRows],
  );

  useEffect(() => {
    if (mode !== "state") return undefined;
    let active = true;
    setStateData({ id: state, rows: [], loading: true, error: "" });
    const years = Array.from(
      { length: LAST_COMPLETED_YEAR - 2020 },
      (_, index) => 2021 + index,
    );
    // Each year retains its own missing/error boundary; a failed request never supplies a value.
    Promise.allSettled(
      years.map((queryYear) =>
        getIndiaStateEmission({ stateId: state, year: queryYear }),
      ),
    ).then((results) => {
      if (!active) return;
      const rows = results.flatMap((result) =>
        result.status === "fulfilled" &&
        Number.isFinite(result.value.emissionsMt)
          ? [{ year: result.value.year, value: result.value.emissionsMt }]
          : [],
      );
      setStateData({
        id: state,
        rows,
        loading: false,
        error: results.some((result) => result.status === "rejected")
          ? "Some Climate TRACE years could not be loaded. Those values remain unavailable."
          : "",
      });
    });
    return () => {
      active = false;
    };
  }, [mode, state]);

  const rows = useMemo(
    () =>
      mode === "country"
        ? countryRows
            .filter((row) => row.country === country)
            .map((row) => ({ year: row.year, value: row.co2Mt }))
            .sort((a, b) => a.year - b.year)
        : stateData.id === state
          ? stateData.rows
          : [],
    [mode, countryRows, country, stateData, state],
  );
  const minYear = rows[0]?.year ?? (mode === "state" ? 2021 : 1990);
  const maxYear =
    rows.at(-1)?.year ?? (mode === "state" ? LAST_COMPLETED_YEAR : 2021);
  const selected = exploreYear(rows, year, baseline);
  const ranking =
    mode === "country"
      ? rankAtYear(
          countryRows.map((row) => ({
            entity: row.country,
            year: row.year,
            value: row.co2Mt,
          })),
          country,
          year,
        )
      : null;
  const chartRows = useMemo(
    () =>
      Array.from({ length: maxYear - minYear + 1 }, (_, index) => {
        const chartYear = minYear + index;
        return {
          year: chartYear,
          value: rows.find((row) => row.year === chartYear)?.value ?? null,
        };
      }),
    [rows, minYear, maxYear],
  );

  useEffect(() => {
    setPlaying(false);
    setYear(minYear);
    setBaseline(minYear);
  }, [mode, country, state, minYear]);

  useEffect(() => {
    if (!playing) return undefined;
    if (year >= maxYear) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setYear(year + 1), 800);
    return () => window.clearTimeout(timer);
  }, [playing, year, maxYear]);

  const unit = mode === "country" ? "Mt CO₂" : "Mt non-forest CO₂e";
  const source =
    mode === "country" ? data?.source || "Our World in Data" : "Climate TRACE";
  const changeText = (change) =>
    change
      ? `${display(change.change, unit)} (${display(change.changePercent, "%")})`
      : "Data unavailable";
  return (
    <div className="tc-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">
            INTELLIGENCE / HISTORICAL OBSERVATIONS
          </span>
          <h1>Carbon Time Machine</h1>
          <p>
            Historical observations only. Explore source records year by year.
          </p>
        </div>
      </header>
      {(loading || (mode === "state" && stateData.loading)) && (
        <p role="status">Loading historical observations…</p>
      )}
      {(error || (mode === "state" && stateData.error)) && (
        <p role="alert">{error || stateData.error}</p>
      )}
      <section className="tc-panel tc-scenario-inputs">
        <div className="tc-scenario-selects">
          <label>
            Entity type
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="country">Country</option>
              <option value="state">India state / union territory</option>
            </select>
          </label>
          {mode === "country" ? (
            <label>
              Country
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                {countries.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              State
              <select
                value={state}
                onChange={(event) => setState(event.target.value)}
              >
                {INDIA_ADMIN1_REGIONS.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Baseline year
            <select
              value={baseline}
              onChange={(event) => setBaseline(Number(event.target.value))}
            >
              {rows.map((row) => (
                <option key={row.year} value={row.year}>
                  {row.year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Inspect year
            <input
              type="number"
              min={mode === "state" ? 1990 : minYear}
              max={maxYear}
              value={year}
              onChange={(event) => {
                setPlaying(false);
                if (event.target.value) setYear(Number(event.target.value));
              }}
            />
          </label>
        </div>
        <label>
          Reporting year: {year}
          <input
            aria-label="Time Machine reporting year"
            type="range"
            min={minYear}
            max={maxYear}
            step="1"
            value={Math.max(minYear, Math.min(maxYear, year))}
            onChange={(event) => {
              setPlaying(false);
              setYear(Number(event.target.value));
            }}
          />
        </label>
        <button
          type="button"
          className="tc-outline-action"
          disabled={!rows.length || (!playing && year >= maxYear)}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <p>
          Source: {source} · Reporting coverage:{" "}
          {rows.length
            ? `${minYear}–${maxYear}, with missing years left unavailable`
            : "Data unavailable"}{" "}
          · Selected reporting period: {year}.
        </p>
        {data?.sourceWarning && mode === "country" && (
          <p>{data.sourceWarning}</p>
        )}
        {mode === "state" && (
          <p>
            Climate TRACE admin-level non-forest estimates are queried for 2021–
            {LAST_COMPLETED_YEAR}. State totals before 2021 are unavailable; the
            undated per-capita snapshot is not used.
          </p>
        )}
        {mode === "state" && year < 2021 && (
          <p>
            Data unavailable — Climate TRACE state totals are unavailable before
            2021.
          </p>
        )}
      </section>
      <section className="tc-panel">
        <h2>Historical observations · {year}</h2>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={chartRows}>
              <XAxis dataKey="year" type="number" domain={[minYear, maxYear]} />
              <YAxis />
              <Tooltip formatter={(value) => display(value, unit)} />
              <Line
                type="linear"
                dataKey="value"
                stroke="#34764a"
                connectNulls={false}
                isAnimationActive={false}
                dot={{ r: 2 }}
              />
              <ReferenceLine x={year} stroke="#a45b28" label={String(year)} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <dl className="tc-corporate-facts">
          <div>
            <dt>Selected-year value</dt>
            <dd>{display(selected.current?.value, unit)}</dd>
          </div>
          <div>
            <dt>
              Change vs previous available year {selected.previous?.year ?? ""}{" "}
              {selected.isYearOverYear ? "(YoY)" : "(period change, not YoY)"}
            </dt>
            <dd>{changeText(selected.previousChange)}</dd>
          </div>
          <div>
            <dt>Change vs baseline {baseline}</dt>
            <dd>{changeText(selected.baseline)}</dd>
          </div>
          <div>
            <dt>Cumulative net change since {baseline}</dt>
            <dd>{display(selected.cumulative, unit)}</dd>
          </div>
          {mode === "country" && (
            <div>
              <dt>Country rank in {year}</dt>
              <dd>
                {ranking
                  ? `${ranking.rank} of ${ranking.total} observed countries (largest first)`
                  : "Data unavailable"}
              </dd>
            </div>
          )}
        </dl>
        <p className="tc-data-boundary-note">
          Missing years show Data unavailable and break the chart; values are
          never interpolated. Cumulative net change sums consecutive annual
          differences, requires every year from baseline through selection, and
          is unavailable for a later baseline. It is not cumulative emissions.
          Country CO₂ and state non-forest CO₂e have different coverage. Ranks
          describe only countries with observations in that year.
        </p>
      </section>
    </div>
  );
}
