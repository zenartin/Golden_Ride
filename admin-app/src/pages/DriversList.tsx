import React, { useEffect, useState } from 'react';
import { getDrivers } from '../api/client';
import { MoreVertical, Mail, Phone, ShieldCheck, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DriversList() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDrivers().then(setDrivers).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Driver Management</h1>
        <p style={styles.subtitle}>Manage all registered drivers and their approvals</p>
      </div>

      <div className="glass" style={styles.tableCard}>
        {loading ? (
          <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading drivers...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Approval</th>
                <th style={styles.th}>Rating</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr 
                  key={driver.id} 
                  style={{...styles.tr, cursor: 'pointer'}}
                  onClick={() => navigate(`/drivers/${driver.id}`)}
                >
                  <td style={styles.td}>
                    <div style={styles.userWrap}>
                      <div style={styles.avatar}>{driver.name.charAt(0)}</div>
                      <span style={{ fontWeight: 600 }}>{driver.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.contactWrap}>
                      <div style={styles.contactItem}>
                        <Phone size={14} /> {driver.phone}
                      </div>
                      <div style={styles.contactItem}>
                        <Mail size={14} /> {driver.email}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    {driver.is_online ? (
                      <span style={styles.badgeOnline}><Activity size={12} style={{marginRight: 4}}/> Online</span>
                    ) : (
                      <span style={styles.badgeOffline}>Offline</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {driver.is_approved ? (
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={16} /> Approved
                      </span>
                    ) : (
                      <span style={{ color: 'var(--warning)' }}>Pending</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600 }}>⭐ {driver.rating?.toFixed(1) || '0.0'}</span>
                  </td>
                  <td style={styles.td}>
                    <button style={styles.actionBtn}>
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No drivers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '14px' },
  tableCard: { borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '1px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)' },
  tr: { borderBottom: '1px solid var(--border-color)', transition: 'var(--transition)' },
  td: { padding: '16px 24px', fontSize: '14px', color: 'var(--text-primary)' },
  userWrap: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#8b5cf620', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  contactWrap: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  contactItem: { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' },
  badgeOnline: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center' },
  badgeOffline: { backgroundColor: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600 },
  actionBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }
};
