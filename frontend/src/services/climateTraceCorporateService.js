import { getRankedEmissionSources } from './climateTraceService';

const COMPANY_SOURCE_LIMIT = 100;

function normalizeName(value) {
  return value.toLowerCase()
    .replace(/\b(limited|ltd|company|co|incorporated|inc)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export async function getCompanyFacilityMatches(companyName, year) {
  if (!companyName?.trim()) return [];
  if (!Number.isInteger(year) || year < 2015) return [];

  const query = normalizeName(companyName);
  if (query.length < 4) return [];
  const sources = await getRankedEmissionSources({
    countryCode: 'IND',
    year,
    limit: COMPANY_SOURCE_LIMIT,
  });

  return sources
    .filter((source) => normalizeName(source.name).includes(query))
    .map((source) => ({
      ...source,
      dataStatus: 'Climate TRACE facility/source estimate; not a company inventory or reported Scope value',
      rankedSampleLimit: COMPANY_SOURCE_LIMIT,
    }));
}
