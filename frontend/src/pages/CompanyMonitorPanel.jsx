import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { calculateCorporateAnalysis } from "../analysis/corporateAnalysis";
import BRSRDocumentImport from "../components/corporate/BRSRDocumentImport";
import CorporateCompanyBar from "../components/corporate/CorporateCompanyBar";
import ThresholdAlerts from "../components/corporate/ThresholdAlerts";
import { useCompanyAlerts } from "../hooks/useCompanyAlerts";
import { useDashboardData } from "../hooks/useDashboardData";
import { useCorporateIntelligence } from "../hooks/useCorporateIntelligence";
import { getCompanyFacilityMatches } from "../services/climateTraceCorporateService";
import {
  downloadCorporateReport,
  printCorporateReport,
} from "../services/corporateReportService";

const metricLabels = [
  ["scope1", "Scope 1 emissions"],
  ["scope2", "Scope 2 emissions"],
  ["scope3", "Scope 3 emissions"],
  ["reportedTotal", "Total reported GHG emissions"],
  ["emissionsIntensity", "Emissions intensity"],
  ["totalEnergy", "Total energy consumption"],
  ["renewableEnergy", "Renewable energy consumption"],
];

function displayMetric(metric) {
  return Number.isFinite(metric?.value)
    ? `${metric.value.toLocaleString()} ${metric.unit}`
    : "Data unavailable";
}

function createEmailBody(analysis, recipient, dashboardUrl) {
  const current = analysis.currentMetrics;
  const issue =
    analysis.alerts
      .map((alert) => `- ${alert.title}: ${alert.explanation}`)
      .join("\n") ||
    "No configured alert threshold was met; available data may be limited.";
  const summary = metricLabels
    .map(
      ([key, label]) =>
        `${label}: ${displayMetric(current[key])}${current[key] ? ` (${current[key].source}, page ${current[key].page})` : ""}`,
    )
    .join("\n");
  const recommendations = analysis.recommendations
    .map(
      (item, index) =>
        `${index + 1}. ${item.title}\nReason: ${item.reason}\nScenario: ${item.scenario}\nEstimated impact: ${item.estimatedImpact}`,
    )
    .join("\n\n");
  return {
    recipient,
    subject: `TrustCarbon company analysis · ${analysis.company}`,
    body: `Company: ${analysis.company}\nReporting year: ${analysis.report?.reportingYear || "Not reported"}\n\nEmissions summary (reported values are from the cited company document):\n${summary}\n\nDetected issues:\n${issue}\n\nBenchmark / official target:\n${analysis.benchmarkComparable ? `TrustCarbon Benchmark ${analysis.benchmarkValue} ${analysis.intensityUnit}; intensity gap ${analysis.intensityGap.toFixed(3)} ${analysis.intensityUnit}.` : "No comparable TrustCarbon Benchmark configured."}\n${analysis.complianceStatus}\n\nTrustCarbon analysis:\n${analysis.score === null ? "Corporate carbon pressure: Data unavailable." : `Corporate carbon pressure: ${analysis.score}/100 (${analysis.scoreLevel}); TrustCarbon-created, not an official rating.`}\n\nRecommended actions:\n${recommendations}\n\nDashboard/report link: ${dashboardUrl}\nThis is descriptive TrustCarbon analysis, not legal advice, an official rating, or a government requirement.`,
  };
}

