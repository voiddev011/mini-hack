export function calculateRank(entities, entityId, { valueKey = 'value', descending = true } = {}) {
  const rows = entities.filter((row) => Number.isFinite(row[valueKey]));
  rows.sort((first, second) => descending
    ? second[valueKey] - first[valueKey]
    : first[valueKey] - second[valueKey]);
  const rank = rows.findIndex((row) => row.id === entityId || row.entity === entityId || row.name === entityId);
  return rank < 0 ? null : { rank: rank + 1, total: rows.length, value: rows[rank][valueKey] };
}

export function calculateRankMovement(currentEntities, previousEntities, entityId, options = {}) {
  const current = calculateRank(currentEntities, entityId, options);
  const previous = calculateRank(previousEntities, entityId, options);
  if (!current || !previous) return null;
  return {
    currentRank: current.rank,
    previousRank: previous.rank,
    movement: previous.rank - current.rank,
    direction: current.rank < previous.rank ? 'up' : current.rank > previous.rank ? 'down' : 'unchanged',
  };
}

export function compareWithAverage(value, entities, { valueKey = 'value', entityKey } = {}) {
  if (!Number.isFinite(value)) return null;
  const comparable = entities.filter((row) => Number.isFinite(row[valueKey]));
  if (entityKey) {
    const groups = comparable.filter((row) => row[entityKey] === entityKey);
    if (groups.length) return comparison(value, groups.map((row) => row[valueKey]));
  }
  if (!comparable.length) return null;
  return comparison(value, comparable.map((row) => row[valueKey]));
}

function comparison(value, values) {
  const average = values.reduce((sum, item) => sum + item, 0) / values.length;
  return {
    average,
    difference: value - average,
    differencePercent: average === 0 ? null : ((value - average) / Math.abs(average)) * 100,
    relation: value > average ? 'above' : value < average ? 'below' : 'at',
  };
}
