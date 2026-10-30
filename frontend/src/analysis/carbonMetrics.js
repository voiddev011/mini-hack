export function average(values) {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return null;
  return finiteValues.reduce((total, value) => total + value, 0) / finiteValues.length;
}

export function standardDeviation(values) {
  const mean = average(values);
  if (mean === null || values.length < 2) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1));
}

export function calculateCarbonPressure(valuePerCapita, referenceAverage) {
  if (!Number.isFinite(valuePerCapita) || !Number.isFinite(referenceAverage) || referenceAverage <= 0) return null;
  return (valuePerCapita / referenceAverage) * 100;
}

export function calculateConfidence({ observationCount = 0, completeness = 0, validationRate = 0 } = {}) {
  const coverage = Math.min(1, Math.max(0, observationCount / 10));
  const complete = Math.min(1, Math.max(0, completeness));
  const validated = Math.min(1, Math.max(0, validationRate));
  return Number((coverage * 0.35 + complete * 0.35 + validated * 0.3).toFixed(2));
}
