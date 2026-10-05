import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 80, fontWeight: 900, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>404</div>
      <GraduationCap size={48} color="var(--text-muted)" style={{ margin: '20px 0' }}/>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 14 }}>The page you're looking for doesn't exist or you don't have access to it.</p>
      <button className="btn btn-primary btn-lg" onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  );
}
