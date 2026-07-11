import React, { useEffect, useState } from 'react';
import { getRides } from '../api/client';
import { MoreVertical, MapPin, Navigation } from 'lucide-react';

export default function RidesList() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRides().then(setRides).finally(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--success)';
      case 'cancelled': return 'var(--danger)';
      case 'pending': return 'var(--warning)';
      default: return 'var(--primary-accent)';
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Ride Management</h1>
        <p style={styles.subtitle}>Track all rides across the platform</p>
      </div>

      <div className="glass" style={styles.tableCard}>
        {loading ? (
          <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading rides...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Route</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Fare</th>
                <th style={styles.th}>Payment</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => (
                <tr key={ride.id} style={styles.tr}>
                  <td style={styles.td}>#{ride.id}</td>
                  <td style={styles.td}>
                    <div style={styles.routeWrap}>
                      <div style={styles.routeItem}>
                        <MapPin size={14} color="var(--primary-accent)" />
                        <span style={styles.truncate}>{ride.pickup}</span>
                      </div>
                      <div style={styles.routeItem}>
                        <Navigation size={14} color="var(--danger)" />
                        <span style={styles.truncate}>{ride.dropoff}</span>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      color: getStatusColor(ride.status),
                      backgroundColor: `${getStatusColor(ride.status)}20`
                    }}>
                      {ride.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600 }}>${ride.fare?.toFixed(2) || '0.00'}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.paymentBadge}>{ride.payment_method?.toUpperCase()}</span>
                  </td>
                  <td style={styles.td}>{new Date(ride.created_at).toLocaleString()}</td>
                  <td style={styles.td}>
                    <button style={styles.actionBtn}>
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {rides.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No rides found.
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
  routeWrap: { display: 'flex', flexDirection: 'column' as const, gap: '6px', maxWidth: '300px' },
  routeItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' },
  truncate: { whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  badge: { padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 700 },
  paymentBadge: { backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' },
  actionBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }
};