export default function CompanyMonitorPanel() {
  const { selectedYear } = useDashboardData();
  const {
    company,
    currentReport,
    reports,
    benchmark,
    greenScenario,
    newDataAlert,
  } = useCorporateIntelligence();
  const [facilityMatches, setFacilityMatches] = useState([]);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [facilityError, setFacilityError] = useState("");
  const [recipient, setRecipient] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [printError, setPrintError] = useState("");

  useEffect(() => {
    if (selectedYear < 2015 || !company.trim()) {
      setFacilityMatches([]);
      setFacilityError("");
      setFacilityLoading(false);
      return undefined;
    }
    let active = true;
    setFacilityLoading(true);
    setFacilityError("");
    getCompanyFacilityMatches(company, selectedYear)
      .then((rows) => {
        if (active) setFacilityMatches(rows);
      })
      .catch((error) => {
        if (active)
          setFacilityError(
            error.message || "Climate TRACE sources could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setFacilityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [company, selectedYear]);

  const baseAnalysis = useMemo(
    () =>
      calculateCorporateAnalysis({
        company,
        report: currentReport,
        reports,
        facilityMatches,
        benchmark,
      }),
    [company, currentReport, reports, facilityMatches, benchmark],
  );
  const thresholdAlerts = useCompanyAlerts(baseAnalysis);
  const analysis = useMemo(
    () => ({ ...baseAnalysis, thresholdAlerts: thresholdAlerts.triggered }),
    [baseAnalysis, thresholdAlerts.triggered],
  );
  const industry = facilityMatches.length
    ? `${facilityMatches[0].sector} / ${facilityMatches[0].subsector} · Climate TRACE facility categorization`
    : "Data unavailable";

  const generateEmail = () => {
    if (!recipient.trim() || !recipient.includes("@")) return;
    setGeneratedEmail(
      createEmailBody(
        analysis,
        recipient.trim(),
        `${window.location.origin}/corporate/monitor`,
      ),
    );
  };
  const openEmail = () => {
    if (!generatedEmail) return;
    const mailto = `mailto:${encodeURIComponent(generatedEmail.recipient)}?subject=${encodeURIComponent(generatedEmail.subject)}&body=${encodeURIComponent(generatedEmail.body)}`;
    window.location.assign(mailto);
  };

  return (
    <div className="tc-page tc-corporate-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">CORPORATE / COMPANY INTELLIGENCE</span>
          <h1>Company Monitor</h1>
          <p>
            Company disclosures, named-source estimates and TrustCarbon
            calculations are kept separate by source and reporting boundary.
          </p>
        </div>
        <span className="tc-stage-tag">NO OFFICIAL RATING</span>
      </header>
      <CorporateCompanyBar />

      <section className="tc-kpi-grid tc-corporate-kpis">
        {metricLabels.slice(0, 4).map(([key, label]) => (
          <article className="tc-kpi-card" key={key}>
            <span>{label.toUpperCase()}</span>
            <strong>
              {analysis.currentMetrics[key]
                ? displayMetric(analysis.currentMetrics[key])
                : "Data unavailable"}
            </strong>
            <small>
              {analysis.currentMetrics[key]
                ? `Reported by company · ${analysis.currentMetrics[key].source} · ${analysis.currentMetrics[key].reportingColumn || currentReport?.reportingYear || "reporting period not confirmed"}`
                : "Not reported in the selected document"}
            </small>
          </article>
        ))}
      </section>

      <section className="tc-corporate-grid">
        <article className="tc-panel">
          <div className="tc-panel-heading">
            <div>
              <span className="tc-eyebrow">COMPANY PROFILE</span>
              <h2>{company || "Company not selected"}</h2>
            </div>
          </div>
          <dl className="tc-corporate-facts">
            <div>
              <dt>Industry</dt>
              <dd>{industry}</dd>
            </div>
            <div>
              <dt>Reporting year</dt>
              <dd>{currentReport?.reportingYear || "Not reported"}</dd>
            </div>
            <div>
              <dt>Disclosure source</dt>
              <dd>
                {currentReport?.sourceUrl ||
                  currentReport?.fileName ||
                  "Data unavailable"}
              </dd>
            </div>
            <div>
              <dt>Data status</dt>
              <dd>
                {currentReport
                  ? "User-confirmed report extraction; not independently verified"
                  : "No BRSR document loaded"}
              </dd>
            </div>
            <div>
              <dt>Corporate inventory total</dt>
              <dd>
                {analysis.currentMetrics.reportedTotal
                  ? displayMetric(analysis.currentMetrics.reportedTotal)
                  : "Data unavailable"}
              </dd>
            </div>
            <div>
              <dt>TrustCarbon Scope 1+2 subtotal</dt>
              <dd>
                {analysis.latestTotal?.kind === "scope_1_2_subtotal"
                  ? `${(analysis.latestTotal.value / 1e6).toFixed(3)} Mt CO₂e · Calculated by TrustCarbon`
                  : "Not calculated"}
              </dd>
            </div>
          </dl>
          <p className="tc-data-boundary-note">
            A Scope 1+2 subtotal excludes Scope 3 and is not displayed as a
            company-wide total. Metrics and units are shown as extracted from
            the selected report; verify table boundary and period.
          </p>
        </article>
        <article className="tc-panel tc-corporate-score-card">
          <div className="tc-panel-heading">
            <div>
              <span className="tc-eyebrow">
                TRUSTCARBON-CREATED / NOT OFFICIAL
              </span>
              <h2>Corporate carbon pressure</h2>
            </div>
          </div>
          {analysis.score === null ? (
            <strong className="tc-corporate-score-unavailable">
              Data unavailable
            </strong>
          ) : (
            <strong
              className={`tc-corporate-score tc-score-${analysis.scoreLevel.toLowerCase()}`}
            >
              {analysis.score}
              <small> / 100 · {analysis.scoreLevel}</small>
            </strong>
          )}
          <p>
            Weighted mean of the available dimensions, re-normalized over the
            weights shown. Missing disclosure increases the completeness risk
            component; it does not prove high emissions.
          </p>
          <div className="tc-score-dimensions">
            {analysis.scoreDimensions.map((dimension) => (
              <div key={dimension.key}>
                <span>{dimension.label}</span>
                <b>{dimension.pressure.toFixed(0)} / 100 risk pressure</b>
                <small>
                  Weight {dimension.weight} · {dimension.evidence} ·{" "}
                  {dimension.source}
                </small>
              </div>
            ))}
            {analysis.scoreDimensions.length === 0 && (
              <p>No score dimensions have enough source data.</p>
            )}
          </div>
        </article>
      </section>

      <BRSRDocumentImport />
      <ThresholdAlerts
        key={company}
        alerts={thresholdAlerts}
        analysis={baseAnalysis}
      />

      <section className="tc-panel tc-facility-panel">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">
              DETAILED SOURCE LAYER / {selectedYear}
            </span>
            <h2>Climate TRACE named-facility matches</h2>
          </div>
          <span className="tc-unit-tag">
            India · top 100 ranked source records
          </span>
        </div>
        {facilityLoading && (
          <p role="status">Checking Climate TRACE’s ranked source sample…</p>
        )}
        {facilityError && (
          <p className="tc-error" role="alert">
            {facilityError}
          </p>
        )}
        {!facilityLoading &&
          !facilityError &&
          (facilityMatches.length ? (
            <div className="tc-facility-match-list">
              {facilityMatches.map((source) => (
                <article key={source.id}>
                  <strong>{source.name}</strong>
                  <b>
                    {source.emissionsMt === null
                      ? "Data unavailable"
                      : `${source.emissionsMt.toFixed(2)} Mt CO₂e`}
                  </b>
                  <span>
                    {source.sector} · {source.subsector} · {source.year} ·
                    Climate TRACE source estimate
                  </span>
                  <small>
                    Named facility only. This 100-record ranked sample is
                    incomplete; company ownership, reporting boundary and Scope
                    classification are not inferred.
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p className="tc-empty-note">
              No name-matched record was found in the top 100 returned India
              source records for {selectedYear}. This is not evidence that the
              company has no emitting facilities.
            </p>
          ))}
        <a
          className="tc-text-link"
          href="https://api.climatetrace.org/v7/docs/index.html"
          target="_blank"
          rel="noreferrer"
        >
          Climate TRACE API methodology ↗
        </a>
      </section>

      <section className="tc-panel tc-monitoring-status">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">PUBLIC-SOURCE MONITORING</span>
            <h2>Source update status</h2>
          </div>
          <span className="tc-unit-tag">Manual source intake</span>
        </div>
        <p>
          <strong>Automated filing polling is not enabled.</strong> No reliable
          company-wide official BRSR update feed or scheduled backend monitor is
          configured in this project. TrustCarbon does not scrape company
          websites on a timer or claim that filings were automatically detected.
        </p>
        <p>
          The current ingestion path is: user supplies a public BRSR PDF → local
          text extraction → user confirms source rows → configured in-app
          thresholds are evaluated. The source update record below describes
          only a manual import.
        </p>
        {newDataAlert?.company.trim().toLowerCase() ===
          company.trim().toLowerCase() && (
          <small>
            Latest manual import: {newDataAlert.reportingYear} ·{" "}
            {newDataAlert.source} · {newDataAlert.status}
          </small>
        )}
      </section>

      {newDataAlert?.company.trim().toLowerCase() ===
        company.trim().toLowerCase() && (
        <section className="tc-panel tc-new-corporate-data">
          <span className="tc-eyebrow">NEW CORPORATE DATA / MANUAL IMPORT</span>
          <strong>
            {newDataAlert.company} · {newDataAlert.reportingYear}
          </strong>
          <p>
            {newDataAlert.metrics.length} candidate disclosure metric(s)
            detected · {newDataAlert.source}
          </p>
          <small>
            This status records the user’s PDF import in this browser session.
          </small>
        </section>
      )}

      <section className="tc-panel tc-alert-panel">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">CORPORATE ALERTS</span>
            <h2>Detected issues</h2>
          </div>
          <span className="tc-unit-tag">{analysis.alerts.length} alerts</span>
        </div>
        {analysis.alerts.length ? (
          analysis.alerts.map((alert) => (
            <article
              key={`${alert.type}-${alert.title}`}
              className="tc-corporate-alert"
            >
              <span className={`tc-severity tc-severity-${alert.severity}`}>
                ⚠ {alert.severity}
              </span>
              <div>
                <strong>{alert.title}</strong>
                <p>{alert.explanation}</p>
              </div>
              <Link to="/corporate/compliance">View analysis →</Link>
            </article>
          ))
        ) : (
          <p className="tc-empty-note">
            No configured increase, anomaly, or TrustCarbon Benchmark alert can
            be calculated from the currently loaded data.
          </p>
        )}
      </section>

      <section className="tc-panel tc-action-plan">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">BASED ON AVAILABLE COMPANY DATA</span>
            <h2>TrustCarbon Action Plan</h2>
          </div>
          <span className="tc-unit-tag">
            Recommendations · not requirements
          </span>
        </div>
        {analysis.recommendations.map((item, index) => (
          <article key={item.key}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>
                {item.label} · {item.title}
              </strong>
              <p>
                <b>Reason:</b> {item.reason}
              </p>
              <p>
                <b>Current metric:</b> {item.currentMetric}
              </p>
              <p>
                <b>Target/scenario:</b> {item.scenario}
              </p>
              <small>
                <b>Estimated impact:</b> {item.estimatedImpact}
              </small>
            </div>
          </article>
        ))}
      </section>

      <section className="tc-panel tc-corporate-deliverables">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">REPORTING / OPTIONAL OUTREACH</span>
            <h2>Share a source-labelled analysis</h2>
          </div>
        </div>
        <div className="tc-corporate-deliverable-actions">
          <button
            type="button"
            className="tc-outline-action"
            onClick={() =>
              downloadCorporateReport(analysis, {
                complianceStatus: analysis.complianceStatus,
                officialTargetStatus:
                  "No company-specific official target and applicability verified by TrustCarbon.",
                greenScenario:
                  greenScenario?.company === company
                    ? `${greenScenario.formula}; estimated ${greenScenario.estimatedTrees.toLocaleString()} trees. No CO₂ or Green Credit conversion.`
                    : "No scenario configured. Green Credits are not treated as carbon credits or offsets.",
                industry,
              })
            }
          >
            Download corporate carbon report
          </button>
          <button
            type="button"
            className="tc-outline-action"
            onClick={() => {
              setPrintError("");
              try {
                printCorporateReport(analysis, {
                  industry,
                  greenScenario:
                    greenScenario?.company === company
                      ? `${greenScenario.formula}; estimated ${greenScenario.estimatedTrees.toLocaleString()} trees. No CO₂ or Green Credit conversion.`
                      : undefined,
                });
              } catch (error) {
                setPrintError(error.message);
              }
            }}
          >
            Save as PDF
          </button>
          <label>
            EXPLICIT RECIPIENT EMAIL
            <input
              type="email"
              value={recipient}
              onChange={(event) => {
                setRecipient(event.target.value);
                setGeneratedEmail(null);
              }}
              placeholder="name@company.com"
            />
          </label>
          <button
            type="button"
            className="tc-outline-action"
            disabled={!recipient.includes("@")}
            onClick={generateEmail}
          >
            Generate email
          </button>
          <button
            type="button"
            className="tc-outline-action"
            disabled={!generatedEmail}
            onClick={openEmail}
          >
            Open in email app
          </button>
        </div>
        {generatedEmail && (
          <div className="tc-generated-email">
            <strong>
              {generatedEmail.subject} · To: {generatedEmail.recipient}
            </strong>
            <textarea
              readOnly
              value={generatedEmail.body}
              aria-label="Generated corporate carbon email"
            />
            <small>
              Nothing is sent automatically. “Open in email app” starts a draft
              addressed only to the email you entered.
            </small>
          </div>
        )}
        {printError && (
          <p role="alert" className="tc-error">
            {printError}
          </p>
        )}
        <p className="tc-page-footnote">
          Choose Save as PDF in your browser’s print dialog. No email delivery
          integration is configured. The report is generated locally. BRSR
          metrics and PDF files stay in this browser session.
        </p>
      </section>
    </div>
  );
}
