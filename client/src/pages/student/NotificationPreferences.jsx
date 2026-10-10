import React, { useState, useEffect } from 'react';
import { alertsAPI } from '../../api';
import toast from 'react-hot-toast';
import { Bell, Mail, Clock, Globe, Shield, Check, Info } from 'lucide-react';

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    digestMode: 'instant',
    quietHours: { enabled: false, startHour: 22, endHour: 7 },
    language: 'en',
    disabledCategories: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    alertsAPI.getMyPreferences()
      .then(res => {
        if (res.data.preferences) {
          setPreferences(res.data.preferences);
        }
      })
      .catch(() => toast.error('Failed to load preferences'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await alertsAPI.updateMyPreferences(preferences);
      toast.success('Notification preferences updated successfully');
    } catch (err) {
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
        <p>Loading notification settings...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '24px 20px', maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <Bell size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Notification Preferences</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            Manage how and when you receive academic, attendance, and fee alerts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Email Alerts Master Toggle */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ padding: 10, borderRadius: 10, background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>
                <Mail size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Email Alerts Delivery</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  Receive important notifications and reminders directly to your student email inbox.
                </p>
              </div>
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={preferences.emailEnabled}
                onChange={(e) => setPreferences({ ...preferences, emailEnabled: e.target.checked })}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>

        {/* Delivery Frequency & Digest Mode */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px 0' }}>Delivery Frequency</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 10,
              border: `2px solid ${preferences.digestMode === 'instant' ? '#3b82f6' : 'var(--border-color)'}`,
              background: preferences.digestMode === 'instant' ? 'rgba(59,130,246,0.05)' : 'var(--bg-secondary)',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="digestMode"
                value="instant"
                checked={preferences.digestMode === 'instant'}
                onChange={() => setPreferences({ ...preferences, digestMode: 'instant' })}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong style={{ fontSize: 14 }}>Real-time Delivery</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Receive notifications immediately as events occur (recommended).
                </p>
              </div>
            </label>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 10,
              border: `2px solid ${preferences.digestMode === 'daily_digest' ? '#3b82f6' : 'var(--border-color)'}`,
              background: preferences.digestMode === 'daily_digest' ? 'rgba(59,130,246,0.05)' : 'var(--bg-secondary)',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="digestMode"
                value="daily_digest"
                checked={preferences.digestMode === 'daily_digest'}
                onChange={() => setPreferences({ ...preferences, digestMode: 'daily_digest' })}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong style={{ fontSize: 14 }}>Daily Evening Digest</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  A single email summary grouping all daily notices sent at 7:00 PM.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ padding: 8, borderRadius: 8, background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                <Clock size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Quiet Hours (Do Not Disturb)</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Hold non-urgent emails overnight</p>
              </div>
            </div>

            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={preferences.quietHours?.enabled}
                onChange={(e) => setPreferences({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, enabled: e.target.checked }
                })}
                style={{ width: 18, height: 18 }}
              />
            </label>
          </div>

          {preferences.quietHours?.enabled && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
              <span>Silence notifications between</span>
              <select 
                value={preferences.quietHours?.startHour || 22}
                onChange={(e) => setPreferences({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, startHour: Number(e.target.value) }
                })}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}
              >
                <option value={20}>8:00 PM</option>
                <option value={21}>9:00 PM</option>
                <option value={22}>10:00 PM</option>
                <option value={23}>11:00 PM</option>
              </select>
              <span>and</span>
              <select 
                value={preferences.quietHours?.endHour || 7}
                onChange={(e) => setPreferences({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, endHour: Number(e.target.value) }
                })}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}
              >
                <option value={6}>6:00 AM</option>
                <option value={7}>7:00 AM</option>
                <option value={8}>8:00 AM</option>
                <option value={9}>9:00 AM</option>
              </select>
            </div>
          )}
        </div>

        {/* Policy Info Notice */}
        <div style={{
          display: 'flex', gap: 12, padding: '14px 18px', background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, marginBottom: 24, fontSize: 13, color: 'var(--text-secondary)'
        }}>
          <Info size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Institutional Policy Note:</strong> In accordance with university academic regulations, mandatory tuition fee dues and official campus safety notices cannot be opted out of.
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px' }}>
            <Check size={16} />
            {saving ? 'Saving Preferences...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
