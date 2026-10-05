import { useState, useEffect } from 'react';
import { notificationsAPI } from '../../api';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const typeColors = {
  attendance_alert: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: '⚠️' },
  grade_alert: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: '📊' },
  fee_reminder: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', icon: '💰' },
  assignment: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', icon: '📋' },
  ai_insight: { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)', icon: '🤖' },
  announcement: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', icon: '📢' },
  system: { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', icon: '🔔' }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    await notificationsAPI.markRead(id);
    setNotifications(n => n.map(notif => notif._id === id ? { ...notif, isRead: true } : notif));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications(n => n.map(notif => ({ ...notif, isRead: true })));
    setUnreadCount(0);
    toast.success('All marked as read');
  };

  const deleteNotification = async (id) => {
    await notificationsAPI.delete(id);
    setNotifications(n => n.filter(notif => notif._id !== id));
    toast.success('Notification deleted');
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Notifications</h1>
          <p>{unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={markAllRead}>
            <CheckCheck size={14}/> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner"/></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state card" style={{ padding: '80px 0' }}>
          <Bell size={48} style={{ opacity: 0.3, marginBottom: 12 }}/>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(notif => {
            const style = typeColors[notif.type] || typeColors.system;
            return (
              <div
                key={notif._id}
                style={{
                  display: 'flex', gap: 14, padding: '16px 20px',
                  background: notif.isRead ? 'var(--bg-card)' : style.bg,
                  border: `1px solid ${notif.isRead ? 'var(--bg-border)' : style.border}`,
                  borderRadius: 12, transition: 'all 0.2s',
                  cursor: !notif.isRead ? 'pointer' : 'default',
                  opacity: notif.isRead ? 0.7 : 1
                }}
                onClick={() => !notif.isRead && markRead(notif._id)}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>{style.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: notif.isRead ? 500 : 700, color: 'var(--text-primary)' }}>{notif.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {!notif.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-500)', flexShrink: 0 }}/>}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(notif.createdAt)}</span>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={e => { e.stopPropagation(); deleteNotification(notif._id); }}>
                        <Trash2 size={12} color="var(--text-muted)"/>
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{notif.message}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      {notif.type?.replace(/_/g, ' ')} · {notif.priority} priority
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
