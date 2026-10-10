import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export default function TermsOfUsePage() {
  const navigate = useNavigate();
  const lastUpdated = 'October 2026';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <GraduationCap size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>UniManage</h1>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>University Management System</p>
          </div>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 24 }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="card">
          <div className="card-body">
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Terms of Use</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
              Last updated: {lastUpdated}
            </p>

            <Section title="1. Acceptance">
              <p>
                By accessing UniManage you agree to these Terms of Use. If you do not agree,
                please do not use the system. These terms apply to all users — students, faculty,
                and administrators.
              </p>
            </Section>

            <Section title="2. Authorised use">
              <ul>
                <li>You may only log in with credentials issued to you by the university.</li>
                <li>You must not share your login credentials with any other person.</li>
                <li>You must not attempt to access records belonging to another user.</li>
                <li>You must not attempt to tamper with grades, attendance, or fee records without
                    appropriate authorisation.</li>
              </ul>
            </Section>

            <Section title="3. Account security">
              <p>
                You are responsible for keeping your password confidential. Report any suspected
                unauthorised access to the IT helpdesk immediately. The university reserves the right
                to suspend accounts showing suspicious activity.
              </p>
            </Section>

            <Section title="4. Accuracy of records">
              <p>
                Academic records are official university documents. Submitting false information,
                falsifying grades, or manipulating attendance is a disciplinary offence and may
                result in expulsion or dismissal.
              </p>
            </Section>

            <Section title="5. Availability">
              <p>
                The university will make reasonable efforts to keep UniManage available during
                business hours. Planned maintenance windows will be announced in advance. The
                university is not liable for losses arising from unplanned downtime.
              </p>
            </Section>

            <Section title="6. Intellectual property">
              <p>
                UniManage software and its design are the property of the university or its
                development partners. You may not copy, reverse-engineer, or redistribute any part
                of the system without written permission.
              </p>
            </Section>

            <Section title="7. Governing law">
              <p>
                These terms are governed by the laws of Pakistan. Disputes shall be subject to the
                exclusive jurisdiction of the courts of the university's registered city.
              </p>
            </Section>

            <Section title="8. Changes">
              <p>
                The university may update these terms at any time. Continued use after changes are
                published constitutes acceptance of the revised terms.
              </p>
            </Section>

            <Section title="9. Contact">
              <p>
                Questions about these terms? Email{' '}
                <a href="mailto:legal@university.edu" style={{ color: 'var(--primary-600)' }}>
                  legal@university.edu
                </a>{' '}
                or contact the university registrar.
              </p>
            </Section>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          <a href="/privacy" style={{ color: 'var(--primary-600)', marginRight: 16, textDecoration: 'none' }}>Privacy Policy</a>
          <a href="mailto:support@university.edu" style={{ color: 'var(--primary-600)', textDecoration: 'none' }}>Support</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}
