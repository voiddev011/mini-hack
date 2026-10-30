import { INDIA_ADMIN1_REGIONS } from "../data/indiaAdmin1Regions";

const API_ROOT = "https://api.climatetrace.org/v7";
const CACHE_TTL = 6 * 60 * 60 * 1000;
const cache = new Map();
const pendingRequests = new Map();

async function getJson(path, cacheKey) {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL) return cached.value;
  if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey);

  const request = fetch(`${API_ROOT}${path}`, { cache: "force-cache" })
    .then(async (response) => {
      if (!response.ok)
        throw new Error(
          `Climate TRACE v7 request failed (${response.status}).`,
        );
      return response.json();
    })
    .then((value) => {
      cache.set(cacheKey, { value, savedAt: Date.now() });
      return value;
    })
    .finally(() => pendingRequests.delete(cacheKey));

  pendingRequests.set(cacheKey, request);
  return request;
}

export async function getCountrySectorEmissions({ countryCode = "IND", year }) {
  const params = new URLSearchParams({
    year: String(year),
    gas: "co2e_100yr",
    gadmId: countryCode,
    sectors: "all_no_forest",
  });
  const response = await getJson(
    `/sources/emissions?${params}`,
    `sectors:${countryCode}:${year}`,
  );
  const sectors = Array.isArray(response.sectors?.summaries)
    ? response.sectors.summaries
    : [];

  return sectors
    .filter((sector) => Number.isFinite(sector.emissionsQuantity))
    .map((sector) => ({
      sector: sector.sector,
      emissionsTonnes: sector.emissionsQuantity,
      emissionsMt: sector.emissionsQuantity / 1e6,
      share: Number.isFinite(sector.percentage) ? sector.percentage : null,
      gas: sector.gas,
      year,
      source: "Climate TRACE",
    }))
    .sort((first, second) => second.emissionsTonnes - first.emissionsTonnes);
}

async function getAdminEmissionsTonnes(region, year) {
  if (!region.gadmIds.length) {
    return {
      stateId: region.id,
      state: region.name,
      year,
      emissionsTonnes: null,
      emissionsMt: null,
      source: "Climate TRACE",
    };
  }
  const sectorGroups = await Promise.all(
    region.gadmIds.map((gadmId) =>
      getCountrySectorEmissions({ countryCode: gadmId, year }).catch(
        (error) => {
          throw new Error(
            `Climate TRACE state query failed for ${region.name} (${gadmId}) in ${year}: ${error.message}`,
            { cause: error },
          );
        },
      ),
    ),
  );
  if (sectorGroups.some((sectors) => !sectors.length)) {
    return {
      stateId: region.id,
      state: region.name,
      year,
      emissionsTonnes: null,
      emissionsMt: null,
      source: "Climate TRACE",
    };
  }
  const emissionsTonnes = sectorGroups
    .flat()
    .reduce((total, sector) => total + sector.emissionsTonnes, 0);
  return {
    stateId: region.id,
    state: region.name,
    year,
    emissionsTonnes,
    emissionsMt: emissionsTonnes / 1e6,
    source: "Climate TRACE",
  };
}

export async function getIndiaStateEmission({ stateId, year }) {
  if (!Number.isInteger(year) || year < 2021)
    throw new Error(
      "Climate TRACE India admin-level emissions are available from 2021.",
    );
  const region = INDIA_ADMIN1_REGIONS.find((item) => item.id === stateId);
  if (!region)
    throw new Error(
      `No Climate TRACE India admin mapping exists for ${stateId}.`,
    );
  return getAdminEmissionsTonnes(region, year);
}

export async function getIndiaStateEmissions(year) {
  if (!Number.isInteger(year) || year < 2021)
    throw new Error(
      "Climate TRACE India admin-level emissions are available from 2021.",
    );
  const regions = INDIA_ADMIN1_REGIONS.filter(
    (region) => region.gadmIds.length,
  );
  const results = new Array(regions.length);
  let nextRegion = 0;
  const worker = async () => {
    while (nextRegion < regions.length) {
      const index = nextRegion;
      nextRegion += 1;
      results[index] = await getAdminEmissionsTonnes(regions[index], year);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(6, regions.length) }, worker),
  );
  return [
    ...results,
    {
      stateId: "IN-LA",
      state: "Ladakh",
      year,
      emissionsTonnes: null,
      emissionsMt: null,
      source: "Climate TRACE",
    },
  ];
}

export async function getIndiaStateEmissionHistory({ stateId, throughYear }) {
  if (!Number.isInteger(throughYear) || throughYear < 2021) return [];
  const region = INDIA_ADMIN1_REGIONS.find((item) => item.id === stateId);
  if (!region)
    throw new Error(
      `No Climate TRACE India admin mapping exists for ${stateId}.`,
    );
  const years = Array.from(
    { length: throughYear - 2021 + 1 },
    (_, index) => 2021 + index,
  );
  const observations = new Array(years.length);
  let nextYear = 0;
  const worker = async () => {
    while (nextYear < years.length) {
      const index = nextYear;
      nextYear += 1;
      const result = await getAdminEmissionsTonnes(region, years[index]);
      if (Number.isFinite(result.emissionsMt))
        observations[index] = { year: result.year, value: result.emissionsMt };
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, years.length) }, worker));
  return observations.filter(Boolean);
}

export async function getRankedEmissionSources({
  countryCode = "IND",
  year,
  limit = 10,
}) {
  const params = new URLSearchParams({
    year: String(year),
    gas: "co2e_100yr",
    gadmId: countryCode,
    limit: String(limit),
  });
  const response = await getJson(
    `/sources?${params}`,
    `sources:${countryCode}:${year}:${limit}`,
  );
  if (!Array.isArray(response))
    throw new Error("Climate TRACE returned an invalid source ranking.");

  return response.map((source) => ({
    id: source.id,
    name: source.name || "Unnamed emissions source",
    sector: source.sector || "Unclassified",
    subsector: source.subsector || "",
    assetType: source.assetType || "",
    sourceType: source.sourceType || "",
    countryCode: source.country || countryCode,
    emissionsTonnes: Number.isFinite(source.emissionsQuantity)
      ? source.emissionsQuantity
      : null,
    emissionsMt: Number.isFinite(source.emissionsQuantity)
      ? source.emissionsQuantity / 1e6
      : null,
    year: source.year || year,
    latitude: source.centroid?.latitude ?? null,
    longitude: source.centroid?.longitude ?? null,
    source: "Climate TRACE",
  }));
}
