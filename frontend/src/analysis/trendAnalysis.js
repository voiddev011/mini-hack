import { average } from "./carbonMetrics";

function orderedValues(observations) {
  return observations
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.value))
    .slice()
    .sort((first, second) => first.year - second.year);
}

export function calculateTrend(observations, { startYear, endYear } = {}) {
  return orderedValues(observations).filter(
    (row) =>
      (startYear === undefined || row.year >= startYear) &&
      (endYear === undefined || row.year <= endYear),
  );
}

export function calculateGrowthRate(observations, { startYear, endYear } = {}) {
  const rows = calculateTrend(observations, { startYear, endYear });
  if (rows.length < 2 || rows[0].value === 0) return null;
  return ((rows.at(-1).value - rows[0].value) / Math.abs(rows[0].value)) * 100;
}

export function calculateYearOverYearChange(observations) {
  const rows = calculateTrend(observations);
  return rows.slice(1).flatMap((row, index) => {
    const previous = rows[index];
    if (row.year !== previous.year + 1) return [];
    const change = row.value - previous.value;
    return [
      {
        year: row.year,
        previousYear: previous.year,
        value: row.value,
        previousValue: previous.value,
        change,
        changePercent:
          previous.value === 0
            ? null
            : (change / Math.abs(previous.value)) * 100,
      },
    ];
  });
}

export function calculateHistoricalAverage(
  observations,
  { beforeYear, window } = {},
) {
  let rows = calculateTrend(observations);
  if (beforeYear !== undefined)
    rows = rows.filter((row) => row.year < beforeYear);
  if (Number.isInteger(window) && window > 0) rows = rows.slice(-window);
  return average(rows.map((row) => row.value));
}

export function detectAcceleration(
  observations,
  { recentWindow = 3, historicalWindow = 10 } = {},
) {
  const rows = calculateTrend(observations);
  const changes = calculateYearOverYearChange(rows).filter((change) =>
    Number.isFinite(change.changePercent),
  );
  if (
    changes.length < recentWindow + 1 ||
    changes.at(-1)?.year !== rows.at(-1)?.year
  )
    return null;
  const recentChanges = changes.slice(-recentWindow);
  if (
    recentChanges.some(
      (change, index) =>
        index > 0 && change.year !== recentChanges[index - 1].year + 1,
    )
  )
    return null;
  const recent = average(recentChanges.map((change) => change.changePercent));
  const historical = average(
    changes
      .slice(0, -recentWindow)
      .slice(-historicalWindow)
      .map((change) => change.changePercent),
  );
  if (recent === null || historical === null) return null;
  return {
    recentGrowthPercent: recent,
    historicalGrowthPercent: historical,
    ratio: historical > 0 ? recent / historical : null,
    change: recent - historical,
    years: recentChanges.map((change) => change.year),
  };
}
