import React, { useEffect, useState } from 'react';
import { getUsers } from '../api/client';
import { MoreVertical, Mail, Phone, Ban, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UsersList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>User Management</h1>
        <p style={styles.subtitle}>Manage all registered passengers</p>
      </div>

      <div className="glass" style={styles.tableCard}>
        {loading ? (
          <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading users...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Wallet</th>
                <th style={styles.th}>Country</th>
                <th style={styles.th}>Joined</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr 
                  key={user.id} 
                  style={{...styles.tr, cursor: 'pointer'}} 
                  onClick={() => navigate(`/users/${user.id}`)}
                >
                  <td style={styles.td}>
                    <div style={styles.userWrap}>
                      <div style={styles.avatar}>{user.name.charAt(0)}</div>
                      <span style={{ fontWeight: 600 }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.contactWrap}>
                      <div style={styles.contactItem}>
                        <Phone size={14} /> {user.phone}
                      </div>
                      <div style={styles.contactItem}>
                        <Mail size={14} /> {user.email}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                      ${user.wallet_balance?.toFixed(2) || '0.00'}
                    </span>
                  </td>
                  <td style={styles.td}>{user.country || 'N/A'}</td>
                  <td style={styles.td}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <button style={styles.actionBtn}>
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No users found.
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
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  tableCard: {
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    textAlign: 'left' as const,
    padding: '16px 24px',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'var(--transition)',
  },
  td: {
    padding: '16px 24px',
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
  userWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-glow)',
    color: 'var(--primary-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  contactWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
  }
};
