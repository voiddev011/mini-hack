import { useMemo, useState } from 'react';
import { calculateRestorationScenario } from '../analysis/corporateAnalysis';
import { calculateCorporateAnalysis } from '../analysis/corporateAnalysis';
import CorporateCompanyBar from '../components/corporate/CorporateCompanyBar';
import { useCorporateIntelligence } from '../hooks/useCorporateIntelligence';

export default function GreenCreditPanel() {
  const { company, currentReport, reports, benchmark, greenScenario, setGreenScenario } = useCorporateIntelligence();
  const analysis = useMemo(() => calculateCorporateAnalysis({
    company, report: currentReport, reports, benchmark,
  }), [company, currentReport, reports, benchmark]);
  const [areaHectares, setAreaHectares] = useState(greenScenario?.areaHectares ?? 1);
  const [treesPerHectare, setTreesPerHectare] = useState(greenScenario?.treesPerHectare ?? 400);
  const scenario = calculateRestorationScenario({
    areaHectares: Number(areaHectares),
    treesPerHectare: Number(treesPerHectare),
  });
  const emissionsGap = analysis.benchmarkComparable && analysis.intensityGap > 0
    ? `${analysis.intensityGap.toFixed(4)} ${analysis.intensityUnit} above TrustCarbon Benchmark`
    : 'No compatible company intensity gap available';

  const saveScenario = (event) => {
    event.preventDefault();
    if (scenario) setGreenScenario({
      ...scenario,
      company,
      reportingYear: currentReport?.reportingYear || 'Not reported',
      assumption: 'User-entered land area and planting density; does not estimate CO₂ removals or credit eligibility.',
    });
  };

  return (
    <div className="tc-page tc-corporate-page">
      <header className="tc-page-heading"><div><span className="tc-eyebrow">CORPORATE / RESTORATION PATHWAY</span><h1>Green Credit Scenario</h1><p>Explore an assumed restoration activity while keeping planting estimates, Green Credit eligibility and carbon accounting separate.</p></div><span className="tc-stage-tag">NOT A CARBON OFFSET</span></header>
      <CorporateCompanyBar />

      <section className="tc-panel tc-green-credit-context">
        <div className="tc-panel-heading"><div><span className="tc-eyebrow">OFFICIAL GREEN CREDIT PROGRAMME</span><h2>Activity pathway, not an emissions conversion</h2></div></div>
        <p>India’s Green Credit Programme is a separate environmental-activity framework. Tree plantation/restoration activities must follow the official activity methodology, eligibility, registration, monitoring and verification requirements. A TrustCarbon scenario cannot determine registration, credit issuance, survival or sequestration.</p>
        <div className="tc-brsr-source-links">
          <a href="https://www.moefcc-gcp.in/" target="_blank" rel="noreferrer">Official Green Credit Programme portal ↗</a>
          <a href="https://www.moef.gov.in/" target="_blank" rel="noreferrer">Ministry of Environment, Forest and Climate Change ↗</a>
          <a href="https://egazette.gov.in/" target="_blank" rel="noreferrer">Government of India e-Gazette ↗</a>
        </div>
        <div className="tc-green-distinction">
          <strong>Green Credits are not carbon credits.</strong>
          <span>This panel does not convert trees into tonnes of CO₂e, convert emissions gaps into a tree obligation, or claim that Green Credits are carbon offsets.</span>
        </div>
      </section>

      <section className="tc-panel">
        <div className="tc-panel-heading"><div><span className="tc-eyebrow">USER-DEFINED INPUTS</span><h2>Restoration area scenario</h2></div><span className="tc-unit-tag">TrustCarbon Scenario · not forecast</span></div>
        <form className="tc-benchmark-form" onSubmit={saveScenario}>
          <label>LAND AREA (HECTARES)<input type="number" min="0.01" max="100000" step="any" value={areaHectares} onChange={(event) => setAreaHectares(event.target.value)} required /></label>
          <label>ASSUMED TREES PER HECTARE<input type="number" min="1" max="100000" step="1" value={treesPerHectare} onChange={(event) => setTreesPerHectare(event.target.value)} required /></label>
          <button type="submit" className="tc-outline-action" disabled={!scenario}>Save scenario for company report</button>
        </form>
        <div className="tc-green-scenario-flow">
          <article><span>CURRENT INTENSITY GAP</span><strong>{emissionsGap}</strong><small>Comparison only; not represented as an offset obligation.</small></article>
          <i aria-hidden="true">↓</i>
          <article><span>POTENTIAL RESTORATION ACTION</span><strong>{scenario ? `${scenario.areaHectares.toLocaleString()} ha assumed` : 'Enter valid area assumptions'}</strong><small>Site suitability, permissions and the official methodology require separate review.</small></article>
          <i aria-hidden="true">↓</i>
          <article><span>ESTIMATED TREE PLANTATION</span><strong>{scenario ? `${scenario.estimatedTrees.toLocaleString()} trees` : 'Not calculated'}</strong><small>{scenario?.formula || 'area × user-selected density'} · user-defined scenario estimate only.</small></article>
          <i aria-hidden="true">↓</i>
          <article><span>POTENTIAL GREEN CREDIT PATHWAY</span><strong>Eligibility and units not calculated</strong><small>Follow the current official activity method and verification process; TrustCarbon has not established credit issuance.</small></article>
        </div>
        {greenScenario?.company === company && (
          <p className="tc-brsr-confirmed-note" role="status">Saved for report: {greenScenario.estimatedTrees.toLocaleString()} estimated trees · {greenScenario.areaHectares} ha × {greenScenario.treesPerHectare} assumed trees/ha · no CO₂ or credit conversion.</p>
        )}
      </section>
      <section className="tc-panel tc-method-note"><strong>No compensation calculation</strong><span>{company}’s current emissions or intensity are not converted to trees. Tree count is calculated only from user-entered area and density: hectares × assumed trees/hectare.</span></section>
    </div>
  );
}
