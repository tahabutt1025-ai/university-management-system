import React, { useState, useEffect } from 'react';
import { alertsAPI } from '../../api';
import toast from 'react-hot-toast';
import { 
  History, Search, RefreshCw, RotateCcw, CheckCircle2, XCircle, 
  Clock, Eye, X, Filter, FileText, ArrowRight
} from 'lucide-react';

export default function AlertHistory() {
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await alertsAPI.getHistory({
        page,
        limit: 15,
        status: statusFilter || undefined,
        search: search || undefined
      });
      setAlerts(res.data.alerts || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load alert history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleRetry = async (alertId) => {
    setRetryingId(alertId);
    try {
      await alertsAPI.retryAlert(alertId);
      toast.success('Alert retried and delivered successfully');
      fetchHistory();
      if (selectedAlert?._id === alertId) {
        setSelectedAlert(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to retry alert');
    } finally {
      setRetryingId(null);
    }
  };

  const statusBadge = (status) => {
    switch (status) {
      case 'sent':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 600, fontSize: 12 }}>
            <CheckCircle2 size={14} /> Delivered
          </span>
        );
      case 'failed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ef4444', fontWeight: 600, fontSize: 12 }}>
            <XCircle size={14} /> Failed
          </span>
        );
      case 'queued':
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#3b82f6', fontWeight: 600, fontSize: 12 }}>
            <Clock size={14} /> Queued
          </span>
        );
    }
  };

  return (
    <div className="container" style={{ padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <History size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Alert Audit History</h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                Comprehensive audit trail of all generated, delivered, and retried alerts.
              </p>
            </div>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={fetchHistory} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters & Search */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search recipient email or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
            />
          </div>

          <div style={{ minWidth: 150 }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
            >
              <option value="">All Statuses</option>
              <option value="sent">Delivered Only</option>
              <option value="failed">Failed Only</option>
              <option value="queued">Queued Only</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
            Filter
          </button>
        </form>
      </div>

      {/* Audit Trail Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px' }}>Recipient</th>
                <th style={{ padding: '12px 16px' }}>Rule</th>
                <th style={{ padding: '12px 16px' }}>Subject</th>
                <th style={{ padding: '12px 16px' }}>Mode</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: 40, textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
                    <p>Loading audit records...</p>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No alert history records found matching criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {/* Recipient */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.recipientEmail}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {item.recipient?.name || item.recipientRole}
                      </div>
                    </td>

                    {/* Rule */}
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-secondary" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {item.ruleCode}
                      </span>
                    </td>

                    {/* Subject */}
                    <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                        {item.subject}
                      </div>
                    </td>

                    {/* Mode */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: item.isAiGenerated ? 'rgba(59,130,246,0.1)' : 'rgba(100,116,139,0.1)', color: item.isAiGenerated ? '#2563eb' : '#64748b' }}>
                        {item.isAiGenerated ? '✨ AI Drafted' : 'Template'}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      {statusBadge(item.status)}
                    </td>

                    {/* Timestamp */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(item.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedAlert(item)}
                          title="View Details & Facts"
                        >
                          <Eye size={13} />
                        </button>
                        {item.status === 'failed' && (
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => handleRetry(item._id)}
                            disabled={retryingId === item._id}
                            title="Retry Delivery"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', fontSize: 13 }}>
            <div>Showing page {page} of {totalPages} ({total} alerts)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                className="btn btn-sm btn-secondary" 
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button 
                className="btn btn-sm btn-secondary" 
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: 'var(--card-bg, #ffffff)', color: 'var(--text-primary)',
            borderRadius: 16, maxWidth: 650, width: '100%', maxHeight: '90vh',
            overflowY: 'auto', padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Alert Audit Details</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {selectedAlert._id}</div>
              </div>
              <button 
                onClick={() => setSelectedAlert(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Recipient & Status Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Recipient: </span>
                <strong>{selectedAlert.recipientEmail}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                {statusBadge(selectedAlert.status)}
              </div>
            </div>

            {/* Failure Reason Alert */}
            {selectedAlert.failureReason && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                <strong>Delivery Failure:</strong> {selectedAlert.failureReason}
              </div>
            )}

            {/* Email Subject */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delivered Subject:</label>
              <div style={{ fontSize: 15, fontWeight: 700, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, marginTop: 4 }}>
                {selectedAlert.subject}
              </div>
            </div>

            {/* Email Body */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delivered Body Content:</label>
              <div style={{
                fontSize: 14, lineHeight: 1.6, padding: '16px', background: 'var(--bg-secondary)',
                borderRadius: 8, marginTop: 4, whiteSpace: 'pre-line', borderLeft: '4px solid #3b82f6'
              }}>
                {selectedAlert.body}
              </div>
            </div>

            {/* Verified Facts JSON */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verified Facts Bundle (Immutable Audit Source):</label>
              <pre style={{
                background: '#1e293b', color: '#f8fafc', padding: 12, borderRadius: 8,
                overflowX: 'auto', marginTop: 4, fontSize: 11
              }}>
                {JSON.stringify(selectedAlert.facts, null, 2)}
              </pre>
            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {selectedAlert.status === 'failed' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleRetry(selectedAlert._id)}
                  disabled={retryingId === selectedAlert._id}
                >
                  <RotateCcw size={14} /> Retry Delivery
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedAlert(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
