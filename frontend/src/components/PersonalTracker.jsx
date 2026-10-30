import React from 'react';

export default function PersonalTracker({
  isLoggedIn = false,
  onLoginClick,
  onDashboardClick,
  data
}) {
  const hasData = !!data;

  return (
    <div className="personal-section" id="personal-tracker">
      <div className="section-head" style={{ marginBottom: '32px' }}>
        <h2>Personal Carbon Tracker</h2>
        <p>Understand your own carbon footprint and identify the activities that contribute most to it.</p>
      </div>

      <div className="personal-box">
        {!isLoggedIn ? (
          <div className="personal-logout-state">
            <h3>Log in to access your dashboard</h3>
            <p>
              Connect your personal account to track daily travel, utility bills, shopping lists, and food logs to measure your real-time footprint.
            </p>
            <button onClick={onLoginClick} className="btn btn-primary">
              Log In
            </button>
          </div>
        ) : (
          <div className="personal-dashboard-preview">
            <div className="personal-dash-header">
              <h3>Personal Footprint Profile</h3>
              <button onClick={onDashboardClick} className="btn btn-secondary" style={{ minHeight: '36px', padding: '0 16px', fontSize: '12px' }}>
                Go to Dashboard
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '32px', marginTop: '16px' }}>
              <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                <span className="kpi-label">Personal Footprint</span>
                <div className="kpi-value" style={{ fontSize: '36px' }}>
                  {hasData ? `${data.total} t` : "--"}
                </div>
                <div className="kpi-desc">Tonnes CO₂e / year</div>
              </div>

              <div>
                <span className="kpi-label">Footprint Breakdown</span>
                <div className="source-bars-list">
                  {(hasData ? data.sources : [
                    { label: "Transport", percentage: 0, value: "--" },
                    { label: "Energy", percentage: 0, value: "--" },
                    { label: "Food", percentage: 0, value: "--" },
                    { label: "Travel", percentage: 0, value: "--" },
                    { label: "Other Activities", percentage: 0, value: "--" }
                  ]).map((source, idx) => (
                    <div className="source-bar-item" key={idx}>
                      <span className="label">{source.label}</span>
                      <div className="bar-track">
                        <div 
                          className="bar-fill" 
                          style={{ width: `${source.percentage}%` }}
                        ></div>
                      </div>
                      <span className="value">{source.value}</span>
                    </div>
                  ))}
                </div>
                <button className="add-activity-btn" onClick={onDashboardClick}>
                  + Add activity
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
