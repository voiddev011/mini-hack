import React from 'react';

export default function SectionHeading({ title, subtitle, className = "" }) {
  return (
    <div className={`section-head ${className}`}>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
