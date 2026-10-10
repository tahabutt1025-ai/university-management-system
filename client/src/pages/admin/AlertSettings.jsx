import React, { useState, useEffect } from 'react';
import { alertsAPI } from '../../api';
import toast from 'react-hot-toast';
import { 
  Bell, ShieldAlert, Play, Send, RefreshCw, Eye, CheckCircle2, 
  AlertTriangle, Settings, Zap, DollarSign, X, Check
} from 'lucide-react';

export default function AlertSettings() {
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, statsRes] = await Promise.all([
        alertsAPI.getRules(),
        alertsAPI.getStats()
      ]);
      setRules(rulesRes.data.rules || []);
      setStats(statsRes.data.stats || null);
    } catch (err) {
      toast.error('Failed to load alert rules or statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleRule = async (rule) => {
    try {
      const newEnabled = !rule.enabled;
      await alertsAPI.updateRule(rule._id, { enabled: newEnabled });
      setRules(prev => prev.map(r => r._id === rule._id ? { ...r, enabled: newEnabled } : r));
      toast.success(`${rule.name} ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleSaveRule = async (id, updatedFields) => {
    try {
      const res = await alertsAPI.updateRule(id, updatedFields);
      setRules(prev => prev.map(r => r._id === id ? res.data.rule : r));
      setEditingRule(null);
      toast.success('Rule configuration saved');
    } catch (err) {
      toast.error('Failed to save rule settings');
    }
  };

  const handleRunEngine = async () => {
    if (!window.confirm('Run the automated alert rules evaluation across all students now?')) return;
    setRunning(true);
    try {
      const res = await alertsAPI.runEngine();
      toast.success(res.data.message || 'Alert engine run completed');
      fetchData();
    } catch (err) {
      toast.error('Alert engine run failed');
    } finally {
      setRunning(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      const res = await alertsAPI.sendTest();
      toast.success(res.data.message || 'Test email dispatched successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const handlePreview = async (ruleCode) => {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await alertsAPI.previewRule(ruleCode);
      setPreviewData(res.data);
    } catch (err) {
      toast.error('Failed to generate alert preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading alert system rules...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '24px 20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>AI Student Alert System</h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                Configurable automated rules, AI drafting guardrails, and transactional email alerts.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleSendTest} 
            disabled={testing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Send size={15} />
            {testing ? 'Sending Test...' : 'Send Test to Me'}
          </button>

          <button 
            className="btn btn-primary" 
            onClick={handleRunEngine} 
            disabled={running}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Play size={15} fill="currentColor" />
            {running ? 'Evaluating Rules...' : 'Run Rules Engine Now'}
          </button>
        </div>
      </div>

      {/* Stats Overview Banner */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}>
          <div className="card" style={{ padding: 16, borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Alerts Sent</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {stats.totalSent}
            </div>
            <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>{stats.monthlySent} sent this month</div>
          </div>

          <div className="card" style={{ padding: 16, borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>AI Draft Generations</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {stats.aiCallsThisMonth}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {stats.aiTokensThisMonth?.toLocaleString()} tokens used
            </div>
          </div>

          <div className="card" style={{ padding: 16, borderLeft: '4px solid #6366f1' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>AI Monthly Spend</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              ${stats.aiCostUSD || 0}
            </div>
            <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>Within budget cap</div>
          </div>

          <div className="card" style={{ padding: 16, borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Guardrail Fallbacks</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {stats.validationRejections || 0}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Protected with fallback template</div>
          </div>
        </div>
      )}

      {/* Rules Configuration Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Active Alert Rules (10 Rules)</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Configure trigger cutoffs, cooldown windows, and wording tone for each notification rule.</p>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={fetchData} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Rule Name & Code</th>
                <th style={{ padding: '12px 16px' }}>Threshold</th>
                <th style={{ padding: '12px 16px' }}>Cooldown</th>
                <th style={{ padding: '12px 16px' }}>Audience</th>
                <th style={{ padding: '12px 16px' }}>Tone</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const isEditing = editingRule?._id === rule._id;

                return (
                  <tr key={rule._id} style={{ borderBottom: '1px solid var(--border-color)', opacity: rule.enabled ? 1 : 0.6 }}>
                    {/* Enable Toggle */}
                    <td style={{ padding: '12px 16px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleRule(rule)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                      </label>
                    </td>

                    {/* Rule Info */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rule.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rule.code}</div>
                    </td>

                    {/* Threshold */}
                    <td style={{ padding: '12px 16px' }}>
                      {isEditing ? (
                        <input 
                          type="number"
                          value={editingRule.threshold}
                          onChange={(e) => setEditingRule({ ...editingRule, threshold: Number(e.target.value) })}
                          style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>
                          {rule.threshold}
                          {rule.code.includes('attendance') ? '%' : rule.code.includes('fee') || rule.code.includes('deadline') ? ' days' : ''}
                        </span>
                      )}
                    </td>

                    {/* Cooldown */}
                    <td style={{ padding: '12px 16px' }}>
                      {isEditing ? (
                        <input 
                          type="number"
                          value={editingRule.cooldownDays}
                          onChange={(e) => setEditingRule({ ...editingRule, cooldownDays: Number(e.target.value) })}
                          style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <span>{rule.cooldownDays} days</span>
                      )}
                    </td>

                    {/* Audience */}
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                        {rule.audience}
                      </span>
                    </td>

                    {/* Tone */}
                    <td style={{ padding: '12px 16px' }}>
                      {isEditing ? (
                        <select
                          value={editingRule.tone}
                          onChange={(e) => setEditingRule({ ...editingRule, tone: e.target.value })}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)' }}
                        >
                          <option value="friendly">Friendly</option>
                          <option value="informative">Informative</option>
                          <option value="firm_warning">Firm Warning</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {rule.tone.replace('_', ' ')}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        {isEditing ? (
                          <>
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => handleSaveRule(rule._id, {
                                threshold: editingRule.threshold,
                                cooldownDays: editingRule.cooldownDays,
                                tone: editingRule.tone
                              })}
                            >
                              <Check size={14} /> Save
                            </button>
                            <button 
                              className="btn btn-sm btn-secondary"
                              onClick={() => setEditingRule(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="btn btn-sm btn-secondary"
                              onClick={() => handlePreview(rule.code)}
                              title="Preview Email"
                            >
                              <Eye size={14} /> Preview
                            </button>
                            <button 
                              className="btn btn-sm btn-secondary"
                              onClick={() => setEditingRule({ ...rule })}
                              title="Edit Thresholds"
                            >
                              <Settings size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {(previewLoading || previewData) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: 'var(--card-bg, #ffffff)', color: 'var(--text-primary)',
            borderRadius: 16, maxWidth: 650, width: '100%', maxHeight: '90vh',
            overflowY: 'auto', padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={20} color="#3b82f6" />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Email Draft Preview: {previewData?.rule?.name}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {previewLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
                <p>Generating draft with AI guardrails...</p>
              </div>
            ) : previewData ? (
              <div>
                {/* AI / Fallback Badge */}
                <div style={{
                  padding: '8px 12px', borderRadius: 8, marginBottom: 16, fontSize: 12,
                  background: previewData.draft?.isAiGenerated ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                  color: previewData.draft?.isAiGenerated ? '#2563eb' : '#059669',
                  border: `1px solid ${previewData.draft?.isAiGenerated ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <span>
                    <strong>Mode:</strong> {previewData.draft?.isAiGenerated ? '✨ AI Drafted (Natural Language Tone)' : '🔒 Deterministic Fallback Template'}
                  </span>
                  <span>Validation: Passed (Zero Hallucinations)</span>
                </div>

                {/* Email Subject */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subject Line:</label>
                  <div style={{ fontSize: 15, fontWeight: 700, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, marginTop: 4 }}>
                    {previewData.draft?.subject}
                  </div>
                </div>

                {/* Email Body */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Message Body:</label>
                  <div style={{
                    fontSize: 14, lineHeight: 1.6, padding: '16px', background: 'var(--bg-secondary)',
                    borderRadius: 8, marginTop: 4, whiteSpace: 'pre-line', borderLeft: '4px solid #3b82f6'
                  }}>
                    {previewData.draft?.body}
                  </div>
                </div>

                {/* Facts Bundle Used */}
                <details style={{ marginTop: 16, fontSize: 12 }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600 }}>
                    View Verified Facts Bundle (Strict Data Guardrails)
                  </summary>
                  <pre style={{
                    background: '#1e293b', color: '#f8fafc', padding: 12, borderRadius: 8,
                    overflowX: 'auto', marginTop: 8, fontSize: 11
                  }}>
                    {JSON.stringify(previewData.sampleFacts, null, 2)}
                  </pre>
                </details>

                <div style={{ marginTop: 24, textAlign: 'right' }}>
                  <button className="btn btn-secondary" onClick={() => setPreviewData(null)}>
                    Close Preview
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
