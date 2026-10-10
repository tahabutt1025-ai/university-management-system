import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const DEMO_CREDENTIALS = [
  { role: 'Admin',   email: 'admin@university.edu',  password: 'Admin@123',   color: '#a78bfa' },
  { role: 'Teacher', email: 'ali@university.edu',    password: 'Teacher@123', color: '#34d399' },
  { role: 'Student', email: 'ahmed1@student.edu',    password: 'Student@123', color: '#60a5fa' }
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [selectedRole, setSelectedRole] = useState(0);
  const [form,         setForm]         = useState({ email: '', password: '' });
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [forgotMode,   setForgotMode]   = useState(false);
  const [forgotEmail,  setForgotEmail]  = useState('');
  const [forgotSent,   setForgotSent]   = useState(false);
  const [errors,       setErrors]       = useState({});

  // ── Validation ────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.email)                          errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email  = 'Enter a valid email address';
    if (!form.password)                       errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Handlers ──────────────────────────────────────────────
  const handleQuickLogin = (cred) => {
    setForm({ email: cred.email, password: cred.password });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      toast.error(msg);
      // Surface wrong-password error inline
      if (err.response?.status === 401) {
        setErrors({ password: 'Incorrect email or password.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      toast.error('Enter a valid email address');
      return;
    }
    // In production this would call an API endpoint — placeholder for now
    setForgotSent(true);
    toast.success('If that email is registered, a reset link has been sent.');
  };

  // ── Forgot-password screen ────────────────────────────────
  if (forgotMode) {
    return (
      <div className="auth-page">
        <div className="auth-bg-glow" />
        <div className="auth-bg-glow-2" />
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <GraduationCap size={24} color="white" />
            </div>
            <div>
              <h1>UniManage</h1>
              <p>University Management System</p>
            </div>
          </div>

          {forgotSent ? (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                  If <strong>{forgotEmail}</strong> is registered, you will receive a password
                  reset link within a few minutes.
                </p>
              </div>
              <button
                className="btn btn-ghost btn-lg"
                style={{ width: '100%' }}
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }}
              >
                ← Back to Sign In
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.5px' }}>
                Reset your password
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleForgotSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="form-input"
                    placeholder="your@university.edu"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <button
                  id="forgot-submit"
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginBottom: 12 }}
                >
                  Send Reset Link
                </button>
              </form>

              <button
                className="btn btn-ghost btn-lg"
                style={{ width: '100%' }}
                onClick={() => setForgotMode(false)}
              >
                ← Back to Sign In
              </button>
            </>
          )}

          <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            <a href="mailto:support@university.edu" style={{ color: 'var(--primary-600)', textDecoration: 'none' }}>
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Main login screen ─────────────────────────────────────
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
        <div className="auth-tabs" role="tablist" aria-label="Select demo role">
          {DEMO_CREDENTIALS.map((cred, i) => (
            <button
              key={cred.role}
              role="tab"
              aria-selected={selectedRole === i}
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
        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="your@university.edu"
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }));
                if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
              }}
              autoComplete="email"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
              style={errors.email ? { borderColor: 'var(--danger)' } : {}}
            />
            {errors.email && (
              <div id="email-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                {errors.email}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>
                Password <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--primary-600)', fontWeight: 600, padding: 0 }}
                onClick={() => setForgotMode(true)}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => {
                  setForm((f) => ({ ...f, password: e.target.value }));
                  if (errors.password) setErrors((er) => ({ ...er, password: undefined }));
                }}
                style={{ paddingRight: 40, ...(errors.password ? { borderColor: 'var(--danger)' } : {}) }}
                autoComplete="current-password"
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                aria-label={showPass ? 'Hide password' : 'Show password'}
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <div id="password-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                {errors.password}
              </div>
            )}
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

        {/* Footer links */}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.8 }}>
          <div>🔒 Protected by JWT authentication · Role-based access control</div>
          <div style={{ marginTop: 6 }}>
            <a href="/privacy" style={{ color: 'var(--primary-600)', textDecoration: 'none', marginRight: 10 }}>Privacy Policy</a>
            <a href="/terms"   style={{ color: 'var(--primary-600)', textDecoration: 'none', marginRight: 10 }}>Terms of Use</a>
            <a href="mailto:support@university.edu" style={{ color: 'var(--primary-600)', textDecoration: 'none' }}>Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
