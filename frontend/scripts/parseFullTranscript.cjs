const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\Aditya Chavan\\.gemini\\antigravity\\brain\\b224b862-1381-42f3-b453-efbc2b5dbac7\\.system_generated\\logs\\transcript_full.jsonl';
let fileContent = fs.readFileSync(transcriptPath, 'utf8');

// Unescape literal \n and \r
fileContent = fileContent.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '');

const lines = fileContent.split('\n').map(l => l.trim());

const indiaRecords = [];
const countryRecords = [];

let inIndia = false;
let inCountry = false;

for (const line of lines) {
  if (line.startsWith('States,per capita CO2')) {
    inIndia = true;
    inCountry = false;
    continue;
  }
  if (line.startsWith('Country,Region,Date')) {
    inIndia = false;
    inCountry = true;
    continue;
  }
  if (line.includes('</USER_REQUEST>')) {
    inIndia = false;
    inCountry = false;
    continue;
  }

  if (inIndia) {
    const cols = line.split(',');
    if (cols.length >= 4) {
      const state = cols[0].trim();
      const co2 = parseFloat(cols[1]);
      const co = parseFloat(cols[2]);
      const ch4 = parseFloat(cols[3]);
      if (state && !isNaN(co2)) {
        indiaRecords.push({ state, co2PerCapita: co2, coPerCapita: co, ch4PerCapita: ch4 });
      }
    }
  }

  if (inCountry) {
    const cols = line.split(',');
    if (cols.length >= 5) {
      const country = cols[0].trim();
      const region = cols[1].trim();
      const dateStr = cols[2].trim();
      const year = parseInt(dateStr.slice(-4), 10);
      const kt = parseFloat(cols[3]);
      const pc = parseFloat(cols[4]);
      if (country && region && !isNaN(year) && !isNaN(kt) && !isNaN(pc)) {
        countryRecords.push({ country, region, date: dateStr, year, kilotonsCo2: kt, metricTonsPerCapita: pc });
      }
    }
  }
}

fs.writeFileSync(
  path.join(__dirname, '../src/data/indiaEmissions.js'),
  `export const INDIA_EMISSIONS = ${JSON.stringify(indiaRecords, null, 2)};\n`
);

fs.writeFileSync(
  path.join(__dirname, '../src/data/countryEmissions.js'),
  `export const COUNTRY_EMISSIONS = ${JSON.stringify(countryRecords, null, 2)};\n`
);

console.log('EXTRACTED INDIA RECORDS:', indiaRecords.length);
console.log('EXTRACTED COUNTRY RECORDS:', countryRecords.length);
