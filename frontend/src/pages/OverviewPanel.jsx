import { Link } from 'react-router-dom';
export default function OverviewPanel() {
  return (
    <div className="tc-landing">
      <img className="tc-leaf tc-leaf-left" src="/assets/leaves.png" alt="" />
      <img className="tc-leaf tc-leaf-center" src="/assets/leaf2.png" alt="" />
      <img className="tc-leaf tc-leaf-right" src="/assets/leaf3.png" alt="" />
      <section className="tc-hero-copy">
        <span className="tc-hero-badge">→&nbsp; Real Data. Real Emissions. Real Insight.</span>
        <h1>Turn Carbon Data<br />Into <em>Action.</em></h1>
        <p>Explore 195 countries across 28 states with historical emissions from 1990 to 2025. Built on real CSV data — no estimates, no projections.</p>
        <div className="tc-hero-actions"><Link to="/explore/global" className="tc-primary-action">Explore Global Data <span>→</span></Link><Link to="/dashboard" className="tc-secondary-action">Personal Carbon Tracker</Link></div>
        <div className="tc-hero-note">ANALYZE DATA. ACT FASTER. CREATE IMPACT.</div>
      </section>
      <section className="tc-earth-stage" aria-label="Global climate data coverage">
        <div className="tc-orbit tc-orbit-a" /><div className="tc-orbit tc-orbit-b" /><div className="tc-orbit tc-orbit-c" />
        <i className="tc-orbit-dot tc-dot-a" /><i className="tc-orbit-dot tc-dot-b" /><i className="tc-orbit-dot tc-dot-c" />
        <img className="tc-earth-image" src="/earth.png" alt="Illustration of Earth" />
        <article className="tc-metric tc-metric-countries"><span>COUNTRIES</span><strong>195</strong></article>
        <article className="tc-metric tc-metric-since"><span>DATA SINCE</span><strong>1990</strong></article>
        <article className="tc-metric tc-metric-states"><span>STATES</span><strong>28</strong></article>
        <article className="tc-metric tc-metric-latest"><span>LATEST</span><strong>2025</strong></article>
      </section>
    </div>
  );
}
