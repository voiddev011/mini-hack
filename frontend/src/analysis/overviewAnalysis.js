const AGGREGATE_NAMES = new Set([
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'Oceania',
  'South America',
]);
import { detectAnomalies } from './anomalyDetection';
import { generateInsights } from './insightGenerator';

function newestRowsPerCountry(rows, beforeYear = Infinity) {
  const countries = new Map();
  rows.forEach((row) => {
    const isCountry = row.code ? /^[A-Z]{3}$/.test(row.code) : Boolean(row.region);
    if (!isCountry || row.year > beforeYear) return;
    const previous = countries.get(row.country);
    if (!previous || previous.year < row.year) countries.set(row.country, row);
  });
  return [...countries.values()];
}

function getCountryCount(rows) {
  return new Set(newestRowsPerCountry(rows).map((row) => row.country)).size;
}

function getWorldTrend(rows) {
  const worldRows = rows.filter((row) => row.country.toLowerCase() === 'world');
  const annualTotals = new Map();

  rows.forEach((row) => {
    const isCountry = row.code ? /^[A-Z]{3}$/.test(row.code) : Boolean(row.region);
    if (isCountry) annualTotals.set(row.year, (annualTotals.get(row.year) || 0) + row.co2Gt);
  });

  const totals = worldRows.length ? worldRows : [...annualTotals].map(([year, co2]) => ({ year, co2 }));
  return totals
    .map((row) => ({
      year: row.year,
      co2: Number((row.co2Gt ?? row.co2).toFixed(2)),
      perCapita: row.perCapitaTonnes,
    }))
    .sort((first, second) => first.year - second.year);
}

function getRegionGrowth(rows, selectedYear) {
  const regionsByYear = new Map();
  rows.forEach((row) => {
    if (!AGGREGATE_NAMES.has(row.country)) return;
    const regionRows = regionsByYear.get(row.country) || [];
    regionRows.push(row);
    regionsByYear.set(row.country, regionRows);
  });

  return [...regionsByYear.entries()]
    .map(([region, regionRows]) => {
      const ordered = regionRows.filter((row) => row.year <= selectedYear).sort((first, second) => first.year - second.year);
      const previous = ordered.at(-2);
      const latest = ordered.at(-1);
      if (!previous || !latest || previous.co2Tonnes === 0) return null;
      return {
        region,
        growthPercent: ((latest.co2Tonnes - previous.co2Tonnes) / previous.co2Tonnes) * 100,
        year: latest.year,
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.growthPercent - first.growthPercent);
}

export function buildOverviewSummary(dataset, selectedYear) {
  const { rows, years } = dataset;
  const trend = getWorldTrend(rows);
  const latestYear = selectedYear ?? trend.at(-1)?.year ?? years.at(-1);
  const selectedTrend = trend.filter((row) => row.year <= latestYear);
  const countries = newestRowsPerCountry(rows, latestYear);
  const rankingYear = countries.length ? Math.max(...countries.map((row) => row.year)) : latestYear;
  const latestCountries = countries
    .sort((first, second) => second.co2Tonnes - first.co2Tonnes);
  const latestGlobal = selectedTrend.at(-1);
  const regionGrowth = getRegionGrowth(rows, latestYear);
  const anomalies = detectAnomalies(selectedTrend.map((row) => ({ year: row.year, value: row.co2 })), {
    entity: 'World',
    metric: 'CO₂ emissions (Gt)',
  });
  const insights = generateInsights({
    entity: 'Global emissions',
    observations: selectedTrend.map((row) => ({ year: row.year, value: row.co2 })),
    metricLabel: 'CO₂ emissions (Gt)',
  });

  return {
    latestYear,
    rankingYear,
    globalEmissionsGt: latestGlobal?.co2 ?? null,
    countriesTracked: countries.length || getCountryCount(rows),
    availableYears: years.length,
    yearRange: [years[0], years.at(-1)],
    anomaliesDetected: anomalies.length,
    anomalies,
    insights,
    highestGrowthRegion: regionGrowth[0] ?? null,
    largestCountries: latestCountries.slice(0, 5),
    trend: selectedTrend,
    recentInsight: latestGlobal
      ? `Global annual CO₂ emissions were ${latestGlobal.co2.toFixed(2)} Gt in ${latestYear}. Historical estimate; not real-time.`
      : 'A global annual total is not available in the selected data source.',
  };
}
