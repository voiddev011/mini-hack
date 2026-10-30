import { useCallback, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { useAuth } from '../hooks/useAuth';
import { createDatasetDownloadUrl, parseDatasetMetadata } from '../services/datasetService';
import { listDatasetsForReview, reviewDataset } from '../services/adminService';

const STATUSES = ['all', 'pending', 'approved', 'rejected'];

function DatasetStatus({ status }) {
  return <span className={`dataset-status dataset-status-${status}`}>{status}</span>;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [comments, setComments] = useState({});
  const [activeFilter, setActiveFilter] = useState('pending');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyDatasetId, setBusyDatasetId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDatasets = useCallback(async () => {
    try {
      setError('');
      setDatasets(await listDatasetsForReview());
    } catch (loadError) {
      setError(loadError.message || 'Unable to load dataset submissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  const counts = useMemo(() => ({
    total: datasets.length,
    pending: datasets.filter((dataset) => dataset.status === 'pending').length,
    approved: datasets.filter((dataset) => dataset.status === 'approved').length,
    rejected: datasets.filter((dataset) => dataset.status === 'rejected').length,
  }), [datasets]);
  const filteredDatasets = activeFilter === 'all'
    ? datasets
    : datasets.filter((dataset) => dataset.status === activeFilter);

  const handleReview = async (datasetId, decision) => {
    setBusyDatasetId(datasetId);
    setError('');
    setMessage('');
    try {
      await reviewDataset({
        datasetId,
        reviewerId: profile.id,
        decision,
        comment: comments[datasetId] || '',
      });
      setMessage(`Dataset ${decision}. It remains private and is not automatically added to public data.`);
      await loadDatasets();
    } catch (reviewError) {
      setError(reviewError.message || 'Unable to review this dataset.');
    } finally {
      setBusyDatasetId('');
    }
  };

  const handleDownload = async (dataset) => {
    try {
      setError('');
      const url = await createDatasetDownloadUrl(dataset.file_url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      setError(downloadError.message || 'Unable to download this dataset.');
    }
  };

  const handlePreview = async (dataset) => {
    setError('');
    setPreview({ datasetId: dataset.id, loading: true, rows: [], fields: [] });
    try {
      const url = await createDatasetDownloadUrl(dataset.file_url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`CSV preview could not be loaded (${response.status}).`);
      const csvText = await response.text();
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        preview: 10,
        transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
      });
      if (result.errors.length) throw new Error(result.errors[0].message);
      setPreview({ datasetId: dataset.id, loading: false, rows: result.data, fields: result.meta.fields || [] });
    } catch (previewError) {
      setPreview(null);
      setError(previewError.message || 'Unable to preview this CSV.');
    }
  };

  return (
    <div className="page-container admin-review-page">
      <header className="industry-intro">
        <span className="section-index">TRUSTCARBON / DATA REVIEW</span>
        <h1>Dataset review</h1>
        <p>Review submitted sources and validation notes. Approval is not publication; an approved submission remains separate from the public data.</p>
      </header>
      <dl className="admin-summary" aria-label="Dataset submission totals">
        <div><dt>Total submissions</dt><dd>{counts.total}</dd></div>
        <div><dt>Pending</dt><dd>{counts.pending}</dd></div>
        <div><dt>Approved</dt><dd>{counts.approved}</dd></div>
        <div><dt>Rejected</dt><dd>{counts.rejected}</dd></div>
      </dl>
      {error && <p role="alert" className="form-feedback">{error}</p>}
      {message && <p role="status" className="form-feedback">{message}</p>}

      <div className="admin-review-toolbar">
        <div className="admin-filter-tabs" aria-label="Filter submissions by status">
          {STATUSES.map((status) => (
            <button
              type="button"
              key={status}
              className={`research-tab${activeFilter === status ? ' active' : ''}`}
              onClick={() => setActiveFilter(status)}
            >
              {status === 'all' ? 'All' : `${status} (${counts[status]})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p role="status">Loading submissions...</p> : filteredDatasets.length === 0 ? (
        <p className="country-empty-state">No {activeFilter === 'all' ? '' : `${activeFilter} `}submissions.</p>
      ) : (
        <div className="admin-dataset-list">
          {filteredDatasets.map((dataset) => {
            const metadata = parseDatasetMetadata(dataset.description);
            return (
              <article className="admin-dataset-row" key={dataset.id}>
                <div className="admin-dataset-heading">
                  <div>
                    <span className="section-index">{dataset.dataset_type} / {metadata.yearRange || 'Year range unavailable'}</span>
                    <h2>{dataset.file_name}</h2>
                    <p>{dataset.uploader_email} · Uploaded {new Date(dataset.created_at).toLocaleString()}</p>
                  </div>
                  <DatasetStatus status={dataset.status} />
                </div>
                <dl className="admin-dataset-metadata">
                  <div><dt>Source</dt><dd>{dataset.source || 'Not provided'}</dd></div>
                  <div><dt>Source URL</dt><dd>{metadata.sourceUrl ? <a href={metadata.sourceUrl} target="_blank" rel="noreferrer">{metadata.sourceUrl}</a> : 'Not provided'}</dd></div>
                  <div><dt>Description</dt><dd>{metadata.description || dataset.description || 'Not provided'}</dd></div>
                  <div><dt>Methodology / notes</dt><dd>{metadata.methodologyNotes || 'Not provided'}</dd></div>
                </dl>
                {metadata.validationWarnings?.length > 0 && (
                  <div className="validation-warnings">
                    {metadata.validationWarnings.map((warning) => <p key={warning}>{warning}</p>)}
                  </div>
                )}
                {dataset.admin_comment && <p className="review-comment"><b>Review note:</b> {dataset.admin_comment}</p>}
                <div className="admin-dataset-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => void handlePreview(dataset)}>Preview CSV</button>
                  <button type="button" className="text-action" onClick={() => void handleDownload(dataset)}>Download CSV</button>
                </div>
                {preview?.datasetId === dataset.id && (
                  <div className="csv-preview">
                    <h3>CSV preview, first 10 records</h3>
                    {preview.loading ? <p role="status">Loading preview...</p> : (
                      <div className="table-container">
                        <table className="analytics-table">
                          <thead><tr>{preview.fields.map((field) => <th key={field}>{field}</th>)}</tr></thead>
                          <tbody>
                            {preview.rows.map((row, index) => (
                              <tr key={index}>{preview.fields.map((field) => <td key={field}>{row[field]}</td>)}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                {dataset.status === 'pending' && (
                  <>
                    <div className="form-field">
                      <label htmlFor={`review-comment-${dataset.id}`}>Rejection reason, required to reject</label>
                      <textarea
                        id={`review-comment-${dataset.id}`}
                        className="text-input"
                        rows="2"
                        maxLength={2000}
                        value={comments[dataset.id] || ''}
                        onChange={(event) => setComments((previous) => ({ ...previous, [dataset.id]: event.target.value }))}
                      />
                    </div>
                    <div className="admin-dataset-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busyDatasetId === dataset.id}
                        onClick={() => void handleReview(dataset.id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busyDatasetId === dataset.id || !comments[dataset.id]?.trim()}
                        onClick={() => void handleReview(dataset.id, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}
                {dataset.status !== 'pending' && (
                  <p className="review-comment">Reviewed {dataset.reviewed_at ? new Date(dataset.reviewed_at).toLocaleString() : 'date unavailable'}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
