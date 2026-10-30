import IndiaStateChart from '../components/maps/IndiaStateChart';
import { useDashboardData } from '../hooks/useDashboardData';

export default function IndiaIntelligencePanel() {
  const { selectedYear } = useDashboardData();
  return (
    <div className="tc-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">EXPLORE / INDIA</span>
          <h1>India Intelligence</h1>
          <p>Historical state emissions, source-linked estimates, and a ranked geographic comparison.</p>
        </div>
        <span className="tc-history-indicator"><i /> HISTORICAL / {selectedYear}</span>
      </header>
      <div className="tc-india-intro">
        <strong>State coverage is source- and year-dependent.</strong>
        <span>Climate TRACE admin-level non-forest CO₂e estimates power the map from 2021 onward. Earlier years use the supplied undated per-capita snapshot; historical totals and trends are not inferred where source records are unavailable.</span>
      </div>
      <IndiaStateChart />
    </div>
  );
}
