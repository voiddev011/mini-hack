import { TABLE_DATA } from "../data/realData";
import { getOwidData } from "./owidService";

function normalizeRows(rows) {
  return rows.map((row) => ({
    country: row.country,
    code: row.code || "",
    year: row.year,
    co2Tonnes: row.co2Tonnes,
    co2Mt: row.co2Tonnes / 1e6,
    co2Gt: row.co2Tonnes / 1e9,
    perCapitaTonnes: Number.isFinite(row.perCapitaTonnes)
      ? row.perCapitaTonnes
      : null,
    region: row.region || "",
    source: row.source,
  }));
}

function validateNormalizedRows(rows) {
  if (!rows.length)
    throw new Error(
      "No valid historical emissions observations are available.",
    );
  const invalidIndex = rows.findIndex(
    (row) =>
      !row.country ||
      !Number.isInteger(row.year) ||
      !Number.isFinite(row.co2Tonnes) ||
      !Number.isFinite(row.co2Mt) ||
      !Number.isFinite(row.co2Gt) ||
      (row.perCapitaTonnes !== null && !Number.isFinite(row.perCapitaTonnes)) ||
      !row.source,
  );
  if (invalidIndex !== -1) {
    throw new Error(
      `Historical emissions validation failed for observation ${invalidIndex + 1}.`,
    );
  }
  return rows;
}

function getCsvFallbackRows() {
  return TABLE_DATA.map((row) => ({
    country: row.entity,
    code: "",
    year: row.year,
    co2Tonnes: row.emissions * 1e6,
    perCapitaTonnes: row.perCapita,
    region: row.region,
    source: "Carbon (CO₂) Emissions by Country CSV",
  }));
}

let cachedData;
let pendingData;

export async function getTrustCarbonData() {
  if (cachedData) return cachedData;
  if (pendingData) return pendingData;

  pendingData = (async () => {
    let rows;
    let source;
    let sourceWarning = "";
    try {
      rows = validateNormalizedRows(normalizeRows(await getOwidData()));
      source = "Our World in Data";
    } catch (error) {
      rows = validateNormalizedRows(normalizeRows(getCsvFallbackRows()));
      source = "Carbon (CO₂) Emissions by Country CSV";
      sourceWarning = `Our World in Data is unavailable; showing the bundled historical CSV instead. ${error.message}`;
    }

    cachedData = {
      rows,
      source,
      sourceWarning,
      years: [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b),
    };
    return cachedData;
  })().finally(() => {
    pendingData = null;
  });

  return pendingData;
}
