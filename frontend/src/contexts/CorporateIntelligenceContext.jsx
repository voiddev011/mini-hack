import { useCallback, useMemo, useState } from "react";
import { corporateDataStore } from "./corporateDataStore";

function normalizeCompany(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function CorporateIntelligenceProvider({ children }) {
  const [company, setCompany] = useState("Tata Steel Limited");
  const [reportingYear, setReportingYear] = useState("FY2024-25");
  const [reports, setReports] = useState([]);
  const [benchmark, setBenchmark] = useState(null);
  const [greenScenario, setGreenScenario] = useState(null);
  const [newDataAlert, setNewDataAlert] = useState(null);
  const [sessionAlertRules, setSessionAlertRules] = useState([]);
  const [sessionAlertEvents, setSessionAlertEvents] = useState([]);

  const currentReport = useMemo(
    () =>
      reports
        .filter(
          (report) =>
            normalizeCompany(report.company) === normalizeCompany(company) &&
            report.reportingYear === reportingYear,
        )
        .at(-1) || null,
    [company, reportingYear, reports],
  );
  const companyReports = useMemo(
    () =>
      reports
        .filter(
          (report) =>
            normalizeCompany(report.company) === normalizeCompany(company),
        )
        .slice()
        .sort((first, second) =>
          second.reportingYear.localeCompare(first.reportingYear),
        ),
    [company, reports],
  );

  const addImportedReport = useCallback(
    (report) => {
      const imported = {
        ...report,
        id: `${normalizeCompany(company)}:${report.reportingYear}:${report.fileName}:${Date.now()}`,
        company,
      };
      setReports((current) => [
        ...current.filter(
          (item) =>
            normalizeCompany(item.company) !== normalizeCompany(company) ||
            item.reportingYear !== report.reportingYear,
        ),
        imported,
      ]);
      setReportingYear(report.reportingYear);
      setNewDataAlert({
        company,
        reportingYear: report.reportingYear,
        metrics: report.candidates.map((candidate) => candidate.label),
        source: report.sourceUrl || report.fileName,
        receivedAt: new Date().toISOString(),
        status:
          "Manually imported by the user; not an automated monitoring event.",
      });
    },
    [company],
  );

  const confirmMetric = useCallback(
    (candidate) => {
      if (!currentReport)
        throw new Error(
          "Import a company BRSR PDF before confirming extracted metrics.",
        );
      const metric = {
        value: candidate.value,
        unit: candidate.unit,
        source: currentReport.sourceUrl || currentReport.fileName,
        sourceLabel: currentReport.sourceUrl
          ? "Company-hosted report URL supplied by user"
          : "User-supplied local PDF",
        page: candidate.page,
        evidence: candidate.evidence,
        reportingColumn: candidate.columnHeader,
        status:
          "Reported by company (document supplied by user; candidate confirmed by user)",
        confirmation:
          "User-confirmed PDF extraction candidate; not independently audited by TrustCarbon.",
      };
      setReports((current) =>
        current.map((report) =>
          report.id === currentReport.id
            ? {
                ...report,
                confirmedMetrics: {
                  ...report.confirmedMetrics,
                  [candidate.key]: metric,
                },
              }
            : report,
        ),
      );
    },
    [currentReport],
  );

  const chooseCompany = useCallback((name) => setCompany(name.trim()), []);

  const value = useMemo(
    () => ({
      company,
      setCompany: chooseCompany,
      reportingYear,
      setReportingYear,
      reports: companyReports,
      currentReport,
      addImportedReport,
      confirmMetric,
      benchmark,
      setBenchmark,
      greenScenario,
      setGreenScenario,
      newDataAlert,
      sessionAlertRules,
      setSessionAlertRules,
      sessionAlertEvents,
      setSessionAlertEvents,
    }),
    [
      company,
      reportingYear,
      companyReports,
      currentReport,
      addImportedReport,
      confirmMetric,
      chooseCompany,
      benchmark,
      greenScenario,
      newDataAlert,
      sessionAlertRules,
      sessionAlertEvents,
    ],
  );

  return (
    <corporateDataStore.Provider value={value}>
      {children}
    </corporateDataStore.Provider>
  );
}
