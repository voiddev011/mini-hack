import { useCorporateIntelligence } from "../../hooks/useCorporateIntelligence";

const KNOWN_COMPANIES = [
  "Tata Steel Limited",
  "JSW Steel Limited",
  "Steel Authority of India Limited",
  "Jindal Steel & Power Limited",
  "Hindalco Industries Limited",
  "Reliance Industries Limited",
  "Infosys Limited",
  "Tata Consultancy Services Limited",
];

export default function CorporateCompanyBar() {
  const {
    company,
    setCompany,
    reportingYear,
    setReportingYear,
    reports,
    currentReport,
  } = useCorporateIntelligence();

  return (
    <section className="tc-panel tc-corporate-company-bar">
      <label>
        <span className="tc-eyebrow">SELECT / SEARCH COMPANY</span>
        <input
          list="tc-company-directory"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          aria-label="Search or select a company"
          placeholder="Type a company name"
        />
        <datalist id="tc-company-directory">
          {KNOWN_COMPANIES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </label>
      <label>
        <span className="tc-eyebrow">REPORTING YEAR</span>
        <select
          value={reportingYear}
          onChange={(event) => setReportingYear(event.target.value)}
        >
          {Array.from({ length: 16 }, (_, index) => 2025 - index).map(
            (year) => (
              <option
                key={year}
                value={`FY${year}-${String(year + 1).slice(-2)}`}
              >
                FY{year}-{String(year + 1).slice(-2)}
              </option>
            ),
          )}
        </select>
      </label>
      <div className="tc-corporate-report-status">
        <span
          className={`tc-severity tc-severity-${currentReport ? "low" : "medium"}`}
        >
          {currentReport ? "DOCUMENT LOADED" : "NO REPORT"}
        </span>
        <small>
          {reports.length} report{reports.length === 1 ? "" : "s"} in this
          browser session
        </small>
      </div>
    </section>
  );
}
