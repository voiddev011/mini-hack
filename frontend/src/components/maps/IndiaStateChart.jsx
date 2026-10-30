import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useDashboardData } from "../../hooks/useDashboardData";
import { INDIA_STATE_DATA } from "../../data/realData";
import {
  getIndiaStateEmissionHistory,
  getIndiaStateEmissions,
} from "../../services/climateTraceService";
import { getIndiaBoundaries } from "../../services/indiaBoundaryService";
import {
  calculateCarbonPressure,
  calculateConfidence,
  calculateGrowthRate,
  calculateRank,
  compareWithAverage,
  detectAnomalies,
  generateInsights,
} from "../../analysis/analysisEngine";

const METRICS = [
  {
    key: "co2PerCapita",
    label: "CO₂ per capita",
    unit: "kg/person",
    color: "var(--accent)",
  },
  {
    key: "coPerCapita",
    label: "CO per capita",
    unit: "kg/person",
    color: "#65776b",
  },
  {
    key: "ch4PerCapita",
    label: "CH₄ per capita",
    unit: "kg/person",
    color: "#9a7046",
  },
];
const CLIMATE_TRACE_METRIC = {
  key: "emissionsMt",
  label: "Reported non-forest CO₂e emissions",
  unit: "Mt CO₂e",
  color: "var(--accent)",
};
const CLIMATE_TRACE_METRICS = [CLIMATE_TRACE_METRIC];
const MAP_COLORS = [
  "#E5F1E3",
  "#B7D3AC",
  "#78A878",
  "#E5D77A",
  "#E99A65",
  "#D96B64",
  "#B83C3C",
];
const MAP_WIDTH = 840;
const MAP_HEIGHT = 590;
const MAP_PADDING = 14;
const ISO_TO_TRUSTCARBON_STATE = {
  "IN-AP": "Andhra Pradesh",
  "IN-AR": "Arunachal",
  "IN-AS": "Assam",
  "IN-BR": "Bihar",
  "IN-CG": "Chattisgarh",
  "IN-GA": "Goa",
  "IN-GJ": "Gujarat",
  "IN-HR": "Haryana",
  "IN-HP": "Himachal Pradesh",
  "IN-JK": "Jammu & Kashmir",
  "IN-JH": "Jharkhand",
  "IN-KA": "Karnataka",
  "IN-KL": "Kerala",
  "IN-MP": "Madhya Pradesh",
  "IN-MH": "Maharashtra",
  "IN-MN": "Manipur",
  "IN-ML": "Meghalaya",
  "IN-MZ": "Mizoram",
  "IN-NL": "Nagaland",
  "IN-OD": "Odhisha",
  "IN-PB": "Punjab",
  "IN-RJ": "Rajasthan",
  "IN-SK": "Sikkim",
  "IN-TN": "Tamilnadu",
  "IN-TR": "Tripura",
  "IN-UP": "Uttar Pradesh",
  "IN-UK": "Uttarakhand",
  "IN-WB": "West Bengal",
};

const normalizeState = (name) => name.toLowerCase().replace(/[^a-z]/g, "");

const visitCoordinates = (coordinates, visit) => {
  if (typeof coordinates[0] === "number") {
    visit(coordinates);
    return;
  }
  coordinates.forEach((child) => visitCoordinates(child, visit));
};

function projectIndiaCoordinate([longitude, latitude]) {
  const radians = Math.PI / 180;
  const standardParallel1 = 15 * radians;
  const standardParallel2 = 30 * radians;
  const latitudeOrigin = 22 * radians;
  const centralMeridian = 82 * radians;
  const n = (Math.sin(standardParallel1) + Math.sin(standardParallel2)) / 2;
  const c =
    Math.cos(standardParallel1) ** 2 + 2 * n * Math.sin(standardParallel1);
  const rho = (phi) => Math.sqrt(c - 2 * n * Math.sin(phi)) / n;
  const rhoOrigin = rho(latitudeOrigin);
  const theta = n * (longitude * radians - centralMeridian);
  const radius = rho(latitude * radians);
  return [radius * Math.sin(theta), rhoOrigin - radius * Math.cos(theta)];
}

