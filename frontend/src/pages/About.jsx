import React from 'react';

export default function About() {
  return (
    <div className="page-container">
      <div className="placeholder-page" style={{ maxWidth: '800px' }}>
        <h1>About TrustCarbon</h1>
        <p>
          TrustCarbon is a carbon emissions analytics platform designed to turn environmental information into measurable insight. We believe that tracking carbon outputs should be as rigorous, scientific, and traceable as financial auditing.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'left', marginTop: '40px' }}>
          <div className="kpi-card">
            <span className="kpi-label">Our Philosophy</span>
            <div className="kpi-value" style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0 12px' }}>
              Data-Driven Auditing
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              We build tools to make emissions calculations traceable, ensuring every report is backed by audit-ready cryptographic data chains.
            </p>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Our Objective</span>
            <div className="kpi-value" style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0 12px' }}>
              Measurable Action
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Beyond simple tracking, TrustCarbon focuses on identifying actionable reductions, modeling future trends, and planning effective corporate strategies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
