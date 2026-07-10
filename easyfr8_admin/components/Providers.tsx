'use client';

import React from 'react';
import { DataProvider, useData } from '../context/DataContext';

function ToastPortal() {
  const { toasts, dismissToast } = useData();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let iconSvg = null;
        if (toast.type === 'success') {
          iconSvg = (
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--color-success)', width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        } else if (toast.type === 'danger') {
          iconSvg = (
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--color-danger)', width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        } else if (toast.type === 'warning') {
          iconSvg = (
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--color-warning)', width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          );
        } else {
          iconSvg = (
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--color-info)', width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        }

        return (
          <div key={toast.id} className={`toast ${toast.type} show`}>
            {iconSvg}
            <div className="toast-message">{toast.message}</div>
            <button className="toast-close" onClick={() => dismissToast(toast.id)}>
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      {children}
      <ToastPortal />
    </DataProvider>
  );
}