function geometryPath(geometry, project) {
  const rings = [];
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  polygons.forEach((polygon) => {
    polygon.forEach((ring) => {
      rings.push(
        ring
          .map((coordinate, index) => {
            const [x, y] = project(coordinate);
            return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ") + " Z",
      );
    });
  });
  return rings.join(" ");
}

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>
        {metric.label}: {payload[0].value.toFixed(2)} {metric.unit}
      </span>
    </div>
  );
}

export default function IndiaStateChart() {
  const { selectedYear, setSelectedYear } = useDashboardData();
  const [activeMetric, setActiveMetric] = useState("co2PerCapita");
  const [boundaries, setBoundaries] = useState([]);
  const [mapError, setMapError] = useState("");
  const [climateStateData, setClimateStateData] = useState([]);
  const [climateLoading, setClimateLoading] = useState(false);
  const [climateError, setClimateError] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [hoveredState, setHoveredState] = useState("");
  const [selectedStateHistory, setSelectedStateHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const usesClimateTrace = selectedYear >= 2021;
  const metrics = usesClimateTrace ? CLIMATE_TRACE_METRICS : METRICS;
  const metric =
    metrics.find((item) => item.key === activeMetric) || metrics[0];
  const activeMetricKey = metric.key;

  useEffect(() => {
    let active = true;
    getIndiaBoundaries()
      .then((features) => {
        if (active) setBoundaries(features);
      })
      .catch((error) => {
        if (active)
          setMapError(error.message || "Map boundaries could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!usesClimateTrace) {
      setClimateStateData([]);
      setClimateLoading(false);
      setClimateError("");
      return undefined;
    }
    let active = true;
    setClimateLoading(true);
    setClimateError("");
    getIndiaStateEmissions(selectedYear)
      .then((rows) => {
        if (active) setClimateStateData(rows);
      })
      .catch((error) => {
        if (active)
          setClimateError(
            error.message ||
              "Climate TRACE state emissions could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setClimateLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedYear, usesClimateTrace]);

  useEffect(() => {
    if (!usesClimateTrace || !selectedState) {
      setSelectedStateHistory([]);
      setHistoryLoading(false);
      setHistoryError("");
      return undefined;
    }
    let active = true;
    setHistoryLoading(true);
    setHistoryError("");
    getIndiaStateEmissionHistory({
      stateId: selectedState,
      throughYear: selectedYear,
    })
      .then((rows) => {
        if (active) setSelectedStateHistory(rows);
      })
      .catch((error) => {
        if (active)
          setHistoryError(
            error.message || "Selected-state history could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedState, selectedYear, usesClimateTrace]);

  useEffect(() => {
    if (!metrics.some((item) => item.key === activeMetric))
      setActiveMetric(metrics[0].key);
  }, [activeMetric, metrics]);

  const mapModel = useMemo(() => {
    if (!boundaries.length) return { groups: [] };
    const bounds = [Infinity, Infinity, -Infinity, -Infinity];
    boundaries.forEach(({ geometry }) => {
      visitCoordinates(geometry.coordinates, (coordinate) => {
        const [x, y] = projectIndiaCoordinate(coordinate);
        bounds[0] = Math.min(bounds[0], x);
        bounds[1] = Math.min(bounds[1], y);
        bounds[2] = Math.max(bounds[2], x);
        bounds[3] = Math.max(bounds[3], y);
      });
    });
    const projectedWidth = bounds[2] - bounds[0];
    const projectedHeight = bounds[3] - bounds[1];
    const scale = Math.min(
      (MAP_WIDTH - MAP_PADDING * 2) / projectedWidth,
      (MAP_HEIGHT - MAP_PADDING * 2) / projectedHeight,
    );
    const shapeWidth = projectedWidth * scale;
    const shapeHeight = projectedHeight * scale;
    const offsetX = (MAP_WIDTH - shapeWidth) / 2;
    const offsetY = (MAP_HEIGHT - shapeHeight) / 2;
    const project = (coordinate) => {
      const [x, y] = projectIndiaCoordinate(coordinate);
      return [
        offsetX + (x - bounds[0]) * scale,
        MAP_HEIGHT - offsetY - (y - bounds[1]) * scale,
      ];
    };
    const groups = new Map();
    boundaries.forEach((feature) => {
      const id = feature.properties["iso3166-2"];
      if (!groups.has(id))
        groups.set(id, { id, name: feature.properties.name, shapes: [] });
      groups.get(id).shapes.push({
        id: feature.id,
        path: geometryPath(feature.geometry, project),
      });
    });
    return { groups: [...groups.values()] };
  }, [boundaries]);

  const stateNamesById = useMemo(
    () => new Map(mapModel.groups.map(({ id, name }) => [id, name])),
    [mapModel],
  );
  const dataByStateId = useMemo(() => {
    if (usesClimateTrace)
      return new Map(climateStateData.map((entry) => [entry.stateId, entry]));
    const entriesByName = new Map(
      INDIA_STATE_DATA.map((entry) => [normalizeState(entry.state), entry]),
    );
    return new Map(
      Object.entries(ISO_TO_TRUSTCARBON_STATE)
        .map(([id, name]) => [id, entriesByName.get(normalizeState(name))])
        .filter(([, entry]) => entry),
    );
  }, [climateStateData, usesClimateTrace]);

  const sorted = useMemo(
    () =>
      usesClimateTrace
        ? climateStateData
            .filter((entry) => Number.isFinite(entry[activeMetricKey]))
            .map((entry) => ({
              ...entry,
              state: stateNamesById.get(entry.stateId) || entry.state,
            }))
            .sort(
              (first, second) =>
                second[activeMetricKey] - first[activeMetricKey],
            )
        : [...INDIA_STATE_DATA].sort(
            (first, second) => second[activeMetricKey] - first[activeMetricKey],
          ),
    [activeMetricKey, climateStateData, stateNamesById, usesClimateTrace],
  );
  const rankedStates = sorted.slice(0, 5);
  const values = sorted
    .map((entry) => entry[activeMetricKey])
    .sort((first, second) => first - second);
  const quantileThresholds = values.length
    ? MAP_COLORS.slice(1).map(
        (_, index) =>
          values[
            Math.min(
              values.length - 1,
              Math.floor(values.length * ((index + 1) / MAP_COLORS.length)),
            )
          ],
      )
    : [];
  const valueForState = (stateId) => dataByStateId.get(stateId);
  const fillForState = (state) => {
    const value = valueForState(state)?.[activeMetricKey];
    if (
      !Number.isFinite(value) ||
      quantileThresholds.length !== MAP_COLORS.length - 1
    )
      return "#E5E7E3";
    const bucket = quantileThresholds.findIndex(
      (threshold) => value <= threshold,
    );
    return MAP_COLORS[bucket === -1 ? MAP_COLORS.length - 1 : bucket];
  };
  const selectedData = valueForState(selectedState);
  const selectedStateName = boundaries.find(
    (feature) => feature.properties["iso3166-2"] === selectedState,
  )?.properties.name;
  const selectedMetricValue = selectedData?.[activeMetricKey] ?? null;
  const selectedRankIdentity = selectedData?.stateId || selectedData?.state;
  const selectedRank = selectedData
    ? calculateRank(
        sorted.map((entry) => ({
          id: entry.stateId || entry.state,
          value: entry[activeMetricKey],
        })),
        selectedRankIdentity || selectedState,
      )
    : null;
  const peerComparison =
    selectedMetricValue === null
      ? null
      : compareWithAverage(
          selectedMetricValue,
          sorted
            .filter(
              (entry) =>
                (entry.stateId || entry.state) !==
                (selectedData?.stateId || selectedData?.state),
            )
            .map((entry) => ({ value: entry[activeMetricKey] })),
        );
  const peerAverage = peerComparison?.average;
  const pressure = calculateCarbonPressure(selectedMetricValue, peerAverage);
  const stateConfidence = calculateConfidence({
    observationCount: usesClimateTrace ? selectedStateHistory.length : 1,
    completeness: usesClimateTrace
      ? selectedStateHistory.length / Math.max(1, selectedYear - 2020)
      : 1,
    validationRate: 1,
  });
  const stateInsights = selectedData
    ? generateInsights({
        entity: selectedStateName,
        observations: usesClimateTrace ? selectedStateHistory : [],
        currentValue: usesClimateTrace ? undefined : selectedMetricValue,
        peerEntities:
          selectedStateHistory.at(-1)?.year === selectedYear ||
          !usesClimateTrace
            ? sorted
                .filter(
                  (entry) =>
                    (entry.stateId || entry.state) !==
                    (selectedData.stateId || selectedData.state),
                )
                .map((entry) => ({
                  id: entry.stateId || entry.state,
                  value: entry[activeMetricKey],
                }))
            : [],
        metricLabel: metric.label,
        confidence: stateConfidence,
      })
    : [];
  const stateAnomalies = usesClimateTrace
    ? detectAnomalies(selectedStateHistory, {
        entity: selectedStateName,
        metric: metric.label,
      })
    : [];
  const stateGrowthPercent = usesClimateTrace
    ? calculateGrowthRate(selectedStateHistory)
    : null;
  const tooltipState = hoveredState || selectedState;
  const tooltipData = valueForState(tooltipState);
  const tooltipMetricValue = tooltipData?.[activeMetricKey] ?? null;
  const tooltipStateName = boundaries.find(
    (feature) => feature.properties["iso3166-2"] === tooltipState,
  )?.properties.name;

  const handleMapKeyDown = (event, state) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedState(state);
    }
  };

  return (
    <div className="india-research-layout">
      <div className="india-map-panel">
        <div className="research-panel-heading">
          <div>
            <span className="section-index">
              {usesClimateTrace
                ? `CLIMATE TRACE / ${selectedYear}`
                : "SOURCE SNAPSHOT"}
            </span>
            <h3>{metric.label}</h3>
          </div>
          <span className="unit-note">{metric.unit}</span>
        </div>
        {mapError ? (
          <p role="alert">{mapError}</p>
        ) : boundaries.length === 0 ? (
          <p role="status">Loading state boundaries...</p>
        ) : (
          <svg
            className="india-heatmap"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label={`Map of Indian states shaded by ${metric.label}`}
          >
            {mapModel.groups.map(({ id, name, shapes }) => {
              const stateData = valueForState(id);
              return (
                <g
                  key={id}
                  data-state-id={id}
                  className={`india-map-state${selectedState === id ? " selected" : ""}`}
                  tabIndex="0"
                  role="button"
                  aria-label={
                    Number.isFinite(stateData?.[activeMetricKey])
                      ? `${name}: ${stateData[activeMetricKey].toFixed(2)} ${metric.unit}`
                      : `${name}: No data for ${metric.label}`
                  }
                  onMouseEnter={() => setHoveredState(id)}
                  onMouseLeave={() => setHoveredState("")}
                  onFocus={() => setHoveredState(id)}
                  onBlur={() => setHoveredState("")}
                  onClick={() => setSelectedState(id)}
                  onKeyDown={(event) => handleMapKeyDown(event, id)}
                  fill={fillForState(id)}
                >
                  {shapes.map((shape) => (
                    <path key={shape.id} d={shape.path} />
                  ))}
                  <title>
                    {Number.isFinite(stateData?.[activeMetricKey])
                      ? `${name}: ${stateData[activeMetricKey].toFixed(2)} ${metric.unit}`
                      : `${name}: No data for ${metric.label}`}
                  </title>
                </g>
              );
            })}
          </svg>
        )}
        <div className="map-legend" aria-label="Emissions intensity legend">
          {[
            "Very low",
            "Low",
            "Moderate",
            "Elevated",
            "High",
            "Very high",
            "Extreme",
          ].map((label, index) => (
            <span className="legend-level" key={label}>
              <i style={{ background: MAP_COLORS[index] }} />
              {label}
            </span>
          ))}
          <span className="legend-unavailable">
            <i style={{ background: "#E5E7E3" }} /> No data
          </span>
        </div>
        <div className="map-state-readout" aria-live="polite">
          {tooltipState ? (
            <>
              <strong>{tooltipStateName}</strong>
              <span className="map-value-readout">
                {tooltipMetricValue !== null
                  ? `${tooltipMetricValue.toFixed(2)} ${metric.unit}`
                  : "No data"}
                <small>
                  {usesClimateTrace
                    ? `Reporting year: ${selectedYear} · Climate TRACE`
                    : "Reporting year not provided by source dataset"}
                </small>
              </span>
            </>
          ) : (
            <span>Point to or select a state to inspect its value.</span>
          )}
        </div>
        {climateLoading && (
          <p className="tc-map-data-status" role="status">
            Loading Climate TRACE state estimates for {selectedYear}…
          </p>
        )}
        {climateError && (
          <p className="tc-error" role="alert">
            {climateError}
          </p>
        )}
        <p className="map-source-note">
          State boundaries:{" "}
          <a
            href="https://code.highcharts.com/mapdata/countries/in/in-all.geo.json"
            target="_blank"
            rel="noreferrer"
          >
            Highcharts India admin-1 boundary data
          </a>
          , Copyright (c) Highsoft AS, based on{" "}
          <a
            href="https://openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap
          </a>
          . Features are joined by ISO 3166-2 identifiers and projected with an
          Albers equal-area conic projection. Colours are recalculated as seven
          quantile classes for the selected metric.{" "}
          {usesClimateTrace ? (
            <>
              Emissions:{" "}
              <a
                href="https://api.climatetrace.org/v7/docs/index.html"
                target="_blank"
                rel="noreferrer"
              >
                Climate TRACE API v7
              </a>
              , admin-level non-forest CO₂e sector estimates for {selectedYear}.
              Areas unavailable from the source remain unfilled.
            </>
          ) : (
            "Emissions: CarbonEmissionIndia per-capita snapshot. The supplied file has no reporting year or state totals."
          )}
        </p>
      </div>

      <div className="india-comparison-panel" id="india-state-comparison">
        <div className="research-panel-heading">
          <div>
            <span className="section-index">
              STATE COMPARISON / {selectedYear}
            </span>
            <h3>
              {usesClimateTrace
                ? "Estimated annual emissions"
                : "Reported per-capita indicators"}
            </h3>
          </div>
          <div className="chart-controls">
            {metrics.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`research-tab${activeMetric === item.key ? " active" : ""}`}
                onClick={() => setActiveMetric(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="india-rankings"
          aria-label={`Top states by ${metric.label}`}
        >
          <span className="section-index">TOP STATES / {metric.unit}</span>
          {rankedStates.map((entry, index) => {
            const stateId =
              entry.stateId ||
              Object.entries(ISO_TO_TRUSTCARBON_STATE).find(
                ([, stateName]) =>
                  normalizeState(stateName) === normalizeState(entry.state),
              )?.[0];
            return (
              <button
                type="button"
                key={stateId || entry.state}
                className={selectedState === stateId ? "active" : ""}
                onClick={() => stateId && setSelectedState(stateId)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{entry.state}</strong>
                <b>{entry[activeMetricKey].toFixed(2)}</b>
              </button>
            );
          })}
        </div>
        {selectedState && (
          <div className="selected-state-note" role="status">
            <strong>{selectedStateName}</strong>
            <span>
              {selectedMetricValue !== null
                ? `${selectedMetricValue.toFixed(2)} ${metric.unit}`
                : "No data"}
            </span>
            <span>
              {usesClimateTrace
                ? `Reporting year: ${selectedYear} · Climate TRACE`
                : "Reporting year not provided by source dataset"}
            </span>
            <button type="button" onClick={() => setSelectedState("")}>
              Clear selection
            </button>
          </div>
        )}
        {selectedState && (
          <section className="tc-state-detail">
            <div className="tc-panel-heading">
              <div>
                <span className="tc-eyebrow">
                  {usesClimateTrace
                    ? "SELECTED STATE / CLIMATE TRACE"
                    : "SELECTED STATE / SOURCE SNAPSHOT"}
                </span>
                <h2>{selectedStateName}</h2>
              </div>
              <span className="tc-unit-tag">
                {usesClimateTrace
                  ? `Reporting year ${selectedYear}`
                  : "Reporting year not provided"}
              </span>
            </div>
            <div className="tc-state-detail-metrics">
              <div>
                <span>{metric.label}</span>
                <strong>
                  {selectedMetricValue === null
                    ? "Unavailable"
                    : `${selectedMetricValue.toFixed(2)} ${metric.unit}`}
                </strong>
              </div>
              <div>
                <span>Rank by selected metric</span>
                <strong>
                  {selectedRank
                    ? `${selectedRank.rank} of ${selectedRank.total}`
                    : "Unavailable"}
                </strong>
              </div>
              <div>
                <span>Peer comparison</span>
                <strong>
                  {peerComparison
                    ? `${peerComparison.relation} ${usesClimateTrace ? "state average" : "snapshot average"}`
                    : "Unavailable"}
                </strong>
              </div>
              {pressure !== null && (
                <div>
                  <span>Relative to state average</span>
                  <strong>{pressure.toFixed(0)}%</strong>
                </div>
              )}
            </div>
            <div className="tc-country-signals">
              <section>
                <span className="tc-eyebrow">TREND AND ANOMALIES</span>
                {usesClimateTrace ? (
                  <>
                    {historyLoading && (
                      <p role="status">Loading {selectedStateName} history…</p>
                    )}
                    {historyError && (
                      <p className="tc-error" role="alert">
                        {historyError}
                      </p>
                    )}
                    {selectedStateHistory.length > 1 ? (
                      <p>
                        Climate TRACE estimates changed{" "}
                        {stateGrowthPercent === null
                          ? "n/a"
                          : `${stateGrowthPercent.toFixed(1)}%`}{" "}
                        between {selectedStateHistory[0].year} and{" "}
                        {selectedStateHistory.at(-1).year}.
                      </p>
                    ) : (
                      <p>
                        Insufficient historical observations are available for a
                        trend calculation.
                      </p>
                    )}
                    {selectedStateHistory.length > 0 && (
                      <div className="tc-sector-history">
                        {selectedStateHistory.map((item) => (
                          <div key={item.year}>
                            <span>{item.year}</span>
                            <span className="tc-ranking-bar">
                              <i
                                style={{
                                  width: `${Math.max(2, (item.value / Math.max(...selectedStateHistory.map((point) => point.value))) * 100)}%`,
                                }}
                              />
                            </span>
                            <b>{item.value.toFixed(2)} Mt</b>
                          </div>
                        ))}
                      </div>
                    )}
                    {stateAnomalies.map((item) => (
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
                    {!stateAnomalies.length && (
                      <p>
                        {selectedStateHistory.length < 6
                          ? "At least six consecutive annual records are required for the configured rolling anomaly baseline."
                          : "No statistical anomalies met the configured threshold in this history."}
                      </p>
                    )}
                  </>
                ) : (
                  <p>
                    This local state file contains one undated observation per
                    state. A historical trend, year-over-year change, and
                    statistical anomaly cannot be calculated from a single
                    snapshot.
                  </p>
                )}
              </section>
              <section>
                <span className="tc-eyebrow">ENGINE-GENERATED INSIGHTS</span>
                {stateInsights.length ? (
                  stateInsights.map((item, index) => (
                    <p key={`${item.type}-${item.metric?.year ?? index}`}>
                      <strong>{item.title}:</strong> {item.explanation}{" "}
                      <small>
                        Confidence {Math.round(item.confidence * 100)}%
                      </small>
                    </p>
                  ))
                ) : (
                  <p>
                    No peer-comparison insight threshold was met for this state.
                  </p>
                )}
              </section>
            </div>
          </section>
        )}
        {sorted.length ? (
          <div className="india-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sorted}
                margin={{ top: 8, right: 8, left: -12, bottom: 56 }}
              >
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="state"
                  stroke="var(--text-secondary)"
                  fontSize={10}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip metric={metric} />} />
                <Bar
                  dataKey={activeMetricKey}
                  maxBarSize={28}
                  fill={metric.color}
                >
                  {sorted.map((entry) => (
                    <Cell
                      key={entry.stateId || entry.state}
                      fill={metric.color}
                      fillOpacity={
                        !selectedState ||
                        (entry.stateId
                          ? selectedState === entry.stateId
                          : normalizeState(
                              ISO_TO_TRUSTCARBON_STATE[selectedState] || "",
                            ) === normalizeState(entry.state))
                          ? 1
                          : 0.28
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="country-empty-state">
            No state comparison values are available.
          </p>
        )}
        <p className="map-source-note">
          Source values are reproduced as supplied. The file has no reporting
          year or state total emissions. States and union territories without a
          matching source value are shown as unavailable.
        </p>
      </div>
    </div>
  );
}
