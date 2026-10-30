import React from 'react';

export default function KpiCard({ title, value, desc, isLoading = false, isEmpty = false }) {
  const displayValue = isLoading ? "..." : (isEmpty || !value ? "--" : value);
  const displayDesc = isLoading ? "Loading data..." : (isEmpty || !value ? "Awaiting dataset" : desc);

  return (
    <div className="kpi-card">
      <span className="kpi-label">{title}</span>
      <div className="kpi-value">{displayValue}</div>
      <div className="kpi-desc">{displayDesc}</div>
    </div>
  );
}
