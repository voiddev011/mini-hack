import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer" id="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link to="/" className="footer-brand-link" aria-label="TrustCarbon home">
            <img className="footer-brand-logo" src="/assets/trustcarbon-fingerprint.png" alt="TrustCarbon logo" />
            <span className="brand-name">TrustCarbon</span>
          </Link>
          <span className="brand-tagline">Measure. Reduce. Sustain.</span>
        </div>

        <div className="footer-cols">
          <div className="footer-col">
            <h4>Explore</h4>
            <Link to="/explore/global">Global Explorer</Link>
            <Link to="/explore/india">India Intelligence</Link>
            <Link to="/explore/industries">Industries</Link>
          </div>
          <div className="footer-col">
            <h4>Datasets</h4>
            <Link to="/data/sources">Data Sources</Link>
            <Link to="/data/trust-scores">Trust Scores</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/login">Login</Link>
            <Link to="/dashboard">Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} TrustCarbon. Historical context by Our World in Data; detailed sources by Climate TRACE.</span>
      </div>
    </footer>
  );
}
