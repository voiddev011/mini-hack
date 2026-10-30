import BRSRDocumentImport from "../components/corporate/BRSRDocumentImport";
import CorporateCompanyBar from "../components/corporate/CorporateCompanyBar";
import { useCorporateIntelligence } from "../hooks/useCorporateIntelligence";

const METRICS = [
  ["scope1", "Scope 1 greenhouse-gas emissions"],
  ["scope2", "Scope 2 greenhouse-gas emissions"],
  ["scope3", "Scope 3 greenhouse-gas emissions"],
  ["reportedTotal", "Total reported greenhouse-gas emissions"],
  ["emissionsIntensity", "Emissions intensity"],
  ["totalEnergy", "Total energy consumption"],
  ["renewableEnergy", "Renewable-energy information"],
];

export default function BRSRPanel() {
  const { company, reportingYear, currentReport } = useCorporateIntelligence();
  const values = currentReport?.confirmedMetrics || {};

  return (
    <div className="tc-page tc-corporate-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">
            CORPORATE / PUBLIC COMPANY DISCLOSURES
          </span>
          <h1>BRSR</h1>
          <p>
            SEBI’s Business Responsibility and Sustainability Reporting format
            organizes company disclosures, including environmental indicators
            under Principle 6. Metrics and boundaries vary by report and year.
          </p>
        </div>
        <span className="tc-stage-tag">DOCUMENT-BASED</span>
      </header>
      <CorporateCompanyBar />
      <section className="tc-panel tc-method-note">
        <strong>Source and regulatory context</strong>
        <span>
          SEBI publishes the BRSR format and BRSR Core disclosure framework.
          This workspace extracts text from a user-selected PDF only; it does
          not retrieve confidential filings, bypass access controls, or claim
          assurance. See the{" "}
          <a
            href="https://www.sebi.gov.in/sebi_data/commondocs/jul-2023/Annexure_II-Updated-BRSR_p.PDF"
            target="_blank"
            rel="noreferrer"
          >
            official BRSR reporting format ↗
          </a>{" "}
          and the{" "}
          <a
            href="https://www.sebi.gov.in/legal/circulars/jul-2023/brsr-core-framework-for-assurance-and-esg-disclosures-for-value-chain_73854.html"
            target="_blank"
            rel="noreferrer"
          >
            SEBI BRSR Core circular ↗
          </a>
          .
        </span>
      </section>
      <section className="tc-panel">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">COMPANY / {reportingYear}</span>
            <h2>{company}</h2>
          </div>
          <span className="tc-unit-tag">
            {currentReport ? "USER-IMPORTED REPORT" : "DATA UNAVAILABLE"}
          </span>
        </div>
        <div className="tc-brsr-metric-grid">
          {METRICS.map(([key, label]) => {
            const metric = values[key];
            return (
              <article key={key}>
                <span>{label}</span>
                <strong>
                  {Number.isFinite(metric?.value)
                    ? `${metric.value.toLocaleString()} ${metric.unit}`
                    : "Data unavailable"}
                </strong>
                <small>
                  {metric
                    ? `Reported by company · ${metric.source} · page ${metric.page} · ${metric.reportingColumn || reportingYear}`
                    : "Not reported or not confirmed in the selected report"}
                </small>
                {metric && <small>{metric.confirmation}</small>}
              </article>
            );
          })}
        </div>
      </section>
      <BRSRDocumentImport />
      <p className="tc-page-footnote">
        Data status distinguishes unreviewed extraction candidates from
        user-confirmed values. Confirming a candidate records the company
        statement, source PDF, page and table row; it does not constitute
        independent assurance or a TrustCarbon calculation.
      </p>
    </div>
  );
}
