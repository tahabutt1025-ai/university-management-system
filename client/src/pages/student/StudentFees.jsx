import { useState, useEffect } from 'react';
import { feesAPI, studentsAPI } from '../../api';
import { CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function StudentFees() {
  const [summary, setSummary] = useState(null);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentsAPI.getMe().then(res => {
      return feesAPI.getStudentSummary(res.data.student._id);
    }).then(res => {
      setSummary(res.data.summary);
      setFees(res.data.fees);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="loading-spinner"/></div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Fee Status</h1><p>View your payment history and pending dues</p></div>
      </div>

      {summary && (
        <div className="grid-3 mb-24">
          {[
            { label: 'Total Paid', value: `₹${summary.totalPaid?.toLocaleString()}`, icon: <CheckCircle size={20}/>, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
            { label: 'Total Pending', value: `₹${summary.totalPending?.toLocaleString()}`, icon: <Clock size={20}/>, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
            { label: 'Overdue Records', value: summary.overdue?.length || 0, icon: <AlertTriangle size={20}/>, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {summary?.overdue?.length > 0 && (
        <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: '#f87171', marginBottom: 4 }}>⚠️ Overdue Fees</div>
          {summary.overdue.map((f, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {f.feeType}: ₹{f.amount?.toLocaleString()} — was due {new Date(f.dueDate).toLocaleDateString()}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header"><span className="card-title">All Fee Records</span></div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Fee Type</th><th>Amount</th><th>Due Date</th><th>Paid</th><th>Status</th><th>Method</th></tr></thead>
            <tbody>
              {fees.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><CreditCard size={32}/><p>No fee records</p></div></td></tr>
              ) : fees.map(f => (
                <tr key={f._id}>
                  <td style={{ fontWeight: 600 }}>{f.feeType}</td>
                  <td>₹{f.amount?.toLocaleString()}</td>
                  <td style={{ fontSize: 12, color: f.status !== 'paid' && new Date(f.dueDate) < new Date() ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {new Date(f.dueDate).toLocaleDateString()}
                  </td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{f.paidAmount?.toLocaleString() || 0}</td>
                  <td><span className={`badge ${f.status === 'paid' ? 'badge-success' : f.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>{f.status}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.paymentMethod || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
