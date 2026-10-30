import { useEffect, useState } from 'react';
import { useCorporateIntelligence } from '../../hooks/useCorporateIntelligence';
import { extractBRSRDocument } from '../../services/brsrIngestionService';

export const TATA_STEEL_BRSR_URL = 'https://www.tatasteel.com/media/23967/brsr.pdf';
export const TATA_STEEL_BRSR_LANDING_URL = 'https://www.tatasteel.com/investors/integrated-reportannual-report/';

export default function BRSRDocumentImport() {
  const {
    company,
    reportingYear,
    currentReport,
    addImportedReport,
    confirmMetric,
  } = useCorporateIntelligence();
  const [sourceUrl, setSourceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSourceUrl(company === 'Tata Steel Limited' && reportingYear === 'FY2024-25'
      ? TATA_STEEL_BRSR_URL
      : '');
  }, [company, reportingYear]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const extraction = await extractBRSRDocument(file);
      addImportedReport({
        ...extraction,
        company,
        reportingYear,
        sourceUrl: sourceUrl.trim(),
      });
    } catch (loadError) {
      setError(loadError.message || 'The BRSR PDF could not be processed.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = (candidate) => {
    try {
      confirmMetric(candidate);
      setError('');
    } catch (confirmationError) {
      setError(confirmationError.message);
    }
  };

  return (
    <section className="tc-panel tc-brsr-ingestion">
      <div className="tc-panel-heading">
        <div><span className="tc-eyebrow">LOCAL DOCUMENT INGESTION</span><h2>Import a company BRSR PDF</h2></div>
        <span className="tc-unit-tag">PDF · ≤50 MB · ≤400 pages</span>
      </div>
      <p>PDF text is extracted in your browser. Documents are not sent to TrustCarbon or stored in Supabase. Extraction candidates are unverified until you review the source row and confirm the correct reporting column.</p>
      <div className="tc-brsr-source-links">
        <a href="https://www.sebi.gov.in/sebi_data/commondocs/jul-2023/Annexure_II-Updated-BRSR_p.PDF" target="_blank" rel="noreferrer">SEBI BRSR format ↗</a>
        <a href={TATA_STEEL_BRSR_LANDING_URL} target="_blank" rel="noreferrer">Tata Steel official reports ↗</a>
        <a href={TATA_STEEL_BRSR_URL} target="_blank" rel="noreferrer">Tata Steel FY2024-25 BRSR PDF ↗</a>
      </div>
      <div className="tc-brsr-upload-controls">
        <label className="tc-brsr-source-input">
          <span>PUBLIC REPORT URL (OPTIONAL, CITATION ONLY)</span>
          <input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://company.example/reports/brsr.pdf" />
        </label>
        <label className="tc-outline-action tc-brsr-file-button">
          {busy ? 'Extracting locally…' : 'Choose BRSR PDF'}
          <input type="file" accept="application/pdf,.pdf" onChange={handleFile} disabled={busy} />
        </label>
      </div>
      {error && <p className="tc-error" role="alert">{error}</p>}
      {busy && <p className="tc-state-card" role="status">Reading PDF pages in your browser. This may take a moment…</p>}

      {currentReport && (
        <>
          <div className="tc-brsr-extraction-status" role="status">
            <strong>{currentReport.fileName}</strong>
            <span>{currentReport.reportingYear} · {currentReport.pageCount} pages · {currentReport.extractionStatus}</span>
          </div>
          {currentReport.candidates.length ? (
            <div className="tc-brsr-candidate-list">
              <h3>Extraction candidates · review the original row and column before confirming</h3>
              {currentReport.candidates.map((candidate) => (
                <article key={candidate.id}>
                  <div className="tc-brsr-candidate-heading">
                    <strong>{candidate.label}</strong>
                    <span>{candidate.columnHeader}</span>
                    <b>{candidate.value.toLocaleString()} {candidate.unit}</b>
                  </div>
                  <p>{candidate.evidence}</p>
                  <small>PDF page {candidate.page} · table cell {candidate.cellIndex} · Candidate only, not a verified metric</small>
                  <button type="button" className="tc-text-link" onClick={() => handleConfirm(candidate)}>Confirm this reported value</button>
                </article>
              ))}
            </div>
          ) : <p className="tc-empty-note">No supported metric rows were detected. Review the document manually; no values were inferred.</p>}
          {Object.entries(currentReport.confirmedMetrics || {}).length > 0 && (
            <p className="tc-brsr-confirmed-note" role="status">
              {Object.keys(currentReport.confirmedMetrics).length} value(s) confirmed by the user. TrustCarbon does not independently assure the uploaded disclosure.
            </p>
          )}
        </>
      )}
    </section>
  );
}
