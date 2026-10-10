import { useNavigate } from 'react-router-dom';
import { ShieldOff, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    if (user) {
      navigate(`/${user.role}/dashboard`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        textAlign: 'center',
        padding: 20,
      }}
    >
      {/* 403 number */}
      <div
        style={{
          fontSize: 80,
          fontWeight: 900,
          background: 'var(--gradient-danger)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}
      >
        403
      </div>

      <ShieldOff size={48} color="var(--text-muted)" style={{ margin: '20px 0' }} />

      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 8,
          color: 'var(--text-primary)',
        }}
      >
        Access Denied
      </h1>
      <p
        style={{
          color: 'var(--text-secondary)',
          marginBottom: 28,
          fontSize: 14,
          maxWidth: 400,
        }}
      >
        You don&apos;t have permission to view this page. Please contact your
        administrator if you believe this is a mistake.
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-ghost btn-lg" onClick={() => navigate(-1)}>
          ← Go Back
        </button>
        <button className="btn btn-primary btn-lg" onClick={handleBack}>
          <LogIn size={16} /> Go to Dashboard
        </button>
      </div>

      {/* Support contact hint */}
      <p style={{ marginTop: 32, fontSize: 12, color: 'var(--text-muted)' }}>
        Need help?{' '}
        <a
          href="mailto:support@university.edu"
          style={{ color: 'var(--primary-600)', textDecoration: 'none' }}
        >
          support@university.edu
        </a>
      </p>
    </div>
  );
}
