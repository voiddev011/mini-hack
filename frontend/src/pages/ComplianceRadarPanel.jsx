import { useMemo, useState } from "react";
import { calculateCorporateAnalysis } from "../analysis/corporateAnalysis";
import CorporateCompanyBar from "../components/corporate/CorporateCompanyBar";
import { useCorporateIntelligence } from "../hooks/useCorporateIntelligence";

const BEE_CCTS_URL = "https://beeindia.gov.in/en/programmes/carbon-market";
const MINISTRY_CCTS_URL = "https://powermin.gov.in/";

export default function ComplianceRadarPanel() {
  const { company, currentReport, reports, benchmark, setBenchmark } =
    useCorporateIntelligence();
  const analysis = useMemo(
    () =>
      calculateCorporateAnalysis({
        company,
        report: currentReport,
        reports,
        benchmark,
      }),
    [company, currentReport, reports, benchmark],
  );
  const [benchmarkValue, setBenchmarkValue] = useState(benchmark?.value ?? "");
  const [benchmarkUnit, setBenchmarkUnit] = useState(
    benchmark?.unit ??
      currentReport?.confirmedMetrics?.emissionsIntensity?.unit ??
      "",
  );
  const [benchmarkIndustry, setBenchmarkIndustry] = useState(
    benchmark?.industry ?? "",
  );

  const saveBenchmark = (event) => {
    event.preventDefault();
    const value = Number(benchmarkValue);
    if (!Number.isFinite(value) || value <= 0 || !benchmarkUnit.trim()) return;
    setBenchmark({
      value,
      unit: benchmarkUnit.trim(),
      industry: benchmarkIndustry.trim() || "User-defined comparison group",
      label: "TrustCarbon Benchmark",
      source: "User-entered value; not a government target",
    });
  };

  return (
    <div className="tc-page tc-corporate-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">CORPORATE / REGULATORY CONTEXT</span>
          <h1>Compliance Radar</h1>
          <p>
            Shows sourced company intensity alongside clearly separated user
            benchmarks and official context. It does not determine legal
            compliance.
          </p>
        </div>
        <span className="tc-stage-tag">NO LEGAL DETERMINATION</span>
      </header>
      <CorporateCompanyBar />

      <section className="tc-panel tc-compliance-context">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">OFFICIAL FRAMEWORKS</span>
            <h2>Carbon Credit Trading Scheme context</h2>
          </div>
          <span className="tc-unit-tag">India · official sources</span>
        </div>
        <p>
          The BEE-administered Carbon Credit Trading Scheme and related
          greenhouse-gas emission-intensity targets apply according to official
          scheme instruments and designated-entity notifications. A company name
          match or a reported corporate-wide intensity is not enough to
          establish that a particular facility is obligated or which target
          applies.
        </p>
        <div className="tc-brsr-source-links">
          <a href={BEE_CCTS_URL} target="_blank" rel="noreferrer">
            Bureau of Energy Efficiency · Carbon Market ↗
          </a>
          <a href={MINISTRY_CCTS_URL} target="_blank" rel="noreferrer">
            Ministry of Power ↗
          </a>
          <a
            href="https://www.sebi.gov.in/legal/circulars/jul-2023/brsr-core-framework-for-assurance-and-esg-disclosures-for-value-chain_73854.html"
            target="_blank"
            rel="noreferrer"
          >
            SEBI BRSR Core circular ↗
          </a>
        </div>
        <div className="tc-official-target-state">
          <span className="tc-eyebrow">OFFICIAL REGULATORY TARGET</span>
          <strong>
            Data unavailable · no company/facility applicability and target
            record verified
          </strong>
          <p>
            No target, required improvement or legal compliance status is
            inferred from corporate emissions. Check the current BEE target
            notification and the entity’s designated-consumer status before
            using regulatory values.
          </p>
        </div>
      </section>

      <section className="tc-panel">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">
              TRUSTCARBON BENCHMARK / USER CONFIGURED
            </span>
            <h2>Intensity comparison</h2>
          </div>
          <span className="tc-unit-tag">Not a legal requirement</span>
        </div>
        <form className="tc-benchmark-form" onSubmit={saveBenchmark}>
          <label>
            BENCHMARK VALUE
            <input
              type="number"
              min="0"
              step="any"
              value={benchmarkValue}
              onChange={(event) => setBenchmarkValue(event.target.value)}
              required
            />
          </label>
          <label>
            UNIT / REPORTING BASIS
            <input
              value={benchmarkUnit}
              onChange={(event) => setBenchmarkUnit(event.target.value)}
              placeholder="Select from the company report exactly"
              required
            />
          </label>
          <label>
            INDUSTRY / COMPARISON GROUP
            <input
              value={benchmarkIndustry}
              onChange={(event) => setBenchmarkIndustry(event.target.value)}
              placeholder="User-defined peer group"
            />
          </label>
          <button type="submit" className="tc-outline-action">
            Save TrustCarbon Benchmark
          </button>
        </form>
        {benchmark && (
          <p className="tc-page-footnote">
            Active comparison: {benchmark.value} {benchmark.unit} ·{" "}
            {benchmark.industry} · {benchmark.source}. This user-entered figure
            has not been verified as an official target or industry statistic.
          </p>
        )}
      </section>

      <section className="tc-compliance-results">
        <article>
          <span>CURRENT INTENSITY</span>
          <strong>
            {Number.isFinite(analysis.intensityValue)
              ? `${analysis.intensityValue.toLocaleString()} ${analysis.intensityUnit}`
              : "Data unavailable"}
          </strong>
          <small>
            {currentReport?.confirmedMetrics?.emissionsIntensity
              ? `Reported by company · ${currentReport.confirmedMetrics.emissionsIntensity.source}, page ${currentReport.confirmedMetrics.emissionsIntensity.page}`
              : "Not reported or not confirmed"}
          </small>
        </article>
        <article>
          <span>OFFICIAL TARGET</span>
          <strong>Data unavailable</strong>
          <small>No verified target/applicability mapping</small>
        </article>
        <article>
          <span>TRUSTCARBON BENCHMARK</span>
          <strong>
            {benchmark
              ? `${benchmark.value} ${benchmark.unit}`
              : "Not configured"}
          </strong>
          <small>User-defined, not a government target</small>
        </article>
        <article>
          <span>GAP / REQUIRED IMPROVEMENT</span>
          <strong>
            {analysis.benchmarkComparable
              ? `${analysis.intensityGap > 0 ? "+" : ""}${analysis.intensityGap.toFixed(4)} ${analysis.intensityUnit}`
              : "Not calculated"}
          </strong>
          <small>
            {analysis.benchmarkComparable && analysis.intensityGap > 0
              ? `${analysis.requiredImprovementPercent.toFixed(1)}% to configured benchmark · TrustCarbon calculation`
              : "Requires a compatible reported metric and configured benchmark"}
          </small>
        </article>
        <article>
          <span>COMPLIANCE STATUS</span>
          <strong>Not assessed</strong>
          <small>Legal applicability and official target not verified</small>
        </article>
      </section>
      <section className="tc-panel tc-method-note">
        <strong>No emission-to-tree obligation</strong>
        <span>
          TrustCarbon does not claim that a company must plant trees because it
          emitted a quantity of greenhouse gases. A TrustCarbon Benchmark
          comparison is descriptive and is not a regulatory target.
        </span>
      </section>
    </div>
  );
}
