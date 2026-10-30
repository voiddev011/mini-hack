import { calculateConfidence } from "./carbonMetrics";

const SCORE_WEIGHTS = {
  sourceCredibility: 0.25,
  coverage: 0.2,
  completeness: 0.2,
  freshness: 0.15,
  validation: 0.2,
};

export function calculateTrustScore({
  source,
  sourceCredibility,
  entityCount,
  expectedEntityCount = 195,
  observations = [],
  requiredFields = ["entity", "year", "value"],
  latestYear,
  assessedYear = new Date().getUTCFullYear(),
  validationRate,
}) {
  const coverage = Math.max(
    0,
    Math.min(100, (entityCount / expectedEntityCount) * 100),
  );
  const completeness = observations.length
    ? (requiredFields.reduce(
        (score, field) =>
          score +
          observations.filter(
            (row) =>
              row[field] !== null &&
              row[field] !== undefined &&
              row[field] !== "",
          ).length /
            observations.length,
        0,
      ) /
        requiredFields.length) *
      100
    : 0;
  const age = Number.isFinite(latestYear)
    ? Math.max(0, assessedYear - latestYear)
    : assessedYear;
  const freshness = Math.max(0, 100 - age * 15);
  const validation = Math.max(0, Math.min(100, validationRate));
  const criteria = {
    sourceCredibility: Math.max(0, Math.min(100, sourceCredibility)),
    coverage,
    completeness,
    freshness,
    validation,
  };
  const score = Object.entries(SCORE_WEIGHTS).reduce(
    (total, [key, weight]) => total + criteria[key] * weight,
    0,
  );
  return {
    source,
    score: Math.round(score),
    grade:
      score >= 85
        ? "Strong"
        : score >= 70
          ? "Good"
          : score >= 50
            ? "Moderate"
            : "Limited",
    criteria,
    weights: SCORE_WEIGHTS,
    confidence: calculateConfidence({
      observationCount: observations.length,
      completeness: completeness / 100,
      validationRate: validation / 100,
    }),
    latestYear,
    entityCount,
  };
}
