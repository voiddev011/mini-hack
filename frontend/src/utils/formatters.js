// Formatting utilities for carbon emissions metrics

/**
 * Formats a metric value with appropriate units (e.g. t, Mt, Gt, kg)
 * @param {number} value - The numeric value in tonnes
 * @param {boolean} precise - If true, displays decimal points
 * @returns {string} Formatted string
 */
export const formatEmissions = (value, precise = true) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "--";
  }

  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(precise ? 1 : 0)} Gt CO₂e`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(precise ? 1 : 0)} Mt CO₂e`;
  }
  if (value >= 1) {
    return `${value.toFixed(precise ? 2 : 0)} t CO₂e`;
  }
  // If value is in tonnes, but small enough to format in kg (1 tonne = 1000 kg)
  const kgValue = value * 1000;
  return `${kgValue.toFixed(0)} kg CO₂e`;
};

/**
 * Formats a per capita emission weight
 * @param {number} value - Per capita value in tonnes
 * @returns {string} Formatted string
 */
export const formatPerCapita = (value) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "--";
  }
  return `${value.toFixed(2)} t / person`;
};

/**
 * Standard number formatter with commas
 * @param {number} num - Raw number
 * @returns {string}
 */
export const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) {
    return "--";
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
