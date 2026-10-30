const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\Aditya Chavan\\.gemini\\antigravity\\brain\\b224b862-1381-42f3-b453-efbc2b5dbac7\\.system_generated\\logs\\transcript_full.jsonl';
const fileContent = fs.readFileSync(transcriptPath, 'utf8');
const lines = fileContent.split('\n');
const firstLineObj = JSON.parse(lines[0]);
const prompt = firstLineObj.content;

// 1. India dataset
const indiaHeader = 'States,per capita CO2 (kg per person),per capita CO (kg per person),per capita CH4 (kg per person)';
const countryHeader = 'Country,Region,Date,Kilotons of Co2,Metric Tons Per Capita';

const indiaStart = prompt.indexOf(indiaHeader);
const countryStart = prompt.indexOf(countryHeader);

if (indiaStart !== -1 && countryStart !== -1) {
  const indiaChunk = prompt.substring(indiaStart + indiaHeader.length, countryStart).trim();
  const indiaLines = indiaChunk.split('\n').map(l => l.trim()).filter(l => l);
  const indiaRecords = indiaLines.map(line => {
    const cols = line.split(',');
    return {
      state: cols[0].trim(),
      co2PerCapita: parseFloat(cols[1]),
      coPerCapita: parseFloat(cols[2]),
      ch4PerCapita: parseFloat(cols[3])
    };
  }).filter(r => r.state && !isNaN(r.co2PerCapita));

  fs.writeFileSync(
    path.join(__dirname, '../src/data/indiaEmissions.js'),
    `export const INDIA_EMISSIONS = ${JSON.stringify(indiaRecords, null, 2)};\n`
  );
  console.log('INDIA RECORDS EXTRACTED:', indiaRecords.length);

  const countryChunk = prompt.substring(countryStart + countryHeader.length).trim();
  const countryLines = countryChunk.split('\n').map(l => l.trim()).filter(l => l);
  const countryRecords = [];

  for (const line of countryLines) {
    if (line.includes('</USER_REQUEST>')) break;
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

  fs.writeFileSync(
    path.join(__dirname, '../src/data/countryEmissions.js'),
    `export const COUNTRY_EMISSIONS = ${JSON.stringify(countryRecords, null, 2)};\n`
  );
  console.log('COUNTRY RECORDS EXTRACTED:', countryRecords.length);
}
