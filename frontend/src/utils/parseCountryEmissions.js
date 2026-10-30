import Papa from 'papaparse';

export function parseCountryEmissions(csvText) {
  const { data, errors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    throw new Error(`Could not parse country emissions CSV: ${errors[0].message}`);
  }

  return data
    .map((row) => {
      const year = row.Date?.match(/(\d{4})$/)?.[1];
      return [
        row.Country?.trim(),
        row.Region?.trim(),
        Number(year),
        Number(row['Kilotons of Co2']),
        Number(row['Metric Tons Per Capita']),
      ];
    })
    .filter(([country, region, year, kilotons, perCapita]) =>
      country && region && Number.isFinite(year) && Number.isFinite(kilotons) && Number.isFinite(perCapita)
    );
}
