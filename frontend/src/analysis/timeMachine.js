import { calculateTrend } from './trendAnalysis';
import { calculateRank } from './rankingAnalysis';

export function baselineChange(observations, year, baselineYear) {
  const current = observations.find((row) => row.year === year && Number.isFinite(row.value));
  const baseline = observations.find((row) => row.year === baselineYear && Number.isFinite(row.value));
  if (!current || !baseline) return null;
  const change = current.value - baseline.value;
  return { change, changePercent: baseline.value === 0 ? null : change / Math.abs(baseline.value) * 100 };
}

export function cumulativeChange(observations, year, baselineYear) {
  if (year < baselineYear) return null;
  const rows = calculateTrend(observations, { startYear: baselineYear, endYear: year });
  if (rows.length !== year - baselineYear + 1 || rows[0]?.year !== baselineYear || rows.at(-1)?.year !== year) return null;
  return rows.slice(1).reduce((total, row, index) => total + row.value - rows[index].value, 0);
}

export function rankAtYear(observations, entity, year) {
  const rows = observations.filter((row) => row.year === year);
  return calculateRank(rows, entity);
}

export function exploreYear(observations, year, baselineYear) {
  const rows = calculateTrend(observations);
  const current = rows.find((row) => row.year === year) || null;
  const previous = rows.filter((row) => row.year < year).at(-1) || null;
  return {
    current,
    previous,
    previousChange: current && previous ? baselineChange(rows, year, previous.year) : null,
    isYearOverYear: Boolean(current && previous && year === previous.year + 1),
    baseline: baselineChange(rows, year, baselineYear),
    cumulative: cumulativeChange(rows, year, baselineYear),
  };
}
