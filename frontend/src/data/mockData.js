// TrustCarbon Layout Demonstration Mock Data
// CENTRALIZED DATA ARCHITECTURE - Easy to replace with real CSV parse endpoints later.

export const DEMO_KPI_DATA = {
  totalEmissions: {
    value: "35.8 Gt",
    label: "TOTAL EMISSIONS",
    desc: "Global annual carbon output estimate"
  },
  countriesRegions: {
    value: "195",
    label: "COUNTRIES / REGIONS",
    desc: "Entities tracked globally"
  },
  latestDataYear: {
    value: "2025",
    label: "LATEST DATA YEAR",
    desc: "Most recent comprehensive assessment"
  },
  averagePerCapita: {
    value: "4.7 t",
    label: "AVG PER CAPITA",
    desc: "Per-capita annual emission weight"
  }
};

export const DEMO_EMISSIONS_TREND = [
  { year: 2018, co2: 36.4, co2PerCapita: 4.8 },
  { year: 2019, co2: 36.7, co2PerCapita: 4.8 },
  { year: 2020, co2: 34.8, co2PerCapita: 4.5 }, // COVID drop
  { year: 2021, co2: 36.3, co2PerCapita: 4.6 },
  { year: 2022, co2: 36.8, co2PerCapita: 4.7 },
  { year: 2023, co2: 37.1, co2PerCapita: 4.7 },
  { year: 2024, co2: 37.4, co2PerCapita: 4.7 },
  { year: 2025, co2: 37.2, co2PerCapita: 4.6 }
];

export const DEMO_REGIONAL_COMPARISON = [
  { region: "Asia Pacific", co2: 17.2, co2PerCapita: 4.1 },
  { region: "North America", co2: 5.9, co2PerCapita: 14.8 },
  { region: "Europe", co2: 4.8, co2PerCapita: 6.4 },
  { region: "Middle East", co2: 2.8, co2PerCapita: 9.2 },
  { region: "Latin America", co2: 1.9, co2PerCapita: 2.9 },
  { region: "Africa", co2: 1.4, co2PerCapita: 1.1 }
];

export const DEMO_ENTITY_ANALYSIS = [
  { 
    id: "entity-1",
    name: "United States", 
    region: "North America", 
    latestEmissions: 4.9, 
    perCapita: 14.6, 
    historicalTrend: [
      { year: 2021, co2: 5.0 },
      { year: 2022, co2: 5.1 },
      { year: 2023, co2: 4.9 },
      { year: 2024, co2: 4.9 },
      { year: 2025, co2: 4.8 }
    ]
  },
  { 
    id: "entity-2",
    name: "China", 
    region: "Asia Pacific", 
    latestEmissions: 11.4, 
    perCapita: 8.0, 
    historicalTrend: [
      { year: 2021, co2: 10.9 },
      { year: 2022, co2: 11.1 },
      { year: 2023, co2: 11.3 },
      { year: 2024, co2: 11.5 },
      { year: 2025, co2: 11.4 }
    ]
  },
  { 
    id: "entity-3",
    name: "India", 
    region: "Asia Pacific", 
    latestEmissions: 2.8, 
    perCapita: 2.0, 
    historicalTrend: [
      { year: 2021, co2: 2.5 },
      { year: 2022, co2: 2.6 },
      { year: 2023, co2: 2.7 },
      { year: 2024, co2: 2.8 },
      { year: 2025, co2: 2.8 }
    ]
  },
  { 
    id: "entity-4",
    name: "Germany", 
    region: "Europe", 
    latestEmissions: 0.65, 
    perCapita: 7.8, 
    historicalTrend: [
      { year: 2021, co2: 0.69 },
      { year: 2022, co2: 0.67 },
      { year: 2023, co2: 0.66 },
      { year: 2024, co2: 0.65 },
      { year: 2025, co2: 0.64 }
    ]
  },
  { 
    id: "entity-5",
    name: "United Kingdom", 
    region: "Europe", 
    latestEmissions: 0.32, 
    perCapita: 4.7, 
    historicalTrend: [
      { year: 2021, co2: 0.35 },
      { year: 2022, co2: 0.34 },
      { year: 2023, co2: 0.33 },
      { year: 2024, co2: 0.32 },
      { year: 2025, co2: 0.32 }
    ]
  }
];

