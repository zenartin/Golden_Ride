import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUsers, getRides } from '../api/client';
import { ArrowLeft, User, Phone, Mail, Wallet, MapPin, Navigation } from 'lucide-react';

export default function UserDetails() {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [userRides, setUserRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [users, rides] = await Promise.all([getUsers(), getRides()]);
        const foundUser = users.find((u: any) => u.id === Number(id));
        const foundRides = rides.filter((r: any) => r.user_id === Number(id));
        setUser(foundUser);
        setUserRides(foundRides);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading user details...</div>;
  if (!user) return <div style={{ color: 'var(--danger)' }}>User not found.</div>;

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
        <Link to="/users" style={styles.backBtn}><ArrowLeft size={16} /> Back to Users</Link>
        <h1 style={styles.title}>User Profile</h1>
      </div>

      <div style={styles.grid}>
        {/* Profile Card */}
        <div className="glass" style={styles.profileCard}>
          <div style={styles.avatarLarge}>{user.name.charAt(0)}</div>
          <h2 style={styles.userName}>{user.name}</h2>
          <p style={styles.userJoined}>Joined {new Date(user.created_at).toLocaleDateString()}</p>

          <div style={styles.infoList}>
            <div style={styles.infoRow}><Mail size={16} /> <span>{user.email}</span></div>
            <div style={styles.infoRow}><Phone size={16} /> <span>{user.phone}</span></div>
            <div style={styles.infoRow}><Wallet size={16} /> <span style={{color: 'var(--success)', fontWeight: 600}}>${user.wallet_balance?.toFixed(2) || '0.00'}</span></div>
          </div>
        </div>

        {/* Ride History Table */}
        <div className="glass" style={styles.historyCard}>
          <h3 style={styles.historyTitle}>Ride History</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Fare</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {userRides.map((ride) => (
                  <tr key={ride.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.routeWrap}>
                        <div style={styles.routeItem}><MapPin size={14} color="var(--primary-accent)" /> <span style={styles.truncate}>{ride.pickup}</span></div>
                        <div style={styles.routeItem}><Navigation size={14} color="var(--danger)" /> <span style={styles.truncate}>{ride.dropoff}</span></div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, color: getStatusColor(ride.status), backgroundColor: `${getStatusColor(ride.status)}15` }}>
                        {ride.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600 }}>${ride.fare?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td style={styles.td}>{new Date(ride.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {userRides.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No rides taken yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: { marginBottom: '24px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', marginBottom: '16px', fontWeight: 500 },
  title: { fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' },
  grid: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' },
  profileCard: { padding: '32px 24px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', textAlign: 'center' as const, borderRadius: 'var(--radius-lg)' },
  avatarLarge: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, marginBottom: '16px' },
  userName: { fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' },
  userJoined: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' },
  infoList: { width: '100%', display: 'flex', flexDirection: 'column' as const, gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' },
  infoRow: { display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 },
  historyCard: { borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  historyTitle: { padding: '24px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)' },
  tr: { borderBottom: '1px solid var(--border-color)', transition: 'var(--transition)' },
  td: { padding: '16px 24px', fontSize: '14px', color: 'var(--text-primary)' },
  routeWrap: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  routeItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' },
  truncate: { whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' },
  badge: { padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 600 },
};
