import { useMemo, useState } from 'react';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import isoCountries from 'i18n-iso-countries';
import worldTopology from 'world-atlas/countries-110m.json';

const WIDTH = 960;
const HEIGHT = 490;
const COLORS = ['#E5F1E3', '#B7D3AC', '#78A878', '#E5D77A', '#E99A65', '#D96B64', '#B83C3C'];
const NO_DATA = '#E5E7E3';

const formatValue = (value, unit) => Number.isFinite(value)
  ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`
  : 'No data available';

export default function WorldEmissionsMap({ rows, selectedYear, metric, selectedCountry, onSelectCountry }) {
  const [hovered, setHovered] = useState(null);
  const countries = useMemo(() => feature(worldTopology, worldTopology.objects.countries).features, []);
  const path = useMemo(() => geoPath(geoEquirectangular().fitExtent([[8, 8], [WIDTH - 8, HEIGHT - 8]], { type: 'Sphere' })), []);
  const rowsByCode = useMemo(() => {
    const lookup = new Map();
    rows.filter((row) => row.year === selectedYear && Number.isFinite(row[metric.key]) && /^[A-Z]{3}$/.test(row.code || ''))
      .forEach((row) => lookup.set(row.code, row));
    return lookup;
  }, [metric.key, rows, selectedYear]);
  const rowsByNumericCode = useMemo(() => new Map([...rowsByCode.values()].flatMap((row) => {
    const numericCode = isoCountries.alpha3ToNumeric(row.code);
    return numericCode ? [[String(Number(numericCode)), row]] : [];
  })), [rowsByCode]);
  const values = useMemo(() => [...rowsByCode.values()].map((row) => row[metric.key]).sort((a, b) => a - b), [metric.key, rowsByCode]);
  const thresholds = useMemo(() => COLORS.slice(1).map((_, index) => values[Math.min(values.length - 1, Math.floor(values.length * ((index + 1) / COLORS.length)))]) ?? null, [values]);
  const colorFor = (row) => {
    if (!row || !Number.isFinite(row[metric.key]) || !thresholds.length) return NO_DATA;
    const index = thresholds.findIndex((threshold) => row[metric.key] <= threshold);
    return COLORS[index === -1 ? COLORS.length - 1 : index];
  };
  const active = hovered || (selectedCountry ? [...rowsByCode.values()].find((row) => row.country === selectedCountry) : null);

  return (
    <section className="tc-world-map-card" aria-label="World carbon emissions choropleth">
      <div className="tc-world-map-heading">
        <div><span className="section-index">COUNTRY EMISSIONS / {selectedYear}</span><h3>Global emissions map</h3></div>
        <span className="tc-world-map-metric">{metric.label}</span>
      </div>
      <svg className="tc-world-map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`World map showing ${metric.label} in ${selectedYear}`}>
        <path d={path({ type: 'Sphere' })} className="tc-world-ocean" />
        {countries.map((country) => {
          const countryCode = String(Number(country.id));
          const row = rowsByNumericCode.get(countryCode);
          const name = row?.country || country.properties?.name || 'No data available';
          return <path key={countryCode} d={path(country)} className={`tc-world-country${selectedCountry === row?.country ? ' selected' : ''}`} fill={colorFor(row)} tabIndex={row ? 0 : -1}
            onMouseEnter={() => setHovered(row || { country: name, noData: true })} onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(row || { country: name, noData: true })} onBlur={() => setHovered(null)}
            onClick={() => row && onSelectCountry(row.country)}>
            <title>{row ? `${row.country}: ${formatValue(row[metric.key], metric.unit)}` : `${name}: No data available`}</title>
          </path>;
        })}
      </svg>
      <div className="tc-map-tooltip" role="status" aria-live="polite">
        {active ? <><strong>{active.country}</strong><span>{active.noData ? 'No data available for this country and year.' : `${selectedYear} · ${metric.label}: ${formatValue(active[metric.key], metric.unit)}`}</span>{!active.noData && Number.isFinite(active.perCapitaTonnes) && <small>Per capita: {formatValue(active.perCapitaTonnes, 't CO₂ / person')}</small>}</> : <span>Hover or select a country to inspect the source-backed observation.</span>}
      </div>
      <div className="tc-world-legend" aria-label="Emissions quantile legend">
        {COLORS.map((color, index) => <span key={color}><i style={{ background: color }} />{index === 0 ? 'Lowest' : index === COLORS.length - 1 ? 'Highest' : `Q${index + 1}`}</span>)}
        <span><i style={{ background: NO_DATA }} />No data</span>
      </div>
      <p className="map-source-note">World Atlas country topology is rendered with an Equirectangular (Plate Carrée) projection. Country emissions are joined by ISO alpha-3 identifiers; colours are recalculated as seven quantile classes for the selected year, and grey means no valid observation.</p>
    </section>
  );
}
