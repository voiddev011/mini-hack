const fs = require("fs");
const path = require("path");

const transcriptPath =
  "C:\\Users\\Aditya Chavan\\.gemini\\antigravity\\brain\\b224b862-1381-42f3-b453-efbc2b5dbac7\\.system_generated\\logs\\transcript_full.jsonl";

try {
  const content = fs.readFileSync(transcriptPath, "utf-8");
  const lines = content.split("\n");
  let userText = "";

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === "USER_INPUT" && parsed.content) {
        userText += parsed.content;
      }
    } catch {
      // skip invalid lines
    }
  }

  // 1. Extract India CSV
  const indiaMatch = userText.match(
    /States,per capita CO2 \(kg per person\),per capita CO \(kg per person\),per capita CH4 \(kg per person\)[\s\S]*?(?=Country,Region,Date|$)/,
  );
  if (indiaMatch) {
    const indiaLines = indiaMatch[0]
      .trim()
      .split("\n")
      .filter((l) => l.trim());
    const records = [];
    for (let i = 1; i < indiaLines.length; i++) {
      const cols = indiaLines[i].split(",");
      if (cols.length >= 4) {
        records.push({
          state: cols[0].trim(),
          co2PerCapita: parseFloat(cols[1]),
          coPerCapita: parseFloat(cols[2]),
          ch4PerCapita: parseFloat(cols[3]),
        });
      }
    }
    fs.writeFileSync(
      path.join(__dirname, "../src/data/indiaEmissions.js"),
      `export const INDIA_EMISSIONS = ${JSON.stringify(records, null, 2)};\n`,
    );
    console.log("Extracted India CSV:", records.length, "records.");
  }

  // 2. Extract Country CSV
  const countryMatch = userText.match(
    /Country,Region,Date,Kilotons of Co2,Metric Tons Per Capita[\s\S]*/,
  );
  if (countryMatch) {
    const countryLines = countryMatch[0]
      .trim()
      .split("\n")
      .filter((l) => l.trim());
    const records = [];
    for (let i = 1; i < countryLines.length; i++) {
      const cols = countryLines[i].split(",");
      if (cols.length >= 5) {
        const dateStr = cols[2].trim();
        const year = parseInt(dateStr.slice(-4), 10);
        const kt = parseFloat(cols[3]);
        const pc = parseFloat(cols[4]);
        if (!isNaN(kt) && !isNaN(pc)) {
          records.push({
            country: cols[0].trim(),
            region: cols[1].trim(),
            date: dateStr,
            year: year,
            kilotonsCo2: kt,
            metricTonsPerCapita: pc,
          });
        }
      }
    }
    fs.writeFileSync(
      path.join(__dirname, "../src/data/countryEmissions.js"),
      `export const COUNTRY_EMISSIONS = ${JSON.stringify(records, null, 2)};\n`,
    );
    console.log("Extracted Country CSV:", records.length, "records.");
  }
} catch (err) {
  console.error("Error extracting datasets:", err);
}
