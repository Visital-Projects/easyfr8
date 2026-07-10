'use client';

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRows: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, totalRows, rowsPerPage, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const startRow = (currentPage - 1) * rowsPerPage + 1;
  const endRow = Math.min(currentPage * rowsPerPage, totalRows);

  // Show at most 5 page buttons
  const getPages = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        Showing <b>{startRow}</b>–<b>{endRow}</b> of <b>{totalRows}</b> entries
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button
          className="page-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={pageBtnStyle(false, currentPage === 1)}
        >
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {getPages().map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>
          ) : (
            <button
              key={p}
              className={`page-btn ${currentPage === p ? 'active' : ''}`}
              onClick={() => onPageChange(p as number)}
              style={pageBtnStyle(currentPage === p, false)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="page-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={pageBtnStyle(false, currentPage === totalPages)}
        >
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function pageBtnStyle(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    minWidth: '32px',
    height: '32px',
    padding: '0 8px',
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--border-color)'}`,
    borderRadius: 'var(--radius-sm)',
    background: active ? 'var(--color-primary)' : 'var(--surface-card)',
    color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    transition: 'background 0.15s, border-color 0.15s',
  };
}
