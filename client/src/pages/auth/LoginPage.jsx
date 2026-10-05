import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const DEMO_CREDENTIALS = [
  { role: 'Admin', email: 'admin@university.edu', password: 'Admin@123', color: '#a78bfa' },
  { role: 'Teacher', email: 'ali@university.edu', password: 'Teacher@123', color: '#34d399' },
  { role: 'Student', email: 'ahmed1@student.edu', password: 'Student@123', color: '#60a5fa' }
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(0);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = (cred) => {
    setForm({ email: cred.email, password: cred.password });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-bg-glow-2" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <GraduationCap size={24} color="white" />
          </div>
          <div>
            <h1>UniManage</h1>
            <p>University Management System</p>
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.5px' }}>
          Sign in to your portal
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Access your role-based dashboard securely.
        </p>

        {/* Role Selector */}
        <div className="auth-tabs">
          {DEMO_CREDENTIALS.map((cred, i) => (
            <button
              key={cred.role}
              className={`auth-tab ${selectedRole === i ? 'active' : ''}`}
              onClick={() => { setSelectedRole(i); handleQuickLogin(cred); }}
              style={selectedRole === i ? { color: cred.color } : {}}
            >
              {cred.role}
            </button>
          ))}
        </div>

        {/* Quick credential hint */}
        <div style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          marginBottom: 20,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }}>
          <span style={{ color: DEMO_CREDENTIALS[selectedRole].color, fontWeight: 600 }}>
            Demo {DEMO_CREDENTIALS[selectedRole].role}
          </span>: {DEMO_CREDENTIALS[selectedRole].email}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="your@university.edu"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ paddingRight: 40 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <Loader size={16} className="spin-anim" style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="divider" style={{ margin: '24px 0 16px' }} />

        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          🔒 Protected by JWT authentication · Role-based access control
        </div>
      </div>
    </div>
  );
}
