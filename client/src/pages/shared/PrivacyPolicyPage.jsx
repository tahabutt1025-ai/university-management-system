import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Privacy Policy</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
              Last updated: {lastUpdated}
            </p>

            <Section title="1. What data we collect">
              <p>UniManage collects the following categories of personal data to operate the university management system:</p>
              <ul>
                <li>Identity data: full name, email address, student/employee ID, roll number</li>
                <li>Academic data: enrolment records, course grades, attendance, assignments</li>
                <li>Financial data: fee records and payment history</li>
                <li>Technical data: login timestamps, browser type, IP address (server logs only)</li>
              </ul>
            </Section>

            <Section title="2. How we use your data">
              <p>Your data is used exclusively to:</p>
              <ul>
                <li>Authenticate and authorise your access to the portal</li>
                <li>Maintain your academic and fee records</li>
                <li>Generate reports and analytics for university administrators and faculty</li>
                <li>Send system notifications (result publication, low-attendance alerts)</li>
              </ul>
              <p>We do <strong>not</strong> sell, rent, or share your personal data with third parties for marketing purposes.</p>
            </Section>

            <Section title="3. Who can see your data">
              <ul>
                <li><strong>Students</strong> can see only their own records.</li>
                <li><strong>Teachers</strong> can see records for students enrolled in their courses.</li>
                <li><strong>Administrators</strong> can access all records for university operations.</li>
              </ul>
            </Section>

            <Section title="4. Data retention">
              <p>
                Academic records are retained for a minimum of five years after a student graduates or
                leaves the institution, as required by local regulation. Server logs are retained for
                90 days. You may request deletion of your account data by contacting the university
                registrar.
              </p>
            </Section>

            <Section title="5. Security">
              <p>
                Passwords are stored using bcrypt hashing. All data is transmitted over HTTPS. Access
                is controlled by JWT tokens that expire after one hour. We perform regular security
                reviews and maintain audit logs of sensitive record changes.
              </p>
            </Section>

            <Section title="6. Your rights">
              <p>You have the right to:</p>
              <ul>
                <li>Access a copy of your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (subject to legal retention requirements)</li>
                <li>Raise a complaint with the university data-protection officer</li>
              </ul>
            </Section>

            <Section title="7. Contact">
              <p>
                For privacy-related queries, contact the university data-protection officer at{' '}
                <a href="mailto:privacy@university.edu" style={{ color: 'var(--primary-600)' }}>
                  privacy@university.edu
                </a>{' '}
                or visit the registrar's office.
              </p>
            </Section>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          <a href="/terms" style={{ color: 'var(--primary-600)', marginRight: 16, textDecoration: 'none' }}>Terms of Use</a>
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
