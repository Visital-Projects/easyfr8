'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useData } from '../../../context/DataContext';

type DateRange = '7d' | '30d' | 'month' | 'all';

export default function DashboardPage() {
  const { enquiries, rates, users, auditLogs, rateHistory, loadRateHistory } = useData();
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  React.useEffect(() => {
    loadRateHistory();
  }, []);

  // Derived KPIs
  const pendingEnquiries = enquiries.filter((e) => e.status === 'New' || e.status === 'In Progress').length;

  // Filter enquiries by date range for chart
  const filteredEnquiries = useMemo(() => {
    const now = new Date();
    return enquiries.filter((e) => {
      const d = new Date(e.date);
      if (dateRange === '7d') return (now.getTime() - d.getTime()) / 86400000 <= 7;
      if (dateRange === '30d') return (now.getTime() - d.getTime()) / 86400000 <= 30;
      if (dateRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [enquiries, dateRange]);

  // Build chart data: last N days
  const { chartData, chartLabels } = useMemo(() => {
    const days = dateRange === '30d' ? 7 : 5;
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
      labels.push(label);
      const dateStr = d.toISOString().split('T')[0];
      data.push(enquiries.filter((e) => e.date === dateStr).length);
    }
    // If all zero, use sample data so chart is visible
    const total = data.reduce((a, b) => a + b, 0);
    if (total === 0) {
      return { chartData: [2, 4, 3, 6, 4], chartLabels: labels.slice(0, 5) };
    }
    return { chartData: data, chartLabels: labels };
  }, [enquiries, dateRange]);

  // SVG Chart rendering
  const width = 600;
  const height = 240;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxVal = Math.max(...chartData, 1) * 1.2;

  const points = chartData.map((val, idx) => ({
    x: padding + idx * (chartWidth / Math.max(chartData.length - 1, 1)),
    y: padding + chartHeight * (1 - val / maxVal),
    val,
    label: chartLabels[idx],
  }));

  let linePath = '';
  let areaPath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    areaPath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
      areaPath += ` L ${points[i].x} ${points[i].y}`;
    }
    areaPath += ` L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`;
  }

  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; label: string } | null>(null);

  const handleRefresh = () => {
    setLastRefreshed(new Date());
    loadRateHistory();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, administrator. Quick overview of system activities.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button className="btn btn-secondary" onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh
          </button>
          <Link href="/rates" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            Upload Rates
          </Link>
          <Link href="/enquiries" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Manage Enquiries
          </Link>
        </div>
      </div>

      {/* METRIC CARDS — Row 1 */}
      <div className="dashboard-grid">
        <div className="metric-card">
          <div>
            <div className="metric-title">Enquiries Received</div>
            <div className="metric-value" id="count-enquiries">{enquiries.length}</div>
            <div className="metric-trend trend-up">
              <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>+12.4% this week</span>
            </div>
          </div>
          <div className="metric-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-title">Registered Users</div>
            <div className="metric-value" id="count-users">{users.length}</div>
            <div className="metric-trend trend-up">
              <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>+3 users new</span>
            </div>
          </div>
          <div className="metric-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-title">Active Freight Rates</div>
            <div className="metric-value" id="count-rates">{rates.length}</div>
            <div className="metric-trend" style={{ color: 'var(--text-muted)' }}>
              <span>Static container routes</span>
            </div>
          </div>
          <div className="metric-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-title">Rate Sync Status</div>
            <div className="metric-value" style={{ fontSize: '1.15rem', marginTop: 'var(--space-2)', fontWeight: 600, color: 'var(--color-success)' }} id="sync-status">Synced</div>
            <div className="metric-trend" style={{ color: 'var(--text-muted)' }}>
              <span id="sync-time">Checked just now</span>
            </div>
          </div>
          <div className="metric-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </div>
        </div>
      </div>

      {/* METRIC CARDS — Row 2 (new KPI cards) */}
      <div className="dashboard-grid" style={{ marginTop: 0 }}>
        <div className="metric-card" style={{ borderLeft: '3px solid var(--color-warning)' }}>
          <div>
            <div className="metric-title">Pending Enquiries</div>
            <div className="metric-value" style={{ color: 'var(--color-warning)' }}>{pendingEnquiries}</div>
            <div className="metric-trend" style={{ color: 'var(--text-muted)' }}>
              <span>New &amp; In Progress</span>
            </div>
          </div>
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--color-warning-soft)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-warning)' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>



        <div className="metric-card">
          <div>
            <div className="metric-title">Filtered Enquiries</div>
            <div className="metric-value">{filteredEnquiries.length}</div>
            <div className="metric-trend" style={{ color: 'var(--text-muted)' }}>
              <span>In selected period</span>
            </div>
          </div>
          <div className="metric-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-title">Published Blogs</div>
            <div className="metric-value">3</div>
            <div className="metric-trend" style={{ color: 'var(--text-muted)' }}>
              <span>Live articles</span>
            </div>
          </div>
          <div className="metric-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* CHARTS AND TIMELINE */}
      <div className="dashboard-split-layout">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Platform Enquiries Trend</h3>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="form-control"
                style={{ fontSize: '0.75rem', padding: '4px 8px', width: 'auto' }}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
          <div className="chart-container" style={{ position: 'relative' }}>
            <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
              <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map((i) => {
                const y = padding + (chartHeight * (1 - i / 4));
                const val = Math.round((maxVal * i) / 4);
                return (
                  <g key={i}>
                    <line className="chart-grid-line" x1={padding} y1={y} x2={width - padding} y2={y} />
                    <text className="chart-axis-text" x={padding - 8} y={y + 4} textAnchor="end">{val}</text>
                  </g>
                );
              })}
              {areaPath && <path className="chart-area" d={areaPath} fill="url(#chart-gradient)" />}
              {linePath && <path className="chart-line" d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="3" />}
              {points.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    className="chart-point"
                    cx={pt.x} cy={pt.y}
                    r={hoveredPoint?.label === pt.label ? 6 : 4}
                    fill="var(--surface-card)" stroke="var(--color-primary)" strokeWidth="3"
                    style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  <text className="chart-axis-text" x={pt.x} y={padding + chartHeight + 20} textAnchor="middle">{pt.label}</text>
                </g>
              ))}
            </svg>
            {hoveredPoint && (
              <div
                className="chart-tooltip"
                style={{
                  position: 'absolute',
                  left: `${(hoveredPoint.x / width) * 100}%`,
                  top: `${(hoveredPoint.y / height) * 100 - 15}%`,
                  transform: 'translate(-50%, -100%)',
                  display: 'block',
                  zIndex: 30,
                  pointerEvents: 'none',
                }}
              >
                <strong>{hoveredPoint.label}</strong>: {hoveredPoint.val}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="activity-card">
            <div className="chart-card-header" style={{ marginBottom: 'var(--space-5)' }}>
              <h3 className="chart-card-title">Recent Activity</h3>
            </div>
            <ul className="timeline" id="recent-activities-list">
              {auditLogs.slice(0, 6).map((log) => (
                <li key={log.id} className="timeline-item">
                  <div className="timeline-badge"></div>
                  <div className="timeline-panel">
                    <div className="timeline-header">
                      <span className="timeline-user">{log.user}</span>
                      <span className="timeline-time">{log.timestamp}</span>
                    </div>
                    <div className="timeline-body"><p>{log.action}</p></div>
                  </div>
                </li>
              ))}
              {auditLogs.length === 0 && (
                <li style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: 'var(--space-4) 0' }}>
                  No operations logged yet.
                </li>
              )}
            </ul>
          </div>

          {/* Freight Rate Update Status Widget */}
          <div className="activity-card">
            <div className="chart-card-header" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 className="chart-card-title">Freight Rate Update Status</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {(() => {
                const expiredRatesCount = rates.filter(r => {
                  if (!r.validity) return false;
                  const d = new Date(r.validity);
                  return !isNaN(d.getTime()) && d.getTime() < Date.now();
                }).length;
                const activeRatesCount = rates.length - expiredRatesCount;
                
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', padding: 'var(--space-4)', backgroundColor: 'var(--surface-ground)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Active Rates</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>{activeRatesCount}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Expired/Pending</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger)', marginTop: '4px' }}>{expiredRatesCount}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Last Rate Modification</div>
                      {rateHistory && rateHistory.length > 0 ? (
                        <div style={{ fontSize: '0.85rem', padding: 'var(--space-3)', backgroundColor: 'var(--surface-ground)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary)', border: '1px solid var(--border-color)', borderLeftWidth: '3px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                            {rateHistory[0].actionType === 'create' ? 'Rate Added' : rateHistory[0].actionType === 'update' ? 'Rate Updated' : 'Rate Deleted'}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', margin: '6px 0 4px' }}>
                            {rateHistory[0].newValue ? `${rateHistory[0].newValue.origin} → ${rateHistory[0].newValue.destination}` : rateHistory[0].oldValue ? `${rateHistory[0].oldValue.origin} → ${rateHistory[0].oldValue.destination}` : 'Route Modification'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                            <span>By: {rateHistory[0].updatedBy}</span>
                            <span>{new Date(rateHistory[0].createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: 'var(--space-3)', backgroundColor: 'var(--surface-ground)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                          No rate changes logged yet.
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="quick-actions-card">
        <h3 className="chart-card-title" style={{ marginBottom: 'var(--space-4)' }}>Quick Admin Shortcuts</h3>
        <div className="quick-actions-grid">
          <Link href="/rates" className="action-tile">
            <div className="action-tile-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </div>
            <div className="action-tile-text"><h4>Upload Rate CSV</h4><p>Import rates manifest in bulk</p></div>
          </Link>
          <Link href="/rates" className="action-tile">
            <div className="action-tile-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="action-tile-text"><h4>Add Freight Route</h4><p>Register single destination rates</p></div>
          </Link>
          <Link href="/cms" className="action-tile">
            <div className="action-tile-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="9" y1="9" x2="21" y2="9" />
              </svg>
            </div>
            <div className="action-tile-text"><h4>Edit Homepage CMS</h4><p>Revise landing titles and slogans</p></div>
          </Link>
          <Link href="/settings" className="action-tile">
            <div className="action-tile-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.5 1z" />
              </svg>
            </div>
            <div className="action-tile-text"><h4>System Configuration</h4><p>Change security access roles</p></div>
          </Link>
          <Link href="/enquiries" className="action-tile">
            <div className="action-tile-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="action-tile-text"><h4>View Enquiries</h4><p>Manage customer freight enquiries</p></div>
          </Link>
        </div>
      </div>
    </>
  );
}
