import React from 'react';

export default function ChartCard({
  title,
  subtitle,
  loading = false,
  empty = false,
  error = false,
  controls,
  children
}) {
  const renderState = () => {
    if (loading) {
      return (
        <div className="state-overlay">
          <div className="state-icon">⚡</div>
          <div className="state-title">Loading Carbon Data</div>
          <div className="state-desc">Retrieving environmental statistics...</div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="state-overlay">
          <div className="state-icon" style={{ color: 'var(--danger)' }}>⚠</div>
          <div className="state-title">Loading Failed</div>
          <div className="state-desc">Unable to load this carbon dataset. Please try again.</div>
        </div>
      );
    }

    if (empty) {
      return (
        <div className="state-overlay">
          <div className="state-icon">○</div>
          <div className="state-title">No Dataset Connected</div>
          <div className="state-desc">Connect a dataset to explore regional carbon emissions.</div>
        </div>
      );
    }

    return children;
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-wrapper">
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {controls && <div className="chart-controls">{controls}</div>}
      </div>

      <div className="chart-container">
        {(loading || empty || error) ? (
          <div className="skeleton-line-chart">
            <div className="skeleton-lines">
              <div className="skeleton-line"></div>
              <div className="skeleton-line"></div>
              <div className="skeleton-line"></div>
              <div className="skeleton-line"></div>
            </div>
            {renderState()}
            <div className="skeleton-bars">
              <div className="skeleton-bar" style={{ height: '30%', animationDelay: '0s' }}></div>
              <div className="skeleton-bar" style={{ height: '55%', animationDelay: '0.2s' }}></div>
              <div className="skeleton-bar" style={{ height: '40%', animationDelay: '0.4s' }}></div>
              <div className="skeleton-bar" style={{ height: '70%', animationDelay: '0.6s' }}></div>
              <div className="skeleton-bar" style={{ height: '50%', animationDelay: '0.8s' }}></div>
              <div className="skeleton-bar" style={{ height: '85%', animationDelay: '1.0s' }}></div>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
