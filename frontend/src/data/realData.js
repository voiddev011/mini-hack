import countryCsv from './Carbon_(CO2)_Emissions_by_Country.csv?raw';
import { parseCountryEmissions } from '../utils/parseCountryEmissions';

const RAW_COUNTRY_ROWS = parseCountryEmissions(countryCsv);

const RAW_INDIA_ROWS = [
  ['Andhra Pradesh', 974.17, 27.18, 16.97],
  ['Arunachal', 405.90, 17.43, 25.82],
  ['Assam', 340.91, 16.63, 21.29],
  ['Bihar', 179.01, 8.83, 9.59],
  ['Chattisgarh', 1963.88, 17.56, 22.37],
  ['Goa', 2662.51, 23.12, 7.62],
  ['Gujarat', 1310.58, 24.01, 12.26],
  ['Haryana', 1381.86, 17.90, 21.57],
  ['Himachal Pradesh', 784.16, 16.98, 18.28],
  ['Jammu & Kashmir', 509.03, 15.59, 14.42],
  ['Jharkhand', 1403.43, 15.02, 15.39],
  ['Karnataka', 888.86, 24.93, 12.20],
  ['Kerala', 780.12, 18.29, 4.52],
  ['Madhya Pradesh', 656.37, 16.14, 15.15],
  ['Maharashtra', 936.70, 23.58, 9.80],
  ['Manipur', 379.20, 10.80, 22.63],
  ['Meghalaya', 691.53, 12.65, 19.80],
  ['Mizoram', 754.71, 15.40, 10.72],
  ['Nagaland', 1275.27, 24.13, 29.08],
  ['Odhisha', 700.13, 18.40, 19.88],
  ['Punjab', 1618.08, 27.90, 33.38],
  ['Rajasthan', 793.69, 14.33, 14.18],
  ['Sikkim', 711.39, 11.68, 10.04],
  ['Tamilnadu', 985.70, 26.60, 10.40],
  ['Tripura', 295.64, 17.76, 19.23],
  ['Uttar Pradesh', 404.26, 12.40, 12.87],
  ['Uttarakhand', 493.01, 14.28, 17.93],
  ['West Bengal', 763.13, 22.69, 15.99],
];

export const TABLE_DATA = RAW_COUNTRY_ROWS.map(([country, region, year, kilotons, perCapita]) => ({
  entity: country,
  region,
  year,
  emissions: kilotons / 1000,
  perCapita,
}));

export const COUNTRIES = [...new Set(RAW_COUNTRY_ROWS.map(([country]) => country))].sort();
export const REGIONS = [...new Set(RAW_COUNTRY_ROWS.map(([, region]) => region))].sort();
export const YEARS = [...new Set(RAW_COUNTRY_ROWS.map(([, , year]) => year))].sort((a, b) => a - b);
export const LATEST_YEAR = Math.max(...YEARS);
export const EARLIEST_YEAR = Math.min(...YEARS);
export const TOTAL_COUNTRIES = COUNTRIES.length;
export const TOTAL_REGIONS = REGIONS.length;

const latestYearRows = RAW_COUNTRY_ROWS.filter(([, , year]) => year === LATEST_YEAR);
const avgPerCapitaLatest = latestYearRows.length > 0
  ? latestYearRows.reduce((sum, row) => sum + row[4], 0) / latestYearRows.length
  : 0;

export const KPI_DATA = {
  totalCountries: {
    value: TOTAL_COUNTRIES.toString(),
    desc: `Unique countries in dataset (${EARLIEST_YEAR}–${LATEST_YEAR})`,
  },
  totalRegions: {
    value: TOTAL_REGIONS.toString(),
    desc: 'Distinct geographic regions tracked',
  },
  latestDataYear: {
    value: LATEST_YEAR.toString(),
    desc: 'Most recent year with data in this dataset',
  },
  avgPerCapita: {
    value: `${avgPerCapitaLatest.toFixed(2)} t`,
    desc: `Avg. metric tons CO₂ per person (${LATEST_YEAR})`,
  },
};

const yearTotals = Object.fromEntries(YEARS.map(year => [year, { kilotons: 0, count: 0 }]));
RAW_COUNTRY_ROWS.forEach(([, , year, kilotons]) => {
  yearTotals[year].kilotons += kilotons;
  yearTotals[year].count += 1;
});

export const EMISSIONS_TREND = YEARS.map(year => ({
  year,
  co2: parseFloat((yearTotals[year].kilotons / 1e6).toFixed(3)),
  co2PerCapita: parseFloat((yearTotals[year].kilotons / yearTotals[year].count / 1000).toFixed(3)),
}));

function aggregateRegions(rows) {
  const regionTotals = {};
  rows.forEach(([, region, , kilotons, perCapita]) => {
    if (!regionTotals[region]) regionTotals[region] = { kilotons: 0, perCapita: 0, count: 0 };
    regionTotals[region].kilotons += kilotons;
    regionTotals[region].perCapita += perCapita;
    regionTotals[region].count += 1;
  });

  return Object.entries(regionTotals).map(([region, totals]) => ({
    region,
    co2: parseFloat((totals.kilotons / 1000).toFixed(2)),
    co2PerCapita: parseFloat((totals.perCapita / totals.count).toFixed(2)),
  })).sort((a, b) => b.co2 - a.co2);
}

export const REGIONAL_DATA = aggregateRegions(latestYearRows);

export function getCountryData(countryName) {
  return RAW_COUNTRY_ROWS
    .filter(([country]) => country === countryName)
    .sort((a, b) => a[2] - b[2])
    .map(([, , year, kilotons, perCapita]) => ({
      year,
      ktCO2: kilotons,
      co2Mt: kilotons / 1000,
      perCapita,
    }));
}

export function getCountryLatest(countryName) {
  const rows = getCountryData(countryName);
  return rows.length > 0 ? rows[rows.length - 1] : null;
}

export function getRegionalDataForYear(year) {
  return aggregateRegions(RAW_COUNTRY_ROWS.filter(([, , rowYear]) => rowYear === year));
}

export const INDIA_STATE_DATA = RAW_INDIA_ROWS.map(([state, co2, co, ch4]) => ({
  state,
  co2PerCapita: co2,
  coPerCapita: co,
  ch4PerCapita: ch4,
})).sort((a, b) => b.co2PerCapita - a.co2PerCapita);

export const DATA_SOURCES_INFO = [
  {
    name: 'Carbon (CO₂) Emissions by Country',
    coverage: `${TOTAL_COUNTRIES} countries · ${TOTAL_REGIONS} regions`,
    reportingPeriod: `${EARLIEST_YEAR} – ${LATEST_YEAR}`,
    metrics: 'CO₂ (kilotons) · Metric tons per capita',
    source: 'Global Carbon Dataset (CSV)',
  },
  {
    name: 'Carbon Emission India – State Level',
    coverage: `${RAW_INDIA_ROWS.length} Indian states`,
    reportingPeriod: 'Single period snapshot',
    metrics: 'CO₂, CO, CH₄ – all per capita (kg/person)',
    source: 'CarbonEmissionIndia Dataset (CSV)',
  },
];
