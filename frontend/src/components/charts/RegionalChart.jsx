import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import ChartCard from './ChartCard';
import { YEARS, getRegionalDataForYear, LATEST_YEAR } from '../../data/realData';

export default function RegionalChart({ data, loading = false, error = false }) {
  const [metric, setMetric] = useState('co2'); // 'co2' or 'co2PerCapita'
  const [selectedYear, setSelectedYear] = useState(LATEST_YEAR);

  // Compute regional data for the selected year
  const yearData = useMemo(() => {
    return getRegionalDataForYear(selectedYear);
  }, [selectedYear]);

  // Use the year-filtered data; fall back to the prop 'data' if nothing
  const chartData = yearData.length > 0 ? yearData : (data || []);
  const isEmpty = chartData.length === 0;

  const renderControls = () => (
    <div className="chart-controls">
      <select
        value={metric}
        onChange={(e) => setMetric(e.target.value)}
        className="select-input"
        aria-label="Filter by Metric"
      >
        <option value="co2">CO₂ (Mt)</option>
        <option value="co2PerCapita">CO₂ Per Capita (t)</option>
      </select>
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(Number(e.target.value))}
        className="select-input"
        aria-label="Filter by Year"
      >
        {YEARS.slice().reverse().map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px'
        }}>
          <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>{label}</p>
          <p style={{ color: 'var(--accent)' }}>
            {metric === 'co2' ? 'CO₂: ' : 'Per Capita: '}
            <b>{payload[0].value.toFixed(2)} {metric === 'co2' ? 'Mt CO₂' : 't CO₂e'}</b>
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
            Year: {selectedYear}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard
      title="Emissions by Region"
      subtitle={`Regional CO₂ aggregates · ${selectedYear}`}
      loading={loading}
      empty={isEmpty}
      error={error}
      controls={renderControls()}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="region"
            stroke="var(--text-secondary)"
            fontSize={11}
            tickLine={false}
            dy={8}
          />
          <YAxis
            stroke="var(--text-secondary)"
            fontSize={11}
            fontFamily="var(--font-mono)"
            tickLine={false}
            dx={-8}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey={metric}
            fill="var(--accent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={45}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
