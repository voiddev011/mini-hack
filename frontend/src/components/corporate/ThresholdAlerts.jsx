import { useState } from "react";
import { useCorporateIntelligence } from "../../hooks/useCorporateIntelligence";

const METRICS = [
  ["reported_total", "Reported total", "reportedTotal"],
  ["scope1", "Scope 1", "scope1"],
  ["scope2", "Scope 2", "scope2"],
  ["scope3", "Scope 3", "scope3"],
  ["emissions_intensity", "Emissions intensity", "emissionsIntensity"],
  ["yoy_change_percent", "Reported YoY change (%)", "yoyChangePercent"],
];

export default function ThresholdAlerts({ alerts, analysis }) {
  const { confirmMetric } = useCorporateIntelligence();
  const [metric, setMetric] = useState("reported_total");
  const [operator, setOperator] = useState("gt");
  const [threshold, setThreshold] = useState("");
  const [unit, setUnit] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");
  const [yoy, setYoy] = useState("");
  const [page, setPage] = useState("");
  const [column, setColumn] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const metricKey = METRICS.find(([key]) => key === metric)?.[2];
  const reportedUnit = analysis.currentMetrics[metricKey]?.unit;
  const ruleUnit =
    unit || reportedUnit || (metric === "yoy_change_percent" ? "%" : "");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (
      !threshold.trim() ||
      !Number.isFinite(Number(threshold)) ||
      !ruleUnit.trim()
    ) {
      setError("Enter a finite threshold and its exact reporting unit.");
      return;
    }
    try {
      await alerts.create({
        metric,
        operator,
        threshold: Number(threshold),
        unit: ruleUnit.trim(),
        enabled,
      });
      setThreshold("");
    } catch (failure) {
      setError(failure.message);
    }
  };
  const act = async (callback) => {
    setError("");
    try {
      await callback();
    } catch (failure) {
      setError(failure.message);
    }
  };
  return (
    <section className="tc-panel">
      <div className="tc-panel-heading">
        <div>
          <span className="tc-eyebrow">
            IN-APP / USER-CONFIGURED THRESHOLDS
          </span>
          <h2>Threshold alerts</h2>
        </div>
      </div>
      <p>
        User-configured thresholds, not regulatory limits. Evaluated when you
        load or update company data or rules. No automatic filing monitoring or
        alert delivery is configured.
      </p>
      <p>
        {alerts.persistent
          ? "Rules and triggered-event evidence are saved privately to your account. PDF documents remain local; event evidence includes the citation, page and reporting column."
          : "Session-only rules: alert history is not saved. Sign in with a configured Supabase project for persistent rules and history."}
      </p>
      <p>
        Source: user-confirmed rows from{" "}
        {analysis.report?.sourceUrl ||
          analysis.report?.fileName ||
          "no loaded document"}{" "}
        · Reporting period:{" "}
        {analysis.report?.reportingYear || "Data unavailable"}. Missing metrics,
        unconfirmed rows, unknown or incompatible units, missing citations and
        columns outside the selected reporting period are skipped. YoY alerts
        require a confirmed reported percentage; calculated endpoint growth is
        excluded.
      </p>
      {analysis.report && (
        <details>
          <summary>
            Confirm a YoY percentage reported in the loaded document
          </summary>
          <p>
            Use only an explicitly reported annual emissions percentage. Review
            its page, reporting period and inventory boundary before confirming;
            do not enter a calculated multi-year change.
          </p>
          <form
            className="tc-scenario-selects"
            onSubmit={(event) => {
              event.preventDefault();
              if (
                !yoy.trim() ||
                !Number.isFinite(Number(yoy)) ||
                !Number.isInteger(Number(page)) ||
                Number(page) < 1 ||
                Number(page) > analysis.report.pageCount ||
                !column.trim() ||
                !excerpt.trim()
              ) {
                setError(
                  "Enter the reported percentage, a valid PDF page, reporting column and source excerpt.",
                );
                return;
              }
              try {
                confirmMetric({
                  key: "yoyChangePercent",
                  value: Number(yoy),
                  unit: "%",
                  page: Number(page),
                  columnHeader: column.trim(),
                  evidence: excerpt.trim(),
                });
                setError("");
              } catch (failure) {
                setError(failure.message);
              }
            }}
          >
            <label>
              Reported YoY percentage
              <input
                type="number"
                step="any"
                required
                value={yoy}
                onChange={(event) => setYoy(event.target.value)}
              />
            </label>
            <label>
              PDF page
              <input
                type="number"
                min="1"
                max={analysis.report.pageCount}
                required
                value={page}
                onChange={(event) => setPage(event.target.value)}
              />
            </label>
            <label>
              Reporting column and boundary
              <input
                required
                placeholder="FY2024-25 standalone"
                value={column}
                onChange={(event) => setColumn(event.target.value)}
              />
            </label>
            <label>
              Exact source excerpt
              <input
                required
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
              />
            </label>
            <button className="tc-outline-action">
              Confirm this reported YoY value
            </button>
          </form>
          {analysis.currentMetrics.yoyChangePercent && (
            <p>
              Confirmed: {analysis.currentMetrics.yoyChangePercent.value}% ·
              page {analysis.currentMetrics.yoyChangePercent.page} ·{" "}
              {analysis.currentMetrics.yoyChangePercent.reportingColumn}
            </p>
          )}
        </details>
      )}
      <form onSubmit={submit} className="tc-scenario-selects">
        <label>
          Metric
          <select
            value={metric}
            onChange={(event) => {
              setMetric(event.target.value);
              setUnit("");
            }}
          >
            {METRICS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Operator
          <select
            value={operator}
            onChange={(event) => setOperator(event.target.value)}
          >
            <option value="gt">Greater than</option>
            <option value="lt">Less than</option>
          </select>
        </label>
        <label>
          Threshold
          <input
            type="number"
            step="any"
            required
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
          />
        </label>
        <label>
          Exact reporting unit
          <input
            required
            value={ruleUnit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="e.g. t CO₂e"
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />{" "}
          Enabled
        </label>
        <button
          className="tc-outline-action"
          disabled={!alerts.ready || alerts.busy || !analysis.company.trim()}
        >
          Add rule
        </button>
      </form>
      {(error || alerts.error) && (
        <p role="alert" className="tc-error">
          {error || alerts.error}
        </p>
      )}
      {alerts.persistent && (
        <button
          className="tc-outline-action"
          type="button"
          onClick={alerts.retry}
        >
          Reload saved rules and history
        </button>
      )}
      {!alerts.ready && (
        <p role="status">
          Saved rules are unavailable until loading succeeds. Apply the alert
          migration if it has not been run.
        </p>
      )}
      <ul>
        {alerts.rules.map((rule) => (
          <li key={rule.id}>
            {METRICS.find(([key]) => key === rule.metric)?.[1]}{" "}
            {rule.operator === "gt" ? ">" : "<"} {rule.threshold} {rule.unit} ·{" "}
            {rule.enabled ? "Enabled" : "Disabled"}{" "}
            <button
              type="button"
              className="tc-outline-action"
              disabled={alerts.busy}
              onClick={() =>
                act(() => alerts.update({ ...rule, enabled: !rule.enabled }))
              }
            >
              {rule.enabled ? "Disable" : "Enable"}
            </button>{" "}
            <button
              type="button"
              className="tc-outline-action"
              disabled={alerts.busy}
              onClick={() => act(() => alerts.remove(rule))}
            >
              Delete rule and its history
            </button>
          </li>
        ))}
      </ul>
      {!alerts.rules.length && <p>No rules configured for this company.</p>}
      <h3>Triggered on current data</h3>
      {alerts.triggered.length ? (
        <ul>
          {alerts.triggered.map((event) => (
            <li key={event.rule_id}>
              {event.evidence.metric}: {event.observed_value}{" "}
              {event.evidence.unit} · threshold{" "}
              {event.evidence.operator === "gt" ? ">" : "<"} {event.threshold} ·{" "}
              {event.evidence.source}, page {event.evidence.page},{" "}
              {event.evidence.reporting_column}
            </li>
          ))}
        </ul>
      ) : (
        <p>
          No configured threshold is met by the available confirmed metrics.
        </p>
      )}
      <h3>Alert history</h3>
      <div style={{ overflowX: "auto" }}>
        <table className="tc-data-table">
          <thead>
            <tr>
              <th>Evaluated at</th>
              <th>Period</th>
              <th>Metric</th>
              <th>Observed</th>
              <th>Threshold at evaluation</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {alerts.events.map((event) => (
              <tr key={event.id}>
                <td>{new Date(event.triggered_at).toLocaleString()}</td>
                <td>{event.reporting_year}</td>
                <td>{event.evidence.metric}</td>
                <td>
                  {event.observed_value} {event.evidence.unit}
                </td>
                <td>
                  {event.evidence.operator === "gt" ? ">" : "<"}{" "}
                  {event.threshold} {event.evidence.unit}
                </td>
                <td>
                  {event.evidence.source} · page {event.evidence.page} ·{" "}
                  {event.evidence.reporting_column}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!alerts.events.length && (
        <p>No recorded threshold events for this company.</p>
      )}
      <p className="tc-data-boundary-note">
        Repeated evaluation does not add another event for the same rule,
        company, reporting year and observed value. Deleting a rule deletes its
        history.
      </p>
    </section>
  );
}
