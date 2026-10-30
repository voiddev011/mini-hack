import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import ChartCard from './ChartCard';

export default function EmissionsTrend({
  data,
  loading = false,
  error = false,
  subtitle = 'Historical annual CO₂ estimates. Values are not real-time.',
  activeYear,
}) {
  const isEmpty = !data || data.length === 0;

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
          <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>Year: {label}</p>
          <p style={{ color: 'var(--accent)' }}>
            CO₂: <b>{payload[0]?.value?.toFixed(3)} Gt</b>
          </p>
          {payload[1] && (
            <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
              Avg Per Capita: <b>{payload[1].value?.toFixed(3)} t</b>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard
      title="Global Emissions Trend"
      subtitle={subtitle}
      loading={loading}
      empty={isEmpty}
      error={error}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="year"
            stroke="var(--text-secondary)"
            fontSize={11}
            fontFamily="var(--font-mono)"
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
          {Number.isFinite(activeYear) && <ReferenceLine x={activeYear} stroke="#bc8045" strokeDasharray="3 4" />}
          <Area
            type="monotone"
            dataKey="co2"
            stroke="var(--accent)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCo2)"
            name="CO₂ (Gt)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
