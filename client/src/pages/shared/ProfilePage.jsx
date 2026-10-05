import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import { User, Lock, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleUpdateProfile = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(form);
      updateUser(res.data.user);
      toast.success('Profile updated! ✅');
    } catch { toast.error('Failed to update profile');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error('Fill all password fields'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    setSavingPw(true);
    try {
      await authAPI.updatePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed! 🔒');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed');
    } finally { setSavingPw(false); }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const roleColors = { admin: '#a78bfa', teacher: '#34d399', student: '#60a5fa' };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Profile & Settings</h1><p>Manage your account information</p></div>
      </div>

      <div className="grid-2">
        {/* Profile Info */}
        <div>
          {/* Avatar */}
          <div className="card mb-20">
            <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${roleColors[user?.role] || '#6366f1'}, #312e81)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: 'white' }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{user?.name}</div>
                <div style={{ color: roleColors[user?.role], fontWeight: 600, fontSize: 13 }}>{user?.role?.toUpperCase()}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Edit Profile */}
          <div className="card">
            <div className="card-header"><span className="card-title"><User size={16} style={{ display: 'inline', marginRight: 6 }}/>Edit Profile</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" value={user?.email} disabled style={{ opacity: 0.6 }} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed here</div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+92-300-1234567" />
              </div>
              <button className="btn btn-primary" onClick={handleUpdateProfile} disabled={saving}>
                {saving ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> : <Save size={14}/>}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div>
          <div className="card">
            <div className="card-header"><span className="card-title"><Lock size={16} style={{ display: 'inline', marginRight: 6 }}/>Change Password</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="Enter current password"/>
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min 6 characters"/>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Re-enter new password"/>
              </div>
              {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>❌ Passwords do not match</div>
              )}
              <button className="btn btn-primary" onClick={handleChangePassword} disabled={savingPw}>
                {savingPw ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> : <Lock size={14}/>}
                {savingPw ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="card mt-20">
            <div className="card-header"><span className="card-title">Account Details</span></div>
            <div className="card-body">
              {[
                { label: 'User ID', value: user?._id },
                { label: 'Role', value: user?.role?.toUpperCase() },
                { label: 'Account Status', value: user?.isActive ? '✅ Active' : '❌ Inactive' },
                { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--bg-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: item.label === 'User ID' ? 'monospace' : 'inherit' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
