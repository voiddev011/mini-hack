import Papa from 'papaparse';

export const DATASET_TYPES = [
  { label: 'Country', location: 'Country' },
  { label: 'Indian State', location: 'State' },
  { label: 'Region', location: 'Region' },
  { label: 'Industry', location: 'Industry' },
];
export const MAX_DATASET_FILE_SIZE = 50 * 1024 * 1024;

export function createDatasetTemplate(type) {
  const location = DATASET_TYPES.find((item) => item.label === type)?.location || 'Country';
  return `${location},Year,CO2_Emissions,Unit,Source\r\n`;
}

export function validateDataset(csvText, type, currentYear = new Date().getFullYear()) {
  const locationColumn = DATASET_TYPES.find((item) => item.label === type)?.location;
  if (!locationColumn) {
    return { errors: ['Choose a supported dataset type.'], warnings: [], yearRange: '', validRows: 0 };
  }

  const requiredColumns = [locationColumn, 'Year', 'CO2_Emissions', 'Unit', 'Source'];
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
  });
  const errors = parsed.errors.map((error) => `CSV parse error on row ${error.row + 2}: ${error.message}`);
  const headers = parsed.meta.fields || [];
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}.`);
    return { errors, warnings: [], yearRange: '', validRows: 0 };
  }

  const seen = new Set();
  let minYear = Infinity;
  let maxYear = -Infinity;
  let validRows = 0;
  const warnings = [];
  let unusuallyLargeValue = false;

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2;
    const location = row[locationColumn]?.trim();
    const yearText = row.Year?.trim();
    const emissionsText = row.CO2_Emissions?.trim();
    const unit = row.Unit?.trim();
    const source = row.Source?.trim();

    if (!location || !yearText || !emissionsText || !unit || !source) {
      errors.push(`Row ${rowNumber} has a missing required value.`);
      return;
    }
    if (!/^\d{4}$/.test(yearText) || Number(yearText) < 1750 || Number(yearText) > currentYear) {
      errors.push(`Row ${rowNumber} has an invalid year. Use a year from 1750 through ${currentYear}.`);
      return;
    }
    const year = Number(yearText);
    const emissions = Number(emissionsText);
    if (!Number.isFinite(emissions)) {
      errors.push(`Row ${rowNumber} has a non-numeric CO2_Emissions value.`);
      return;
    }
    if (emissions < 0) {
      errors.push(`Row ${rowNumber} has negative emissions. Values must be zero or greater.`);
      return;
    }

    const key = `${location.toLocaleLowerCase()}-${year}`;
    if (seen.has(key)) {
      errors.push(`Row ${rowNumber} duplicates ${location} in ${year}.`);
      return;
    }
    seen.add(key);
    minYear = Math.min(minYear, year);
    maxYear = Math.max(maxYear, year);
    validRows += 1;
    if (emissions > 100000000) unusuallyLargeValue = true;
  });

  if (!parsed.data.length) errors.push('The CSV must contain at least one data row.');
  if (unusuallyLargeValue) {
    warnings.push('One or more emissions values are unusually large. They are retained for manual reviewer validation.');
  }

  const yearRange = validRows
    ? `${minYear} to ${maxYear}`
    : '';
  return { errors, warnings, yearRange, validRows };
}
