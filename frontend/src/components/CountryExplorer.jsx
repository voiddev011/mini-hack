import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { calculateRank, calculateRankMovement } from '../analysis/rankingAnalysis';
import { detectAnomalies } from '../analysis/anomalyDetection';
import { generateInsights } from '../analysis/insightGenerator';
import WorldEmissionsMap from './maps/WorldEmissionsMap';

function CountryTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>{Number(payload[0].value).toFixed(2)} {metric.unit}</span>
    </div>
  );
}

export default function CountryExplorer({ data, selectedYear, setSelectedYear }) {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || '');
  const [activeMetric, setActiveMetric] = useState('co2Mt');
  const metric = activeMetric === 'co2Mt'
    ? { key: 'co2Mt', label: 'Annual CO₂ emissions', unit: 'Mt CO₂', perCapita: false }
    : { key: 'perCapitaTonnes', label: 'CO₂ emissions per capita', unit: 't CO₂ / person', perCapita: true };
  const countries = useMemo(() => [...new Set(data.rows
    .filter((row) => (row.code ? /^[A-Z]{3}$/.test(row.code) : Boolean(row.region)))
    .map((row) => row.country))]
    .sort((first, second) => first.localeCompare(second)), [data.rows]);

  const filteredCountries = useMemo(() => (
    searchQuery
      ? countries.filter((country) => country.toLowerCase().includes(searchQuery.toLowerCase()))
      : countries
  ), [countries, searchQuery]);
  useEffect(() => {
    const country = searchParams.get('country');
    const year = Number(searchParams.get('year'));
    if (country && countries.includes(country)) {
      setSelectedCountry(country);
      setSearchQuery(country);
    }
    if (Number.isInteger(year) && data.years.includes(year)) setSelectedYear(year);
  }, [countries, data.years, searchParams, setSelectedYear]);
  const countryHistory = useMemo(
    () => selectedCountry
      ? data.rows.filter((row) => row.country === selectedCountry && row.year <= selectedYear)
        .sort((first, second) => first.year - second.year)
      : [],
    [data.rows, selectedCountry, selectedYear],
  );
  const countryLatest = countryHistory.at(-1) ?? null;
  const rowsForYear = data.rows.filter((row) => row.year === (countryLatest?.year ?? selectedYear)
    && (row.code ? /^[A-Z]{3}$/.test(row.code) : Boolean(row.region))
    && Number.isFinite(row[metric.key]));
  const rank = countryLatest
    ? calculateRank(rowsForYear.map((row) => ({ id: row.country, value: row[metric.key] })), selectedCountry)
    : null;
  const historyForMetric = countryHistory.filter((row) => Number.isFinite(row[metric.key]))
    .map((row) => ({ year: row.year, value: row[metric.key] }));
  const insights = generateInsights({
    entity: selectedCountry,
    observations: historyForMetric,
    peerEntities: rowsForYear.filter((row) => row.country !== selectedCountry)
      .map((row) => ({ id: row.country, value: row[metric.key] })),
    metricLabel: metric.label,
  });
  const anomalies = detectAnomalies(historyForMetric, { entity: selectedCountry, metric: metric.label });

  const countryYears = countryHistory.map((row) => row.year);
  const rankChange = rank && countryYears.length > 1
    ? calculateRankMovement(
      rowsForYear.map((row) => ({ id: row.country, value: row[metric.key] })),
      data.rows.filter((row) => row.year === countryYears.at(-2)
      && (row.code ? /^[A-Z]{3}$/.test(row.code) : Boolean(row.region))
      && Number.isFinite(row[metric.key]))
        .map((row) => ({ id: row.country, value: row[metric.key] })),
      selectedCountry,
    )
    : null;
  const selectCountry = (country) => {
    setSelectedCountry(country);
    setSearchQuery(country);
  };

  return (
    <div className="country-explorer">
      <div className="research-panel-heading">
        <div>
          <span className="section-index">COUNTRY RECORDS</span>
          <h3>Country Explorer</h3>
          <p>Search or select a country to inspect reported values and history.</p>
        </div>
      </div>

      <div className="country-filters">
        <div className="search-field">
          <label htmlFor="country-search">Search country</label>
          <input
            id="country-search"
            type="search"
            placeholder="Type a country name"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSelectedCountry('');
            }}
            className="text-input"
            role="combobox"
            aria-expanded={Boolean(searchQuery && !selectedCountry && filteredCountries.length)}
            aria-controls="country-search-results"
          />
          {searchQuery && !selectedCountry && filteredCountries.length > 0 && (
            <ul className="country-search-results" id="country-search-results" role="listbox">
              {filteredCountries.slice(0, 8).map((country) => (
                <li key={country}>
                  <button type="button" role="option" onClick={() => selectCountry(country)}>{country}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="search-field">
          <label htmlFor="country-select">Country list</label>
          <select
            id="country-select"
            value={selectedCountry}
            onChange={(event) => selectCountry(event.target.value)}
            className="select-input"
          >
            <option value="">Select a country</option>
            {countries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </div>
      </div>
      <div className="tc-explorer-controls">
        <div className="tc-metric-switch" role="group" aria-label="Emissions metric">
          <button type="button" className={activeMetric === 'co2Mt' ? 'active' : ''} onClick={() => setActiveMetric('co2Mt')}>Total CO₂</button>
          <button type="button" className={activeMetric === 'perCapitaTonnes' ? 'active' : ''} onClick={() => setActiveMetric('perCapitaTonnes')}>Per capita</button>
        </div>
        <label className="tc-map-year-control">Year
          <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
            {data.years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        {selectedCountry && <button type="button" className="tc-map-clear" onClick={() => { setSelectedCountry(''); setSearchQuery(''); }}>Clear selection</button>}
      </div>

      <WorldEmissionsMap
        rows={data.rows}
        selectedYear={selectedYear}
        metric={metric}
        selectedCountry={selectedCountry}
        onSelectCountry={selectCountry}
      />

      {!selectedCountry ? (
        <div className="country-empty-state">
          <span className="section-index">AVAILABLE RECORDS</span>
          <p>Select a country to load its available history.</p>
        </div>
      ) : (
        <>
          <dl className="country-metrics">
            <div><dt>Country</dt><dd>{selectedCountry}</dd></div>
            <div><dt>Selected reporting year</dt><dd>{countryLatest?.year ?? 'Data unavailable'}</dd></div>
            <div><dt>{metric.label}</dt><dd>{Number.isFinite(countryLatest?.[metric.key]) ? `${countryLatest[metric.key].toFixed(2)} ${metric.unit}` : 'Data unavailable'}</dd></div>
            <div><dt>{activeMetric === 'co2Mt' ? 'Per capita' : 'Annual total'}</dt><dd>{activeMetric === 'co2Mt'
              ? Number.isFinite(countryLatest?.perCapitaTonnes) ? `${countryLatest.perCapitaTonnes.toFixed(2)} t/person` : 'Data unavailable'
              : Number.isFinite(countryLatest?.co2Mt) ? `${countryLatest.co2Mt.toFixed(2)} Mt CO₂` : 'Data unavailable'}</dd></div>
            <div><dt>Rank at selected year</dt><dd>{rank ? `${rank.rank} of ${rank.total}` : 'Data unavailable'}</dd></div>
            <div><dt>Rank movement</dt><dd>{rankChange ? `${rankChange.direction === 'up' ? '↑' : rankChange.direction === 'down' ? '↓' : '—'} ${rankChange.previousRank} → ${rankChange.currentRank}` : 'Not enough comparison years'}</dd></div>
            <div><dt>History through selected year</dt><dd>{countryHistory.length ? `${countryHistory[0].year}–${countryLatest.year}` : 'Data unavailable'}</dd></div>
          </dl>

          <div className="country-history">
            <div className="research-panel-heading">
              <div>
                <span className="section-index">ANNUAL HISTORY</span>
                <h3>{selectedCountry}, {countryHistory[0]?.year} to {countryLatest?.year}</h3>
              </div>
              <span className="unit-note">Historical annual estimates · {metric.unit}</span>
            </div>
            <div className="country-history-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={countryHistory} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="countryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="year" stroke="var(--text-secondary)" fontSize={11} fontFamily="var(--font-mono)" tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} fontFamily="var(--font-mono)" tickLine={false} />
                  <Tooltip content={<CountryTooltip metric={metric} />} />
                  <Area type="monotone" dataKey={metric.key} stroke="var(--primary)" strokeWidth={2} fill="url(#countryGrad)" name={metric.label} />
                  <ReferenceLine x={countryLatest?.year} stroke="#bc8045" strokeDasharray="3 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="tc-country-signals">
            <section className="tc-panel">
              <div className="tc-panel-heading"><div><span className="tc-eyebrow">CALCULATED / {countryLatest?.year}</span><h2>Country insights</h2></div></div>
              {insights.length ? insights.map((item, index) => <article className="tc-compact-insight" key={`${item.type}:${item.title}:${item.metric?.year ?? index}`}><span className={`tc-severity tc-severity-${item.severity}`}>{item.severity}</span><div><strong>{item.title}</strong><p>{item.explanation}</p><small>Confidence {Math.round(item.confidence * 100)}%</small></div></article>) : <p className="tc-empty-note">No insight thresholds were met with the available observations.</p>}
            </section>
            <section className="tc-panel">
              <div className="tc-panel-heading"><div><span className="tc-eyebrow">ROLLING Z-SCORE</span><h2>Historical anomalies</h2></div><span className="tc-unit-tag">{anomalies.length} detected</span></div>
              {anomalies.length ? anomalies.slice(-5).reverse().map((anomaly) => <button className="tc-anomaly-jump" type="button" key={anomaly.year} onClick={() => setSelectedYear(anomaly.year)}><strong>{anomaly.year}</strong><span>{anomaly.changePercent.toFixed(1)}% · {anomaly.deviation.toFixed(2)}σ</span><small>{anomaly.explanation}</small></button>) : <p className="tc-empty-note">No statistical anomalies found in this country’s available history through {selectedYear}.</p>}
            </section>
          </div>
          <p className="map-source-note">Source: {data.source}. Values are historical estimates, not real-time measurements.</p>
        </>
      )}
    </div>
  );
}
