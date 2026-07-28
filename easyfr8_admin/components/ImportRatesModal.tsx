'use client';

import React, { useState } from 'react';
import { parseCSV, downloadRatesSampleCSV, downloadRatesSampleExcel } from '@/lib/csvUtils';

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportSummary {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
}

interface ImportRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export default function ImportRatesModal({ isOpen, onClose, onSuccess, showToast }: ImportRatesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setSummary(null);
    setLoading(false);
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xls', 'xlsx'].includes(ext || '')) {
      showToast('Unsupported file type. Please upload a CSV or Excel file (.csv, .xls, .xlsx).', 'danger');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      showToast('File size exceeds maximum limit of 10MB.', 'danger');
      return;
    }

    setFile(selectedFile);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const rows = parseCSV(content);
        setParsedRows(rows);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmitImport = async () => {
    if (!file || parsedRows.length === 0) {
      showToast('Please select a valid CSV or Excel file with data rows.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/freight-rates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedRows,
          options: { duplicateStrategy },
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.error('Non-JSON response received:', rawText);
        showToast('Server returned invalid response format.', 'danger');
        return;
      }

      if (!res.ok || !data.success) {
        if (data.summary) {
          setSummary(data.summary);
        }
        showToast(data.error || 'Import failed due to validation errors.', 'danger');
      } else {
        setSummary(data.summary);
        showToast(`Import completed! ${data.summary.imported} rates created, ${data.summary.updated} updated.`, 'success');
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      showToast('Server error while importing freight rates.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={() => { handleReset(); onClose(); }}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '90%' }}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Import Freight Rates</h3>
            <p className="modal-subtitle">Upload CSV or Excel file to batch import carrier freight rates.</p>
          </div>
          <button className="modal-close" onClick={() => { handleReset(); onClose(); }}>&times;</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          
          {/* Sample Templates Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Need a template?</span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={downloadRatesSampleCSV}>
                📄 CSV Template
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={downloadRatesSampleExcel}>
                📊 Excel Template
              </button>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            className={`file-upload-zone ${isDragOver ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ position: 'relative' }}
          >
            <input
              type="file"
              className="file-upload-input"
              accept=".csv, .xls, .xlsx"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
              {file ? file.name : 'Drag & drop file here, or click to browse'}
            </p>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Supports CSV, XLS, XLSX (Max 10MB)
            </span>
          </div>

          {/* File Selected Badge / Information */}
          {file && (
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-card)' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>{file.name}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {(file.size / 1024).toFixed(1)} KB — {parsedRows.length} data rows detected
                </div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset} style={{ color: 'var(--color-danger)' }}>
                Remove
              </button>
            </div>
          )}

          {/* Duplicate Strategy Option */}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <label className="form-label">Duplicate Record Handling</label>
            <div className="radio-group">
              <label className="custom-radio">
                <input
                  type="radio"
                  name="dupStrategy"
                  value="skip"
                  checked={duplicateStrategy === 'skip'}
                  onChange={() => setDuplicateStrategy('skip')}
                />
                <span>Skip Duplicates (Recommended)</span>
              </label>
              <label className="custom-radio">
                <input
                  type="radio"
                  name="dupStrategy"
                  value="update"
                  checked={duplicateStrategy === 'update'}
                  onChange={() => setDuplicateStrategy('update')}
                />
                <span>Update Existing Rates</span>
              </label>
            </div>
          </div>

          {/* Validation Errors Breakdown Table */}
          {summary && summary.errors && summary.errors.length > 0 && (
            <div style={{ marginTop: 'var(--space-5)' }}>
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.85rem', marginBottom: 'var(--space-2)' }}>
                ⚠️ Found {summary.errors.length} Validation Errors:
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <table className="data-table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Row</th>
                      <th style={{ width: '120px' }}>Field</th>
                      <th>Error Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.errors.map((err, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>#{err.row}</td>
                        <td><span className="badge badge-neutral">{err.field}</span></td>
                        <td style={{ color: 'var(--color-danger)' }}>{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Summary Cards */}
          {summary && summary.imported > 0 && (
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'var(--color-success-soft)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              ✅ Import Summary: <strong>{summary.imported}</strong> Created, <strong>{summary.updated}</strong> Updated, <strong>{summary.skipped}</strong> Skipped.
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => { handleReset(); onClose(); }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!file || parsedRows.length === 0 || loading}
            onClick={handleSubmitImport}
          >
            {loading ? 'Processing Import...' : `Import ${parsedRows.length} Rates`}
          </button>
        </div>

      </div>
    </div>
  );
}
