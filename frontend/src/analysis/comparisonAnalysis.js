import { average } from './carbonMetrics';

export function compareSeries(first, second, { valueKey = 'value' } = {}) {
  const secondByYear = new Map(second.filter((row) => Number.isFinite(row.year)).map((row) => [row.year, row[valueKey]]));
  return first.flatMap((row) => {
    const comparisonValue = secondByYear.get(row.year);
    if (!Number.isFinite(row[valueKey]) || !Number.isFinite(comparisonValue)) return [];
    return [{
      year: row.year,
      first: row[valueKey],
      second: comparisonValue,
      difference: row[valueKey] - comparisonValue,
    }];
  });
}

export function compareWithReference(value, referenceValues) {
  const referenceAverage = average(referenceValues.filter(Number.isFinite));
  if (!Number.isFinite(value) || referenceAverage === null) return null;
  return {
    average: referenceAverage,
    difference: value - referenceAverage,
    relation: value > referenceAverage ? 'above' : value < referenceAverage ? 'below' : 'at',
  };
}
