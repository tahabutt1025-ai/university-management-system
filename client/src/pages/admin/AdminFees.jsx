import { useState, useEffect } from 'react';
import { feesAPI, studentsAPI } from '../../api';
import { Plus, CreditCard, CheckCircle, Clock, Loader, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminFees() {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ student: '', feeType: 'Tuition', amount: '', dueDate: '', semester: 1, academicYear: '2024-2025' });
  const [payForm, setPayForm] = useState({ paidAmount: '', paymentMethod: 'Cash', transactionId: '' });

  const fetchFees = async () => {
    setLoading(true);
    try {
      const [feesRes, studentsRes] = await Promise.all([
        feesAPI.getAll({ status: statusFilter, limit: 50 }),
        studentsAPI.getAll({ limit: 100 })
      ]);
      setFees(feesRes.data.fees);
      setStudents(studentsRes.data.students);
    } catch { toast.error('Failed to load fees'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFees(); }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.student || !form.amount || !form.dueDate) { toast.error('Fill all required fields'); return; }
    setSaving(true);
    try {
      await feesAPI.create(form);
      toast.success('Fee record created');
      setShowModal(false);
      fetchFees();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handlePay = async () => {
    if (!payForm.paidAmount) { toast.error('Enter paid amount'); return; }
    setSaving(true);
    try {
      await feesAPI.pay(selectedFee._id, payForm);
      toast.success('Payment recorded! ✅');
      setShowPayModal(false);
      fetchFees();
    } catch { toast.error('Failed to record payment');
    } finally { setSaving(false); }
  };

  const totalCollected = fees.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.paidAmount, 0);
  const totalPending = fees.filter(f => f.status === 'unpaid').reduce((acc, f) => acc + f.amount, 0);
  const overdueCount = fees.filter(f => f.status === 'unpaid' && new Date(f.dueDate) < new Date()).length;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Fee Management</h1>
          <p>Track student payments and fee records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add Fee Record</button>
      </div>

      {/* Summary */}
      <div className="grid-3 mb-24">
        {[
          { label: 'Total Collected', value: `₹${(totalCollected / 1000).toFixed(0)}K`, icon: <CheckCircle size={20}/>, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
          { label: 'Pending Amount', value: `₹${(totalPending / 1000).toFixed(0)}K`, icon: <Clock size={20}/>, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
          { label: 'Overdue Records', value: overdueCount, icon: <CreditCard size={20}/>, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['', 'All'], ['paid', 'Paid'], ['unpaid', 'Unpaid'], ['partial', 'Partial']].map(([val, label]) => (
          <button key={val} className={`btn ${statusFilter === val ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setStatusFilter(val)}>{label}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Fee Type</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7}><div className="loading-overlay" style={{ minHeight: 120 }}><div className="loading-spinner"/></div></td></tr>
              : fees.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><p>No fee records found</p></div></td></tr>
              : fees.map(fee => (
                <tr key={fee._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{fee.student?.user?.name || 'N/A'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fee.student?.rollNumber}</div>
                  </td>
                  <td>{fee.feeType}</td>
                  <td style={{ fontWeight: 700 }}>₹{fee.amount?.toLocaleString()}</td>
                  <td style={{ fontSize: 12, color: new Date(fee.dueDate) < new Date() && fee.status !== 'paid' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {new Date(fee.dueDate).toLocaleDateString()}
                    {new Date(fee.dueDate) < new Date() && fee.status !== 'paid' && ' (Overdue)'}
                  </td>
                  <td>
                    <span className={`badge ${fee.status === 'paid' ? 'badge-success' : fee.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                      {fee.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {fee.status === 'paid' ? `${fee.paymentMethod || ''} · ${fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : ''}` : '—'}
                  </td>
                  <td>
                    {fee.status !== 'paid' && (
                      <button className="btn btn-success btn-sm" onClick={() => { setSelectedFee(fee); setPayForm({ paidAmount: fee.amount, paymentMethod: 'Cash', transactionId: '' }); setShowPayModal(true); }}>
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3 style={{ fontSize: 17, fontWeight: 700 }}>Add Fee Record</h3><button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Student *</label>
                <select className="form-select" value={form.student} onChange={e => setForm(f => ({ ...f, student: e.target.value }))}>
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s._id} value={s._id}>{s.user?.name} ({s.rollNumber})</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Fee Type</label>
                  <select className="form-select" value={form.feeType} onChange={e => setForm(f => ({ ...f, feeType: e.target.value }))}>
                    {['Tuition', 'Library', 'Laboratory', 'Examination', 'Sports', 'Transport', 'Hostel', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Amount (₹) *</label>
                  <input className="form-input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50000" />
                </div>
                <div className="form-group"><label className="form-label">Due Date *</label>
                  <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="form-group"><label className="form-label">Semester</label>
                  <select className="form-select" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: parseInt(e.target.value) }))}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null} {saving ? 'Creating...' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedFee && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3 style={{ fontSize: 17, fontWeight: 700 }}>Record Payment</h3><button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPayModal(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                <strong>{selectedFee.student?.user?.name}</strong> · {selectedFee.feeType} · Due: ₹{selectedFee.amount?.toLocaleString()}
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Amount Paid *</label>
                  <input className="form-input" type="number" value={payForm.paidAmount} onChange={e => setPayForm(f => ({ ...f, paidAmount: e.target.value }))} />
                </div>
                <div className="form-group"><label className="form-label">Payment Method</label>
                  <select className="form-select" value={payForm.paymentMethod} onChange={e => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    {['Cash', 'Bank Transfer', 'Online', 'Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Transaction ID</label>
                <input className="form-input" value={payForm.transactionId} onChange={e => setPayForm(f => ({ ...f, transactionId: e.target.value }))} placeholder="TXN-001234" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handlePay} disabled={saving}>
                {saving ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={14} />}
                {saving ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
