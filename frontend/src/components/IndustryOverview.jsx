import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const INDUSTRIES = ['Energy', 'Transport', 'Manufacturing', 'Agriculture', 'Buildings', 'Other'];
const YEARS = Array.from({ length: 15 }, (_, index) => 2010 + index);
const INDUSTRY_COLORS = ['#315b46', '#64836a', '#89977d', '#a6ad91', '#687a6b', '#bcc0ad'];

function IndustryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>{Number(payload[0].value).toLocaleString()} million tonnes CO₂</span>
    </div>
  );
}

function parseIndustryCsv(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
  });
  if (result.errors.length) throw new Error(`Industry CSV could not be parsed: ${result.errors[0].message}`);

  const required = ['Industry', 'Year', 'CO2_Emissions', 'Unit', 'Source'];
  const missing = required.filter((column) => !result.meta.fields?.includes(column));
  if (missing.length) throw new Error(`Industry CSV is missing required columns: ${missing.join(', ')}.`);

  const rows = result.data.map((row, index) => {
    const year = Number(row.Year);
    const emissions = Number(row.CO2_Emissions);
    if (!INDUSTRIES.includes(row.Industry) || !Number.isInteger(year) || !Number.isFinite(emissions) || emissions < 0 || !row.Unit?.trim() || !row.Source?.trim()) {
      throw new Error(`Industry CSV contains an invalid record on row ${index + 2}.`);
    }
    return { ...row, Year: year, CO2_Emissions: emissions };
  });

  if (rows.length !== 90) throw new Error(`Expected 90 industry records, received ${rows.length}.`);
  return rows;
}

export default function IndustryOverview() {
  const [records, setRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedIndustry, setSelectedIndustry] = useState('Energy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/data/industry_demo.csv')
      .then((response) => {
        if (!response.ok) throw new Error(`Industry demo data could not be loaded (${response.status}).`);
        return response.text();
      })
      .then(parseIndustryCsv)
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Industry demo data could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const yearRows = useMemo(
    () => INDUSTRIES.map((industry) => records.find((row) => row.Industry === industry && row.Year === selectedYear)).filter(Boolean),
    [records, selectedYear],
  );
  const rankedRows = useMemo(
    () => [...yearRows].sort((first, second) => second.CO2_Emissions - first.CO2_Emissions),
    [yearRows],
  );
  const yearTotal = yearRows.reduce((total, row) => total + row.CO2_Emissions, 0);
  const trendRows = useMemo(
    () => records.filter((row) => row.Industry === selectedIndustry).sort((first, second) => first.Year - second.Year),
    [records, selectedIndustry],
  );
  const selectedRow = yearRows.find((row) => row.Industry === selectedIndustry);
  const selectedStart = trendRows[0]?.CO2_Emissions;
  const selectedEnd = trendRows[trendRows.length - 1]?.CO2_Emissions;
  const trendChange = selectedStart && selectedEnd
    ? `${((selectedEnd - selectedStart) / selectedStart * 100).toFixed(1)}%`
    : 'Data unavailable';

  return (
    <section className="industry-overview" aria-labelledby="industry-overview-title">
      <div className="industry-intro">
        <span className="section-index">03 / SECTOR DATA</span>
        <h2 id="industry-overview-title">Industry emissions</h2>
        <p>Explore emissions across major economic sectors using the current TrustCarbon industry dataset.</p>
      </div>

      <aside className="industry-demo-notice" aria-label="Industry data status">
        <strong>Illustrative demo dataset</strong>
        <span>Demo data, pending verified source. These values are not official TrustCarbon emissions data.</span>
      </aside>

      <div className="industry-controls">
        <label>
          <span>Selected year</span>
          <select className="select-input" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} disabled={loading || Boolean(error)}>
            {YEARS.slice().reverse().map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label>
          <span>Industry trend</span>
          <select className="select-input" value={selectedIndustry} onChange={(event) => setSelectedIndustry(event.target.value)} disabled={loading || Boolean(error)}>
            {INDUSTRIES.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
          </select>
        </label>
        {selectedRow && (
          <dl className="industry-selected-metrics">
            <div><dt>{selectedIndustry}, {selectedYear}</dt><dd>{selectedRow.CO2_Emissions.toLocaleString()} {selectedRow.Unit.toLowerCase()}</dd></div>
            <div><dt>Share of listed sectors</dt><dd>{(selectedRow.CO2_Emissions / yearTotal * 100).toFixed(1)}%</dd></div>
            <div><dt>2010 to 2024 change</dt><dd>{trendChange}</dd></div>
          </dl>
        )}
      </div>

      {loading ? <p role="status">Loading industry demo data...</p> : error ? <p role="alert" className="form-feedback">{error}</p> : (
        <>
          <div className="industry-charts">
            <section className="industry-chart-panel" aria-labelledby="industry-comparison-title">
              <div className="research-panel-heading">
                <div><span className="section-index">COMPARISON / {selectedYear}</span><h3 id="industry-comparison-title">Industry emissions comparison</h3></div>
                <span className="unit-note">Million tonnes CO₂</span>
              </div>
              <div className="industry-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearRows} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="Industry" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                    <Tooltip content={<IndustryTooltip />} />
                    <Bar dataKey="CO2_Emissions" name="CO₂ emissions" maxBarSize={38}>
                      {yearRows.map((row, index) => <Cell key={row.Industry} fill={INDUSTRY_COLORS[index]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="industry-chart-panel" aria-labelledby="industry-trend-title">
              <div className="research-panel-heading">
                <div><span className="section-index">HISTORICAL TREND / {selectedIndustry}</span><h3 id="industry-trend-title">Annual emissions</h3></div>
                <span className="unit-note">2010 to 2024</span>
              </div>
              <div className="industry-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendRows} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="Year" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={10} fontFamily="var(--font-mono)" tickLine={false} />
                    <Tooltip content={<IndustryTooltip />} />
                    <Line type="monotone" dataKey="CO2_Emissions" name="CO₂ emissions" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="industry-ranking">
            <div className="research-panel-heading">
              <div><span className="section-index">RANKING / {selectedYear}</span><h3>Sector comparison table</h3></div>
              <span className="unit-note">Share is within listed demo sectors</span>
            </div>
            <div className="table-container">
              <table className="analytics-table">
                <thead><tr><th>Rank</th><th>Industry</th><th>Emissions</th><th>Share</th><th>Year</th></tr></thead>
                <tbody>
                  {rankedRows.map((row, index) => (
                    <tr key={row.Industry}>
                      <td>{String(index + 1).padStart(2, '0')}</td>
                      <td>{row.Industry}</td>
                      <td>{row.CO2_Emissions.toLocaleString()} {row.Unit}</td>
                      <td>{(row.CO2_Emissions / yearTotal * 100).toFixed(1)}%</td>
                      <td>{row.Year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="industry-source-note"><strong>Source:</strong> Illustrative demo dataset. <strong>Status:</strong> Demo data, pending verified source. <strong>Unit:</strong> Million tonnes. Shares describe only the six listed illustrative sectors.</p>
        </>
      )}
    </section>
  );
}
