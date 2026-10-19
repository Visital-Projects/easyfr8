'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../../../context/DataContext';

function compressImageBase64(file: File, maxWidth = 1200, maxHeight = 900, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type, quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function MediaLibraryPage() {
  const { media, loadMedia, addMedia, deleteMedia, replaceMedia, showToast } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadMedia();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Search filter
  const filteredMedia = useMemo(() => {
    return media.filter(item => 
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [media, searchQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const base64Content = await compressImageBase64(file);
      const sizeStr = formatBytes(file.size);
      
      await addMedia(file.name, base64Content, file.type, sizeStr);
    } catch (err: any) {
      showToast(err.message || 'File upload failed', 'danger');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !replacingId) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const base64Content = await compressImageBase64(file);
      const sizeStr = formatBytes(file.size);
      
      await replaceMedia(replacingId, file.name, base64Content, file.type, sizeStr);
    } catch (err: any) {
      showToast(err.message || 'File replacement failed', 'danger');
    } finally {
      setIsUploading(false);
      setReplacingId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const triggerReplace = (id: string) => {
    setReplacingId(id);
    if (replaceInputRef.current) replaceInputRef.current.click();
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the file "${name}"?`)) {
      await deleteMedia(id);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Media Library</h1>
          <p className="page-subtitle">Central repository for website images, banners, PDFs, and assets.</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            accept="image/*,application/pdf"
          />
          <input 
            type="file" 
            ref={replaceInputRef} 
            onChange={handleFileReplace} 
            style={{ display: 'none' }} 
            accept="image/*,application/pdf"
          />
          <button 
            className="btn btn-primary" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            {isUploading ? 'Uploading...' : 'Upload New File'}
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="filters-card" style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search media by file name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
          />
          <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {filteredMedia.map(item => (
          <div key={item.id} className="chart-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '320px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            {/* Image Preview Box */}
            <div style={{ flex: 1, backgroundColor: 'var(--surface-ground)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid var(--border-color)' }}>
              {item.fileType?.startsWith('image/') ? (
                <img 
                  src={item.fileUrl} 
                  alt={item.fileName} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '48px', height: '48px' }} fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                </div>
              )}
            </div>

            {/* Content Details */}
            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.fileName}>
                {item.fileName}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{item.fileSize}</span>
                <span>{item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Just now'}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                  onClick={() => setPreviewItem(item)}
                >
                  Preview
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                  onClick={() => triggerReplace(item.id)}
                >
                  Replace
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ minWidth: '36px', padding: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--color-danger)' }}
                  onClick={() => handleDelete(item.id, item.fileName)}
                >
                  <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredMedia.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-card)' }}>
            <svg viewBox="0 0 24 24" style={{ width: '48px', height: '48px', margin: '0 auto var(--space-4)', color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <h3>No media assets found</h3>
            <p>Try searching for another filename or upload a new file.</p>
          </div>
        )}
      </div>

      {/* Lightbox Preview Modal */}
      {previewItem && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}
          onClick={() => setPreviewItem(null)}
        >
          <div 
            style={{ backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', maxWidth: '90%', maxHeight: '90%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              style={{ position: 'absolute', right: '12px', top: '12px', zIndex: 10, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onClick={() => setPreviewItem(null)}
            >
              <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-6)', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--surface-ground)' }}>
              {previewItem.fileType?.startsWith('image/') ? (
                <img 
                  src={previewItem.fileUrl} 
                  alt={previewItem.fileName} 
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '64px', height: '64px', color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{ fontSize: '1rem', fontWeight: 600 }}>PDF Document (Preview not supported inline)</span>
                </div>
              )}
            </div>
            <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{previewItem.fileName}</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Size: {previewItem.fileSize} · Type: {previewItem.fileType}</p>
              </div>
              <a 
                href={previewItem.fileUrl} 
                download={previewItem.fileName}
                className="btn btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
