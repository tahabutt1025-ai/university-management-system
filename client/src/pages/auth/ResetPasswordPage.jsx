import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Loader, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../api';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate   = useNavigate();

  const [form, setForm]       = useState({ password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [errors, setErrors]     = useState({});

  const validate = () => {
    const errs = {};
    if (!form.password || form.password.length < 6)
      errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm)
      errs.confirm = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await API.post(`/auth/reset-password/${token}`, { password: form.password });
      setDone(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed. The link may have expired.';
      toast.error(msg);
      setErrors({ password: msg });
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

        {done ? (
          /* Success state */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} color="var(--success)" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Password updated!</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Your password has been changed. You can now sign in with your new password.
            </p>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.5px' }}>
              Set new password
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Choose a strong password — at least 6 characters.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {/* New password */}
              <div className="form-group">
                <label className="form-label" htmlFor="reset-password">
                  New Password <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-password"
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, password: e.target.value }));
                      if (errors.password) setErrors((er) => ({ ...er, password: undefined }));
                    }}
                    style={{ paddingRight: 40, ...(errors.password ? { borderColor: 'var(--danger)' } : {}) }}
                    aria-invalid={!!errors.password}
                    autoComplete="new-password"
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
                  <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.password}</div>
                )}
              </div>

              {/* Confirm password */}
              <div className="form-group">
                <label className="form-label" htmlFor="reset-confirm">
                  Confirm Password <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  className="form-input"
                  placeholder="Re-enter your password"
                  value={form.confirm}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, confirm: e.target.value }));
                    if (errors.confirm) setErrors((er) => ({ ...er, confirm: undefined }));
                  }}
                  style={errors.confirm ? { borderColor: 'var(--danger)' } : {}}
                  aria-invalid={!!errors.confirm}
                  autoComplete="new-password"
                />
                {errors.confirm && (
                  <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.confirm}</div>
                )}
              </div>

              <button
                id="reset-submit"
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: 8 }}
                disabled={loading}
              >
                {loading ? <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/login')}
                style={{ border: 'none' }}
              >
                ← Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
