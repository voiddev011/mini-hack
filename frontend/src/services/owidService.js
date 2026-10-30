import Papa from "papaparse";

const OWID_EMISSIONS_URL =
  "https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv";
const OWID_PER_CAPITA_URL =
  "https://ourworldindata.org/grapher/co-emissions-per-capita.csv";
const CACHE_TTL = 24 * 60 * 60 * 1000;

let cachedResult;
let cachedAt = 0;
let pendingRequest;

export function parseCsv(csvText, metric) {
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  if (result.errors.length) {
    throw new Error(
      `Our World in Data ${metric} records could not be parsed: ${result.errors[0].message}`,
    );
  }

  const valueColumn =
    metric === "emissions"
      ? "Annual CO₂ emissions"
      : "CO₂ emissions per capita";
  if (
    !result.meta.fields?.includes("Entity") ||
    !result.meta.fields.includes("Year") ||
    !result.meta.fields.includes(valueColumn)
  ) {
    throw new Error(
      `Our World in Data ${metric} data is missing required columns.`,
    );
  }

  return result.data.flatMap((row) => {
    if (!row.Year?.trim() || !row[valueColumn]?.trim()) return [];
    const year = Number(row.Year);
    const value = Number(row[valueColumn]);
    if (
      !row.Entity?.trim() ||
      !Number.isInteger(year) ||
      !Number.isFinite(value)
    )
      return [];
    return [
      {
        country: row.Entity.trim(),
        code: row.Code?.trim() || "",
        year,
        value,
      },
    ];
  });
}

async function fetchCsv(url, metric) {
  const response = await fetch(url, {
    cache: "force-cache",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(
      `Our World in Data ${metric} request failed (${response.status}).`,
    );
  return response.text();
}

async function loadOwidData() {
  const [emissionsCsv, perCapitaCsv] = await Promise.all([
    fetchCsv(OWID_EMISSIONS_URL, "emissions"),
    fetchCsv(OWID_PER_CAPITA_URL, "per-capita emissions"),
  ]);
  const emissionsRows = parseCsv(emissionsCsv, "emissions");
  const perCapitaRows = parseCsv(perCapitaCsv, "per-capita emissions");
  const perCapitaByObservation = new Map(
    perCapitaRows.map((row) => [`${row.country}\u0000${row.year}`, row.value]),
  );

  return emissionsRows.map((row) => ({
    country: row.country,
    code: row.code,
    year: row.year,
    co2Tonnes: row.value,
    perCapitaTonnes:
      perCapitaByObservation.get(`${row.country}\u0000${row.year}`) ?? null,
    source: "Our World in Data",
  }));
}

export function getOwidData() {
  if (cachedResult && Date.now() - cachedAt < CACHE_TTL)
    return Promise.resolve(cachedResult);
  if (pendingRequest) return pendingRequest;

  pendingRequest = loadOwidData()
    .then((records) => {
      cachedResult = records;
      cachedAt = Date.now();
      return records;
    })
    .catch((error) => {
      pendingRequest = null;
      throw error;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}
