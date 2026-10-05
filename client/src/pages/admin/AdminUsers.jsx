import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { UserPlus, Search, Edit2, Trash2, CheckCircle, XCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Business Administration', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'];

const roleColors = { admin: 'role-admin', teacher: 'role-teacher', student: 'role-student' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', department: 'Computer Science', semester: 1, rollNumber: '', employeeId: '', designation: 'Lecturer', isActive: true });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ role: roleFilter, search });
      setUsers(res.data.users);
    } catch (err) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [roleFilter, search]);

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error('Name and email are required'); return; }
    setSaving(true);
    try {
      if (editUser) {
        await adminAPI.updateUser(editUser._id, { name: form.name, email: form.email, role: form.role, isActive: form.isActive });
        toast.success('User updated');
      } else {
        if (!form.password) { toast.error('Password required'); setSaving(false); return; }
        await adminAPI.createUser(form);
        toast.success('User created successfully');
      }
      setShowModal(false);
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteUser(id);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) { toast.error('Failed to delete user'); }
  };

  const handleToggleActive = async (user) => {
    try {
      await adminAPI.updateUser(user._id, { isActive: !user.isActive });
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (err) { toast.error('Failed to update'); }
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: '', email: '', password: '', role: 'student', department: 'Computer Science', semester: 1, rollNumber: `STU-${Date.now()}`, employeeId: `EMP-${Date.now()}`, designation: 'Lecturer', isActive: true });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, isActive: user.isActive });
    setShowModal(true);
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>User Management</h1>
          <p>Manage all students, teachers, and administrators</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-20">
        <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-wrapper">
              <Search size={14} className="search-icon" />
              <input
                className="form-input search-input"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {['', 'admin', 'teacher', 'student'].map(role => (
              <button
                key={role}
                className={`btn ${roleFilter === role ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setRoleFilter(role)}
              >
                {role === '' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1) + 's'}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>
              {users.length} users found
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}>
                  <div className="loading-overlay" style={{ minHeight: 150 }}>
                    <div className="loading-spinner" />
                  </div>
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <p>No users found</p>
                  </div>
                </td></tr>
              ) : users.map(user => (
                <tr key={user._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td><span className={`role-badge ${roleColors[user.role]}`}>{user.role}</span></td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(user)}>
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title={user.isActive ? 'Deactivate' : 'Activate'} onClick={() => handleToggleActive(user)}>
                        {user.isActive ? <XCircle size={13} color="var(--warning)" /> : <CheckCircle size={13} color="var(--success)" />}
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Delete" onClick={() => handleDelete(user._id, user.name)}>
                        <Trash2 size={13} color="var(--danger)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>{editUser ? 'Edit User' : 'Create New User'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" placeholder="john@university.edu" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              {!editUser && (
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              )}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              {!editUser && form.role === 'student' && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Roll Number</label>
                    <input className="form-input" value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <select className="form-select" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: parseInt(e.target.value) }))}>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {!editUser && form.role === 'teacher' && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Employee ID</label>
                    <input className="form-input" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <select className="form-select" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}>
                      {['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {editUser && (
                <div className="form-group">
                  <label className="form-label">Account Status</label>
                  <select className="form-select" value={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                {saving ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