export const DEMO_TABLE_DATA = [
  { entity: "United States", region: "North America", year: 2025, emissions: 4.9, perCapita: 14.6, status: "Verified" },
  { entity: "China", region: "Asia Pacific", year: 2025, emissions: 11.4, perCapita: 8.0, status: "Verified" },
  { entity: "India", region: "Asia Pacific", year: 2025, emissions: 2.8, perCapita: 2.0, status: "Verified" },
  { entity: "Germany", region: "Europe", year: 2025, emissions: 0.65, perCapita: 7.8, status: "Verified" },
  { entity: "United Kingdom", region: "Europe", year: 2025, emissions: 0.32, perCapita: 4.7, status: "Verified" },
  { entity: "Brazil", region: "Latin America", year: 2025, emissions: 0.48, perCapita: 2.2, status: "Pending" },
  { entity: "South Africa", region: "Africa", year: 2025, emissions: 0.42, perCapita: 6.9, status: "Verified" },
  { entity: "Japan", region: "Asia Pacific", year: 2025, emissions: 1.05, perCapita: 8.4, status: "Verified" },
  { entity: "Canada", region: "North America", year: 2025, emissions: 0.54, perCapita: 13.9, status: "Verified" },
  { entity: "Australia", region: "Asia Pacific", year: 2025, emissions: 0.38, perCapita: 14.2, status: "Pending" }
];

export const DEMO_DATA_SOURCES = [
  {
    name: "EDGAR Global Database",
    coverage: "Global emissions data",
    reportingPeriod: "1970 - 2025",
    metrics: "CO₂, CH₄, N₂O, F-gases",
    source: "European Commission JRC"
  },
  {
    name: "Global Carbon Project",
    coverage: "Global/National Budgets",
    reportingPeriod: "Annual publications",
    metrics: "CO₂ emissions, Land-use",
    source: "Integrated research program"
  },
  {
    name: "World Bank DataBank",
    coverage: "Macro-environmental Indicators",
    reportingPeriod: "1960 - 2025",
    metrics: "Per-capita emissions, GDP",
    source: "World Bank / IEA"
  }
];

export const DEMO_PERSONAL_FOOTPRINT = {
  total: 6.2, // t CO2e
  trend: [
    { month: "Jan", emissions: 540 },
    { month: "Feb", emissions: 490 },
    { month: "Mar", emissions: 510 },
    { month: "Apr", emissions: 430 },
    { month: "May", emissions: 390 },
    { month: "Jun", emissions: 360 },
    { month: "Jul", emissions: 380 },
    { month: "Aug", emissions: 350 }
  ],
  sources: [
    { label: "Transport", percentage: 42, value: "2.6 t CO₂e" },
    { label: "Energy", percentage: 31, value: "1.9 t CO₂e" },
    { label: "Food", percentage: 15, value: "0.9 t CO₂e" },
    { label: "Travel", percentage: 8, value: "0.5 t CO₂e" },
    { label: "Other", percentage: 4, value: "0.3 t CO₂e" }
  ],
  activities: [
    { type: "Transport", name: "Commute via Petrol Car", delta: "+24 kg CO₂e" },
    { type: "Energy", name: "Monthly Grid Power (Office)", delta: "+150 kg CO₂e" },
    { type: "Food", name: "Plant-based diet adjustment", delta: "-12 kg CO₂e" },
    { type: "Travel", name: "Domestic Train Journey", delta: "+18 kg CO₂e" }
  ]
};
