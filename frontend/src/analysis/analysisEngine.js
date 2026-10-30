export { calculateConfidence, calculateCarbonPressure, average, standardDeviation } from './carbonMetrics';
export {
  calculateTrend,
  calculateGrowthRate,
  calculateYearOverYearChange,
  calculateHistoricalAverage,
  detectAcceleration,
} from './trendAnalysis';
export { calculateRank, calculateRankMovement, compareWithAverage } from './rankingAnalysis';
export { compareSeries, compareWithReference } from './comparisonAnalysis';
export { detectAnomalies } from './anomalyDetection';
export { generateInsights, generateSectorConcentrationInsight } from './insightGenerator';

import { calculateYearOverYearChange } from './trendAnalysis';
import { detectAnomalies } from './anomalyDetection';

export function analyzeEntities(entities, { metric = 'emissions', valueKey = 'value', window = 10 } = {}) {
  return entities.map((entity) => {
    const observations = entity.observations.map((row) => ({ year: row.year, value: row[valueKey] }));
    return {
      ...entity,
      metric,
      changes: calculateYearOverYearChange(observations),
      anomalies: detectAnomalies(observations, { window, entity: entity.name || entity.id, metric }),
    };
  });
}
