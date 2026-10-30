import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis
} from 'recharts';

export default function ComparisonChart({ data, loading = false, error = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const selectedYear = '2025';

  // Filter entities list based on region and search query
  const filteredEntities = useMemo(() => {
    if (!data) return [];
    return data.filter((item) => {
      const matchRegion = selectedRegion === 'All' || item.region === selectedRegion;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRegion && matchSearch;
    });
  }, [data, searchQuery, selectedRegion]);

  // Pick the first match or matching entity
  const selectedEntity = useMemo(() => {
    if (filteredEntities.length === 0) return null;
    return filteredEntities[0];
  }, [filteredEntities]);

  return (
    <div className="chart-card comparison-card">
      <div className="chart-header" style={{ marginBottom: '16px' }}>
        <div className="chart-title-wrapper">
          <h3>Entity Analysis</h3>
          <p>Explore carbon footprint profiles for specific countries or industries</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="search-field">
          <label htmlFor="search-input">Search Entity</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search e.g. India, USA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-input"
          />
        </div>
        <div className="search-field">
          <label htmlFor="region-select">Select Region</label>
          <select
            id="region-select"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="select-input"
            style={{ height: '38px', width: '100%' }}
          >
            <option value="All">All Regions</option>
            <option value="North America">North America</option>
            <option value="Europe">Europe</option>
            <option value="Asia Pacific">Asia Pacific</option>
            <option value="Latin America">Latin America</option>
            <option value="Africa">Africa</option>
          </select>
        </div>
      </div>

      <div className="comparison-result">
        {loading ? (
          <div className="state-overlay">
            <div className="state-title">Loading Profile...</div>
          </div>
        ) : error ? (
          <div className="state-overlay">
            <div className="state-title">Loading Failed</div>
          </div>
        ) : !data ? (
          <div className="state-overlay">
            <div className="state-icon">○</div>
            <div className="state-title">No Data Selected</div>
            <div className="state-desc">Connect a dataset to compare entity carbon statistics.</div>
          </div>
        ) : !selectedEntity ? (
          <div className="state-overlay">
            <div className="state-icon">🔎</div>
            <div className="state-title">No Entity Matches</div>
            <div className="state-desc">No profiles found for "{searchQuery}" in {selectedRegion}.</div>
          </div>
        ) : (
          <div className="comparison-result-info">
            <h4>{selectedEntity.name}</h4>
            <div className="sub">{selectedEntity.region}, latest data ({selectedYear})</div>
            
            <div className="comparison-metrics">
              <div className="comparison-metric">
                <span>Total Emissions</span>
                <b>{selectedEntity.latestEmissions.toFixed(2)} Gt CO₂e</b>
              </div>
              <div className="comparison-metric">
                <span>Emissions Per Capita</span>
                <b>{selectedEntity.perCapita.toFixed(2)} t / person</b>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <span className="kpi-label" style={{ fontSize: '9px', marginBottom: '8px' }}>Historical Trend</span>
              <div style={{ height: '80px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedEntity.historicalTrend}>
                    <XAxis 
                      dataKey="year" 
                      fontSize={9} 
                      stroke="var(--text-secondary)" 
                      tickLine={false} 
                      dy={4}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Line 
                      type="monotone" 
                      dataKey="co2" 
                      stroke="var(--accent)" 
                      strokeWidth={2} 
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
