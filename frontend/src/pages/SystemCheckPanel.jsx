import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDashboardData } from '../hooks/useDashboardData';
import { runSystemChecks } from '../services/systemCheckService';

export default function SystemCheckPanel() {
  const { user } = useAuth();
  const { data, loading, error } = useDashboardData();
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);
  const check = async () => {
    setRunning(true);
    try {
      const checks = await runSystemChecks(user);
      setReport({ checkedAt: new Date().toISOString(), scope: 'Read-only connectivity checks. CRUD, storage and account isolation require the demonstration checklist.', checks });
    } catch (failure) {
      setReport({ checkedAt: new Date().toISOString(), checks: [{ name: 'System check', status: 'fail', detail: failure.message }] });
    } finally { setRunning(false); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'trustcarbon-connection-evidence.json'; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="tc-page">
    <header className="tc-page-heading"><div><span className="tc-eyebrow">SYSTEM STATUS</span><h1>Connection checks</h1><p>Check the backend and database before your demonstration, then download the results.</p></div></header>
    <section className="tc-panel"><h2>Historical data</h2><p role="status">{loading ? 'Loading source records…' : error || (data ? data.source + ' loaded with ' + data.rows.length.toLocaleString() + ' observations.' : 'No records loaded.')}</p>{data?.sourceWarning && <p className="tc-source-warning">{data.sourceWarning}</p>}</section>
    <section className="tc-panel"><h2>Account and database</h2><p>Checks use your current account and leave saved records unchanged.</p>
      {!user && <p><Link to="/login">Sign in</Link> to verify the authenticated backend and database reads.</p>}
      <div className="tc-check-actions"><button className="tc-outline-action" type="button" disabled={running} onClick={check}>{running ? 'Checking connections…' : 'Run connection checks'}</button>{report && <button className="tc-outline-action" type="button" onClick={download}>Download evidence</button>}</div>
      {report && <><p>Checked: {new Date(report.checkedAt).toLocaleString()}</p><ul className="tc-check-list" aria-live="polite">{report.checks.map(row => <li key={row.name}><strong>{row.name}</strong><span className={'tc-check-status tc-check-' + row.status}>{row.status.toUpperCase()}{row.durationMs != null ? ' / ' + row.durationMs + ' ms' : ''}</span><p>{row.detail}</p></li>)}</ul></>}
      <p className="tc-source-line">Successful reads confirm connectivity. Demonstrate activity save and reload, dataset upload and review, and separation between two accounts to prove the complete integration.</p>
    </section>
  </div>;
}
