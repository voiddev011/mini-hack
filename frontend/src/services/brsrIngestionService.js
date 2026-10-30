import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 400;
const MAX_TEXT_LENGTH = 12_000_000;

const FIELD_RULES = [
  { key: 'scope1', label: 'Scope 1 emissions', pattern: /\bscope\s*(?:1|one|i)\b.{0,60}\bemissions?\b|\bemissions?\b.{0,60}\bscope\s*(?:1|one|i)\b/i, excludes: /\bscope\s*1\b.*\bscope\s*2\b/i },
  { key: 'scope2', label: 'Scope 2 emissions', pattern: /\bscope\s*(?:2|two|ii)\b.{0,60}\bemissions?\b|\bemissions?\b.{0,60}\bscope\s*(?:2|two|ii)\b/i, excludes: /\bscope\s*1\b.*\bscope\s*2\b/i },
  { key: 'scope3', label: 'Scope 3 emissions', pattern: /\bscope\s*(?:3|three|iii)\b.{0,60}\bemissions?\b|\bemissions?\b.{0,60}\bscope\s*(?:3|three|iii)\b/i },
  { key: 'reportedTotal', label: 'Total GHG emissions', pattern: /\b(?:total|gross)\s+(?:ghg|greenhouse gas)\b/i, excludes: /\bintensity\b/i },
  { key: 'emissionsIntensity', label: 'Emissions intensity', pattern: /\b(?:emissions?|ghg|greenhouse gas).*?\bintensity\b|\bintensity\b.*?\b(?:emissions?|ghg|tco2e|co2e)\b/i },
  { key: 'totalEnergy', label: 'Total energy consumption', pattern: /\btotal\s+energy\s+(?:consumption|consumed)\b/i },
  { key: 'renewableEnergy', label: 'Renewable energy consumption', pattern: /\b(?:renewable|renewables)\b.*\benergy\b|\benergy\b.*\b(?:renewable|renewables)\b/i },
];

function pageLines(items) {
  const lines = new Map();
  items.forEach((item) => {
    if (!item.str?.trim()) return;
    const yValue = item.transform[5];
    const y = [...lines.keys()].find((candidate) => Math.abs(candidate - yValue) <= 5)
      ?? Math.round(yValue / 2) * 2;
    const row = lines.get(y) || [];
    row.push({ x: item.transform[4], text: item.str });
    lines.set(y, row);
  });
  return [...lines.entries()]
    .sort(([first], [second]) => second - first)
    .map(([, row]) => row.sort((first, second) => first.x - second.x)
      .map((item) => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean);
}

function parseNumericCells(line) {
  const values = [];
  const withoutLabels = line
    .replace(/^\s*\d{1,2}[.)]?\s+/, '')
    .replace(/\bscope\s*(?:1|2|3|one|two|three|i|ii|iii)\b/gi, ' ')
    .replace(/\bco\s*2\s*e\b/gi, ' ')
    .replace(/(?:FY|financial\s+year\s*)?\s*(?:19|20)\d{2}\s*[-–/]\s*\d{2,4}/gi, ' ');
  const expression = /(?<![\w/])(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?(?![\w/])/g;
  for (const match of withoutLabels.matchAll(expression)) {
    const value = Number(match[0].replaceAll(',', ''));
    if (!Number.isFinite(value) || (Number.isInteger(value) && value >= 1900 && value <= 2100)) continue;
    values.push(value);
  }
  return values;
}

function fiscalYearHeaders(lines, index) {
  const header = lines.slice(Math.max(0, index - 8), index)
    .reverse()
    .find((line) => /(?:FY|financial\s+year)\s*(?:19|20)\d{2}\s*[-–/]\s*\d{2,4}/i.test(line));
  return header
    ? [...new Set([...header.matchAll(/(?:FY|financial\s+year)\s*((?:19|20)\d{2}\s*[-–/]\s*\d{2,4})/gi)]
      .map((match) => `FY${match[1].replace(/\s+/g, '')}`))]
    : [];
}

function reportingBoundaries(lines, index) {
  const header = lines.slice(Math.max(0, index - 8), index)
    .reverse()
    .find((line) => /\bstandalone\b/i.test(line) && /\bconsolidated\b/i.test(line));
  return header ? ['Standalone', 'Consolidated'] : [];
}

function extractCandidates(pages) {
  const candidates = [];
  pages.forEach(({ page, lines }) => {
    lines.forEach((line, index) => {
      FIELD_RULES.forEach((field) => {
        if (!field.pattern.test(line) || field.excludes?.test(line)) return;
        if (/\bnotes?\s*\d*\s*:/i.test(line)
          || /^\s*\d{1,2}[.)]?\s*(?:explanation|provide details)\b/i.test(line)) return;
        const evidence = line;
        const values = parseNumericCells(line);
        const yearHeaders = fiscalYearHeaders(lines, index);
        const boundaries = reportingBoundaries(lines, index);
        values.forEach((value, valueIndex) => {
          const boundaryIndex = Math.floor(valueIndex / Math.max(1, yearHeaders.length));
          const boundary = boundaries.length ? boundaries[Math.min(boundaryIndex, boundaries.length - 1)] : '';
          const year = yearHeaders.length ? yearHeaders[valueIndex % yearHeaders.length] : null;
          candidates.push({
            id: `${page}-${field.key}-${candidates.length}`,
            key: field.key,
            label: field.label,
            value,
            unit: inferUnit(field.key, line),
            page,
            evidence: evidence.slice(0, 700),
            columnHeader: [boundary, year].filter(Boolean).join(' · ') || `Value ${valueIndex + 1}`,
            cellIndex: valueIndex + 1,
          });
        });
      });
    });
  });
  return candidates;
}

