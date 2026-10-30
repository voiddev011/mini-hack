import React, { useState, useMemo } from 'react';
import { REGIONS, YEARS } from '../data/realData';

export default function DataTable({ data }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [sortField, setSortField] = useState('entity');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isEmpty = !data || data.length === 0;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const processedData = useMemo(() => {
    if (!data) return [];
    let result = [...data];

    if (searchTerm) {
      result = result.filter(item =>
        item.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.region.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (regionFilter !== 'All') {
      result = result.filter(item => item.region === regionFilter);
    }

    if (yearFilter !== 'All') {
      result = result.filter(item => item.year === Number(yearFilter));
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchTerm, regionFilter, yearFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, currentPage]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}> ↕</span>;
    return <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  return (
    <div className="table-card">
      <div className="table-header">
        <div>
          <h3>Country emissions records</h3>
          <p className="table-metadata">
            {isEmpty ? 'No source records loaded' : `${data.length.toLocaleString()} records · ${REGIONS.length} regions · ${YEARS[0]} to ${YEARS[YEARS.length - 1]}`}
            {' · '}Source: Carbon (CO₂) Emissions by Country CSV
          </p>
        </div>

        <div className="table-controls">
          <div className="table-search">
            <input
              type="text"
              placeholder="Search country or region..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="text-input"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              disabled={isEmpty}
            />
          </div>

          <select
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setCurrentPage(1); }}
            className="select-input"
            disabled={isEmpty}
            aria-label="Filter by region"
          >
            <option value="All">All Regions</option>
            {REGIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}
            className="select-input"
            disabled={isEmpty}
            aria-label="Filter by table year"
          >
            <option value="All">All Years</option>
            {YEARS.slice().reverse().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="analytics-table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => !isEmpty && handleSort('entity')}>
                Country<SortIcon field="entity" />
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => !isEmpty && handleSort('region')}>
                Region<SortIcon field="region" />
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => !isEmpty && handleSort('year')}>
                Year<SortIcon field="year" />
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => !isEmpty && handleSort('emissions')}>
                CO₂ emissions<SortIcon field="emissions" />
              </th>
              <th>Unit</th>
              <th style={{ cursor: 'pointer' }} onClick={() => !isEmpty && handleSort('perCapita')}>
                Per capita<SortIcon field="perCapita" />
              </th>
              <th>Unit</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan="8" className="table-empty-row">No data available.</td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty-row">No records matched your filters.</td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{row.entity}</td>
                  <td>{row.region}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.year}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.emissions.toFixed(3)}</td>
                  <td>Mt CO₂</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.perCapita.toFixed(2)}</td>
                  <td>t CO₂ / person</td>
                  <td>Country emissions CSV</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <span>
          {isEmpty
            ? 'No entries'
            : `Showing ${Math.min(processedData.length, (currentPage - 1) * itemsPerPage + 1)} to ${Math.min(processedData.length, currentPage * itemsPerPage)} of ${processedData.length} entries`
          }
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={isEmpty || currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={isEmpty || currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
