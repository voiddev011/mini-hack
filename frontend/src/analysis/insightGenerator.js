import { calculateConfidence } from "./carbonMetrics";
import { detectAnomalies } from "./anomalyDetection";
import {
  detectAcceleration,
  calculateGrowthRate,
  calculateHistoricalAverage,
  calculateYearOverYearChange,
} from "./trendAnalysis";
import { calculateRank, compareWithAverage } from "./rankingAnalysis";

function insight(type, severity, title, explanation, metric, confidence) {
  return { type, severity, title, explanation, metric, confidence };
}

export function generateInsights({
  entity,
  observations,
  peerEntities = [],
  previousPeerEntities = [],
  historicalWindow = 10,
  metricLabel = "emissions",
  confidence,
  currentValue,
} = {}) {
  const rows = (observations || [])
    .slice()
    .sort((first, second) => first.year - second.year);
  const validRows = rows.filter(
    (row) => Number.isFinite(row.year) && Number.isFinite(row.value),
  );
  const score =
    confidence ??
    calculateConfidence({
      observationCount: rows.length,
      completeness: rows.length ? validRows.length / rows.length : 0,
      validationRate: rows.length ? validRows.length / rows.length : 0,
    });
  const output = [];
  if (rows.length >= 2) {
    const growth = calculateGrowthRate(rows);
    if (growth !== null && growth >= 10) {
      output.push(
        insight(
          "growth",
          "high",
          "Strong emissions growth",
          `${entity || "Emissions"} increased ${growth.toFixed(1)}% over the available period.`,
          { name: metricLabel, value: growth, unit: "%" },
          score,
        ),
      );
    } else if (growth !== null && growth <= -5) {
      output.push(
        insight(
          "decline",
          "medium",
          "Declining emissions",
          `${entity || "Emissions"} declined ${Math.abs(growth).toFixed(1)}% over the available period.`,
          { name: metricLabel, value: growth, unit: "%" },
          score,
        ),
      );
    }

    const latestObservation = rows.at(-1);
    const latestChange = calculateYearOverYearChange(rows).at(-1);
    if (
      latestChange?.year === latestObservation?.year &&
      latestChange.changePercent !== null &&
      Math.abs(latestChange.changePercent) >= 10
    ) {
      output.push(
        insight(
          "year_over_year",
          Math.abs(latestChange.changePercent) >= 25 ? "high" : "medium",
          "Significant year-on-year change",
          `${entity || "Emissions"} changed ${latestChange.changePercent.toFixed(1)}% between ${latestChange.previousYear} and ${latestChange.year}.`,
          {
            name: metricLabel,
            value: latestChange.changePercent,
            unit: "%",
            year: latestChange.year,
          },
          score,
        ),
      );
    }

    const acceleration = detectAcceleration(rows);
    if (
      acceleration &&
      acceleration.ratio !== null &&
      acceleration.ratio >= 1.5 &&
      acceleration.recentGrowthPercent > 0
    ) {
      output.push(
        insight(
          "acceleration",
          acceleration.ratio >= 2 ? "high" : "medium",
          "Growth acceleration",
          `Recent annual growth is ${acceleration.ratio.toFixed(1)}× the preceding historical average.`,
          { name: metricLabel, value: acceleration.ratio, unit: "×" },
          score,
        ),
      );
    }

    const historicalAverage = calculateHistoricalAverage(rows, {
      beforeYear: latestObservation.year,
      window: historicalWindow,
    });
    const latestValue = latestObservation.value;
    if (
      historicalAverage > 0 &&
      Number.isFinite(latestValue) &&
      latestValue < historicalAverage * 0.9
    ) {
      output.push(
        insight(
          "historical_comparison",
          "low",
          "Below historical average",
          `The latest value is ${(((historicalAverage - latestValue) / historicalAverage) * 100).toFixed(1)}% below the preceding ${historicalWindow}-observation historical average.`,
          { name: metricLabel, value: latestValue, average: historicalAverage },
          score,
        ),
      );
    }

    const anomaly = detectAnomalies(rows, { entity, metric: metricLabel });
    anomaly.forEach((row) =>
      output.push(
        insight(
          "anomaly",
          row.severity,
          "Statistical anomaly",
          `${row.year}: ${row.explanation}`,
          {
            name: metricLabel,
            value: row.changePercent,
            unit: "%",
            year: row.year,
            zScore: row.deviation,
          },
          score,
        ),
      ),
    );
  }

  const latest = rows.at(-1);
  const comparableObservation =
    latest || (Number.isFinite(currentValue) ? { value: currentValue } : null);
  if (comparableObservation && peerEntities.length) {
    const comparison = compareWithAverage(
      comparableObservation.value,
      peerEntities,
      { valueKey: "value" },
    );
    if (comparison && comparison.relation !== "at") {
      const period = Number.isFinite(latest?.year)
        ? ` for ${latest.year}`
        : " in the supplied snapshot";
      output.push(
        insight(
          "peer_comparison",
          "low",
          `${comparison.relation === "above" ? "Above" : "Below"} peer average`,
          `The ${metricLabel} value is ${Math.abs(comparison.differencePercent ?? 0).toFixed(1)}% ${comparison.relation} the peer average${period}.`,
          {
            name: metricLabel,
            value: comparableObservation.value,
            average: comparison.average,
            unit: "%",
          },
          score,
        ),
      );
    }
  }

  if (latest && peerEntities.length && previousPeerEntities.length) {
    const ranked = peerEntities.concat({
      id: entity,
      entity,
      name: entity,
      value: latest.value,
    });
    const rank = calculateRank(ranked, entity);
    const previous = rows
      .slice()
      .sort((a, b) => a.year - b.year)
      .at(-2);
    const previousEntities =
      previous && previous.year === latest.year - 1
        ? previousPeerEntities.concat({
            id: entity,
            entity,
            name: entity,
            value: previous.value,
          })
        : [];
    const priorRank = previousEntities.length
      ? calculateRank(previousEntities, entity)
      : null;
    if (rank && priorRank && rank.rank !== priorRank.rank) {
      output.push(
        insight(
          "rank_movement",
          "low",
          "Rank movement",
          `${entity} moved from rank ${priorRank.rank} to ${rank.rank} among the supplied comparison set.`,
          {
            name: metricLabel,
            value: rank.rank,
            previousRank: priorRank.rank,
            year: latest.year,
          },
          score,
        ),
      );
    }
  }

  return output;
}

export function generateSectorConcentrationInsight(
  sectors,
  { confidence } = {},
) {
  const total = sectors.reduce(
    (sum, sector) => sum + (Number.isFinite(sector.value) ? sector.value : 0),
    0,
  );
  if (!total || !sectors.length) return null;
  const largest = sectors
    .slice()
    .sort((first, second) => second.value - first.value)[0];
  const share = (largest.value / total) * 100;
  if (share < 50) return null;
  return insight(
    "sector_concentration",
    share >= 70 ? "high" : "medium",
    "Sector concentration",
    `${largest.entity} accounts for ${share.toFixed(1)}% of the reported sector total.`,
    { name: "sector share", value: share, unit: "%" },
    confidence ??
      calculateConfidence({
        observationCount: sectors.length,
        completeness: 1,
        validationRate: 1,
      }),
  );
}
