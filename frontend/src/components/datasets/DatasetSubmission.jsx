import { useCallback, useEffect, useState } from 'react';
import {
  createDatasetDownloadUrl,
  listMyDatasets,
  uploadDataset,
} from '../../services/datasetService';
import { createDatasetTemplate, DATASET_TYPES, MAX_DATASET_FILE_SIZE, validateDataset } from '../../utils/datasetValidation';

function DatasetStatus({ status }) {
  return <span className={`dataset-status dataset-status-${status}`}>{status}</span>;
}

export default function DatasetSubmission({ userId }) {
  const [datasets, setDatasets] = useState([]);
  const [datasetName, setDatasetName] = useState('');
  const [datasetType, setDatasetType] = useState('Country');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [methodologyNotes, setMethodologyNotes] = useState('');
  const [yearRange, setYearRange] = useState('');
  const [file, setFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDatasets = useCallback(async () => {
    try {
      setError('');
      setDatasets(await listMyDatasets());
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your datasets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setValidation(null);
    setError('');
    setYearRange('');
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.csv') || (selectedFile.type && !['text/csv', 'application/vnd.ms-excel', 'application/csv'].includes(selectedFile.type))) {
      setValidation({ errors: ['Choose a CSV file.'], warnings: [], yearRange: '', validRows: 0 });
      return;
    }
    if (selectedFile.size > MAX_DATASET_FILE_SIZE) {
      setValidation({ errors: ['The CSV must be 50 MB or smaller.'], warnings: [], yearRange: '', validRows: 0 });
      return;
    }
    try {
      const result = validateDataset(await selectedFile.text(), datasetType);
      setValidation(result);
      setYearRange(result.yearRange);
    } catch (validationError) {
      setValidation({
        errors: [validationError.message || 'The CSV could not be read.'],
        warnings: [],
        yearRange: '',
        validRows: 0,
      });
    }
  };

  const handleDatasetTypeChange = async (event) => {
    const type = event.target.value;
    setDatasetType(type);
    if (!file) return;
    try {
      const result = validateDataset(await file.text(), type);
      setValidation(result);
      setYearRange(result.yearRange);
    } catch (validationError) {
      setValidation({ errors: [validationError.message || 'The CSV could not be read.'], warnings: [], yearRange: '', validRows: 0 });
    }
  };

  const handleTemplateDownload = () => {
    const blob = new Blob([createDatasetTemplate(datasetType)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trustcarbon-${datasetType.toLowerCase().replace(/\s+/g, '-')}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      if (!validation || validation.errors.length) {
        throw new Error('Correct the CSV validation errors before submitting.');
      }
      const parsedUrl = new URL(sourceUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Source URL must use HTTP or HTTPS.');
      }
      if (!source.trim()) throw new Error('Enter the name of the data source.');
      if (!datasetName.trim()) throw new Error('Enter a dataset name.');
      await uploadDataset({
        userId,
        file,
        datasetName: datasetName.trim(),
        datasetType,
        description: description.trim(),
        source: source.trim(),
        sourceUrl: parsedUrl.toString(),
        yearRange,
        methodologyNotes: methodologyNotes.trim(),
        validationWarnings: validation.warnings,
      });
      setDatasetName('');
      setDescription('');
      setSource('');
      setSourceUrl('');
      setMethodologyNotes('');
      setYearRange('');
      setFile(null);
      setValidation(null);
      form.reset();
      setMessage('Dataset submitted for private review. It is not part of the public data.');
      await loadDatasets();
    } catch (uploadError) {
      setError(uploadError.message || 'Dataset upload failed.');
    } finally {
      setSubmitting(false);
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

  return (
    <section className="dataset-submission" aria-labelledby="dataset-submission-title">
      <div className="industry-intro">
        <span className="section-index">PRIVATE SUBMISSIONS</span>
        <h2 id="dataset-submission-title">Submit a dataset</h2>
        <p>Submissions are private. Approval makes a dataset eligible for a separate publication review; it does not change public figures.</p>
      </div>
      <form className="dataset-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="dataset-name">Dataset name</label>
          <input id="dataset-name" className="text-input" value={datasetName} onChange={(event) => setDatasetName(event.target.value)} required maxLength={180} />
        </div>
        <div className="form-field">
          <label htmlFor="dataset-type">Dataset type</label>
          <select id="dataset-type" className="select-input" value={datasetType} onChange={(event) => void handleDatasetTypeChange(event)}>
            {DATASET_TYPES.map(({ label }) => <option key={label} value={label}>{label}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="dataset-source">Source name</label>
          <input id="dataset-source" className="text-input" value={source} onChange={(event) => setSource(event.target.value)} required maxLength={500} />
        </div>
        <div className="form-field">
          <label htmlFor="dataset-source-url">Source URL</label>
          <input id="dataset-source-url" className="text-input" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required maxLength={2000} placeholder="https://" />
        </div>
        <div className="form-field">
          <label htmlFor="dataset-description">Description</label>
          <textarea id="dataset-description" className="text-input" value={description} onChange={(event) => setDescription(event.target.value)} rows="3" maxLength={2000} required />
        </div>
        <div className="form-field">
          <label htmlFor="dataset-methodology">Methodology / notes</label>
          <textarea id="dataset-methodology" className="text-input" value={methodologyNotes} onChange={(event) => setMethodologyNotes(event.target.value)} rows="3" maxLength={4000} required />
        </div>
        <div className="dataset-file-controls">
          <div className="form-field">
            <label htmlFor="dataset-file">CSV file, maximum 50 MB</label>
            <input id="dataset-file" className="text-input" type="file" accept=".csv,text/csv" required onChange={(event) => void handleFileChange(event)} />
          </div>
          <div className="form-field">
            <label htmlFor="dataset-year-range">Year range, detected from CSV</label>
            <input id="dataset-year-range" className="text-input" value={yearRange} readOnly placeholder="Upload a valid CSV to detect years" />
          </div>
        </div>
        <div className="dataset-form-actions">
          <button type="button" className="btn btn-secondary" onClick={handleTemplateDownload}>Download CSV Template</button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !file || !validation || validation.errors.length > 0}>
            {submitting ? 'Uploading...' : 'Upload for review'}
          </button>
        </div>
        {validation && (
          <div className="csv-validation" aria-live="polite">
            <h3>CSV validation</h3>
            {validation.errors.length > 0 ? (
              <ul className="validation-errors">{validation.errors.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
            ) : (
              <p>{validation.validRows} records checked. Required columns and values are present.</p>
            )}
            {validation.warnings.length > 0 && (
              <ul className="validation-warnings">{validation.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
            )}
          </div>
        )}
      </form>
      {error && <p role="alert" className="form-feedback">{error}</p>}
      {message && <p role="status" className="form-feedback">{message}</p>}

      <div className="my-submissions">
        <div className="research-panel-heading">
          <div><span className="section-index">PRIVATE TO YOUR ACCOUNT</span><h3>My dataset submissions</h3></div>
        </div>
        {loading ? <p role="status">Loading your submissions...</p> : datasets.length === 0 ? (
          <p>No datasets submitted yet.</p>
        ) : (
          <div className="table-container">
            <table className="analytics-table">
              <thead><tr><th>Dataset</th><th>Type</th><th>Upload date</th><th>Status</th><th>Admin comment</th><th>File</th></tr></thead>
              <tbody>
                {datasets.map((dataset) => (
                  <tr key={dataset.id}>
                    <td>{dataset.file_name}</td>
                    <td>{dataset.dataset_type}</td>
                    <td>{new Date(dataset.created_at).toLocaleDateString()}</td>
                    <td><DatasetStatus status={dataset.status} /></td>
                    <td>{dataset.admin_comment || 'No comment'}</td>
                    <td><button type="button" className="text-action" onClick={() => void handleDownload(dataset)}>Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
