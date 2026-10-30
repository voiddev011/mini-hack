import React from 'react';

export default function Resources() {
  return (
    <div className="page-container">
      <div className="section-head">
        <h2>Your Data. Verified.</h2>
        <p>Every emission record is linked through a cryptographic hash chain, making unauthorized changes detectable.</p>
      </div>

      <div className="chain" role="img" aria-label="Diagram showing an emission record producing a SHA-256 hash, linking to the next record, and ending in a verified integrity check">
        <div className="chain-node">
          <span className="chain-label">Emission Record</span>
        </div>
        <div className="chain-link"></div>
        <div className="chain-node chain-hash">
          <span className="chain-label">SHA-256 Hash</span>
          <code>7f83b1657ff1</code>
        </div>
        <div className="chain-link"></div>
        <div className="chain-node">
          <span className="chain-label">Next Record</span>
        </div>
        <div className="chain-link"></div>
        <div className="chain-node chain-hash">
          <span className="chain-label">SHA-256 Hash</span>
          <code>e3b0c44298fc</code>
        </div>
        <div className="chain-link"></div>
        <div className="chain-node">
          <span className="chain-label">Next Record</span>
        </div>
        <div className="chain-link"></div>
        <div className="chain-node chain-verified">
          <span className="check">✓</span>
          <span className="chain-label">Integrity Verified</span>
        </div>
      </div>

      <div style={{ marginTop: '56px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Methodology & Standards</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '14px', lineHeight: '1.7' }}>
          TrustCarbon uses the Greenhouse Gas Protocol (GHG Protocol) corporate standard as its foundation. Once datasets are connected, calculations will cover Scope 1 (direct emissions), Scope 2 (indirect utilities), and Scope 3 (value chain actions) parameters.
        </p>
      </div>
    </div>
  );
}