function inferUnit(key, evidence) {
  if (key === 'totalEnergy' || key === 'renewableEnergy') {
    return /\bpeta\s*joule|\bpj\b/i.test(evidence) ? 'PJ'
      : /\bgj\b|giga\s*joule/i.test(evidence) ? 'GJ'
        : /\bmwh\b/i.test(evidence) ? 'MWh' : 'Not stated in extracted row';
  }
  if (key === 'emissionsIntensity') {
    if (/million\s+tonnes?/i.test(evidence) && /turnover|revenue/i.test(evidence)) {
      return /crore/i.test(evidence)
        ? 'Mt CO₂e/₹ crore turnover'
        : 'Mt CO₂e/reported turnover unit';
    }
    const unit = evidence.match(/(?:t\s*(?:co2e|co₂e)|kg\s*(?:co2e|co₂e))\s*(?:\/|per)\s*[^,;|]+/i)?.[0];
    if (/tonnes?\/tonnes?.*crude steel|tonnes? per tonnes?.*crude steel/i.test(evidence)) return 't CO₂e/t crude steel';
    return unit?.trim() || 'Not stated in extracted row';
  }
  return /million\s+tonnes?/i.test(evidence) ? 'Mt CO₂e'
    : /kt\s*(?:co2e|co₂e)/i.test(evidence) ? 'kt CO₂e'
    : /mt\s*(?:co2e|co₂e)/i.test(evidence) ? 'Mt CO₂e'
      : 't CO₂e';
}

export async function extractBRSRDocument(file) {
  if (!(file instanceof File)) throw new Error('Select a PDF report to extract.');
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('BRSR ingestion accepts PDF files only.');
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('The selected PDF exceeds the 50 MB local-ingestion limit.');
  if (file.size === 0) throw new Error('The selected PDF is empty.');

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    isEvalSupported: false,
    useSystemFonts: true,
    stopAtErrors: true,
  });
  const document = await loadingTask.promise;
  if (document.numPages > MAX_PAGES) {
    const pageCount = document.numPages;
    await loadingTask.destroy();
    throw new Error(`The report has ${pageCount} pages; local ingestion is limited to ${MAX_PAGES}.`);
  }

  const pages = [];
  let textLength = 0;
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = pageLines(content.items);
      textLength += lines.reduce((total, line) => total + line.length, 0);
      if (textLength > MAX_TEXT_LENGTH) throw new Error('Extracted PDF text exceeds the local-processing limit.');
      pages.push({ page: pageNumber, lines });
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  const candidates = extractCandidates(pages);
  return {
    fileName: file.name,
    pageCount: pages.length,
    candidates,
    extractedAt: new Date().toISOString(),
    extractionStatus: candidates.length ? 'Candidates require human review and confirmation.' : 'No supported metric rows were detected; no values were inferred.',
  };
}
