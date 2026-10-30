import { average, standardDeviation } from "./carbonMetrics";
import { calculateTrend, calculateYearOverYearChange } from "./trendAnalysis";

export function detectAnomalies(
  observations,
  {
    window = 10,
    threshold = 2,
    minimumBaseline = 5,
    metric = "emissions",
    entity = "Entity",
  } = {},
) {
  const rows = calculateTrend(observations);
  const changes = calculateYearOverYearChange(rows);
  return changes.flatMap((change, index) => {
    const baseline = changes
      .slice(Math.max(0, index - window), index)
      .map((row) => row.changePercent);
    if (baseline.length < minimumBaseline) return [];
    const mean = average(baseline);
    const deviation = standardDeviation(baseline);
    if (
      mean === null ||
      deviation === null ||
      deviation === 0 ||
      change.changePercent === null
    )
      return [];
    const zScore = (change.changePercent - mean) / deviation;
    if (Math.abs(zScore) < threshold) return [];
    const severity =
      Math.abs(zScore) >= 3
        ? "high"
        : Math.abs(zScore) >= 2.5
          ? "medium"
          : "low";
    return [
      {
        entity,
        year: change.year,
        metric,
        value: change.value,
        previousValue: change.previousValue,
        change: change.change,
        changePercent: change.changePercent,
        deviation: zScore,
        baselineAveragePercent: mean,
        baselineStandardDeviation: deviation,
        severity,
        explanation: `${Math.abs(change.changePercent - mean).toFixed(1)} percentage points from the preceding ${baseline.length}-year mean change (${Math.abs(zScore).toFixed(2)} standard deviations).`,
      },
    ];
  });
}
