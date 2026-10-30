import { useDashboardData } from '../hooks/useDashboardData';
import CountryExplorer from '../components/CountryExplorer';

export default function GlobalExplorerPanel() {
  const { data, loading, error, selectedYear, setSelectedYear } = useDashboardData();

  return (
    <div className="tc-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">EXPLORE / GLOBAL</span>
          <h1>Global Explorer</h1>
          <p>Explore carbon emissions across countries, compare historical trends, and understand global emissions patterns.</p>
        </div>
        <span className="tc-history-indicator"><i /> HISTORICAL SERIES</span>
      </header>
      {loading && <div className="tc-state-card" role="status">Loading global country records…</div>}
      {error && <div className="tc-state-card tc-error" role="alert">{error}</div>}
      {data && (
        <>
          {data.sourceWarning && <div className="tc-source-warning" role="status">{data.sourceWarning}</div>}
          <div className="tc-data-banner">
            <span><i /> PRIMARY SOURCE</span>
            <strong>{data.source}</strong>
            <small>Country emissions · per capita · yearly history</small>
          </div>
          <CountryExplorer data={data} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />
        </>
      )}
    </div>
  );
}
