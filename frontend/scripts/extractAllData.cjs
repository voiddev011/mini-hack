const fs = require("fs");
const path = require("path");

const transcriptPath =
  "C:\\Users\\Aditya Chavan\\.gemini\\antigravity\\brain\\b224b862-1381-42f3-b453-efbc2b5dbac7\\.system_generated\\logs\\transcript_full.jsonl";

const fileContent = fs.readFileSync(transcriptPath, "utf8");

// Parse lines of transcript
let promptText = "";
fileContent.split("\n").forEach((line) => {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    if (
      obj.type === "USER_INPUT" &&
      obj.content &&
      obj.content.includes("Carbon_(CO2)_Emissions_by_Country.csv")
    ) {
      promptText = obj.content;
    }
  } catch {}
});

if (!promptText) {
  console.log("Fallback to raw text search...");
  promptText = fileContent;
}

// 1. India Dataset
const indiaMatch = promptText.match(
  /States,per capita CO2 \(kg per person\),per capita CO \(kg per person\),per capita CH4 \(kg per person\)([\s\S]*?)(?=Country,Region,Date|$)/,
);
if (indiaMatch) {
  const indiaLines = indiaMatch[1]
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l.includes(","));
  const indiaRecords = indiaLines
    .map((line) => {
      const cols = line.split(",");
      return {
        state: cols[0].trim(),
        co2PerCapita: parseFloat(cols[1]),
        coPerCapita: parseFloat(cols[2]),
        ch4PerCapita: parseFloat(cols[3]),
      };
    })
    .filter((r) => r.state && !isNaN(r.co2PerCapita));

  fs.writeFileSync(
    path.join(__dirname, "../src/data/indiaEmissions.js"),
    `export const INDIA_EMISSIONS = ${JSON.stringify(indiaRecords, null, 2)};\n`,
  );
  console.log("INDIA DATASET RECORD COUNT:", indiaRecords.length);
}

// 2. Country Dataset
const countryIdx = promptText.indexOf(
  "Country,Region,Date,Kilotons of Co2,Metric Tons Per Capita",
);
if (countryIdx !== -1) {
  const countrySection = promptText.substring(countryIdx);
  const countryLines = countrySection
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l.includes(","));

  // First line is header
  const countryRecords = [];
  for (let i = 1; i < countryLines.length; i++) {
    const cols = countryLines[i].split(",");
    if (cols.length >= 5) {
      const country = cols[0].trim();
      const region = cols[1].trim();
      const dateStr = cols[2].trim();
      const year = parseInt(dateStr.slice(-4), 10);
      const kt = parseFloat(cols[3]);
      const pc = parseFloat(cols[4]);
      if (country && region && !isNaN(year) && !isNaN(kt) && !isNaN(pc)) {
        countryRecords.push({
          country,
          region,
          date: dateStr,
          year,
          kilotonsCo2: kt,
          metricTonsPerCapita: pc,
        });
      }
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "../src/data/countryEmissions.js"),
    `export const COUNTRY_EMISSIONS = ${JSON.stringify(countryRecords, null, 2)};\n`,
  );
  console.log("COUNTRY DATASET RECORD COUNT:", countryRecords.length);
}
