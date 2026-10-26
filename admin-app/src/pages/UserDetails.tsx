import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserDetails, getUsers, getRides, banUser, unbanUser } from '../api/client';
import { ArrowLeft, Phone, Mail, Wallet, MapPin, Navigation, AlertCircle, Ban, CheckCircle, RefreshCw } from 'lucide-react';

export default function UserDetails() {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [userRides, setUserRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      // Try dedicated endpoint first, fallback to fetching all users
      let foundUser = null;
      let rides: any[] = [];

      try {
        const [userRes, ridesRes] = await Promise.all([
          getUserDetails(id),
          getRides(),
        ]);
        foundUser = userRes;
        rides = Array.isArray(ridesRes) ? ridesRes.filter((r: any) => r.user_id === Number(id)) : [];
      } catch {
        // getUserDetails may not be implemented on backend — fallback to getUsers list
        const [users, ridesRes] = await Promise.all([getUsers(), getRides()]);
        foundUser = users.find((u: any) => u.id === Number(id));
        rides = Array.isArray(ridesRes) ? ridesRes.filter((r: any) => r.user_id === Number(id)) : [];
      }

      setUser(foundUser || null);
      setUserRides(rides);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load user details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleBanToggle = async () => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to ${user.is_banned ? 'unban' : 'ban'} this user?`)) return;
    setActionLoading(true);
    try {
      if (user.is_banned) {
        await unbanUser(user.id);
      } else {
        await banUser(user.id);
      }
      setUser((prev: any) => ({ ...prev, is_banned: !prev.is_banned }));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { color: '#059669', bg: 'rgba(5,150,105,0.1)' };
      case 'cancelled': return { color: '#dc2626', bg: 'rgba(220,38,38,0.1)' };
      case 'pending': return { color: '#d97706', bg: 'rgba(217,119,6,0.1)' };
      default: return { color: '#2563eb', bg: 'rgba(37,99,235,0.1)' };
    }
  };

  if (loading) {
    return (
      <div style={styles.centerState}>
        <div style={styles.spinner}></div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Loading user profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerState}>
        <AlertCircle size={36} color="var(--danger)" />
        <p style={{ color: 'var(--danger)', marginTop: '10px', fontWeight: 600 }}>{error}</p>
        <button style={styles.retryBtn} onClick={fetchData}><RefreshCw size={14} /> Retry</button>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.centerState}>
        <AlertCircle size={36} color="var(--warning)" />
        <p style={{ color: 'var(--warning)', marginTop: '10px', fontWeight: 600 }}>User not found.</p>
        <Link to="/users" style={styles.backLink}>← Back to Users</Link>
      </div>
    );
  }

  const totalSpent = userRides.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.fare || 0), 0);
  const completedRides = userRides.filter(r => r.status === 'completed').length;
  const cancelledRides = userRides.filter(r => r.status === 'cancelled').length;

  return (
    <div>
      <div style={styles.header}>
        <Link to="/users" style={styles.backBtn}><ArrowLeft size={16} /> Back to Users</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={styles.title}>User Profile</h1>
          <button
            style={user.is_banned ? styles.unbanBtn : styles.banBtn}
            onClick={handleBanToggle}
            disabled={actionLoading}
          >
            {user.is_banned
              ? <><CheckCircle size={15} /> {actionLoading ? 'Processing...' : 'Unban User'}</>
              : <><Ban size={15} /> {actionLoading ? 'Processing...' : 'Ban User'}</>}
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Profile Card */}
        <div className="glass" style={styles.profileCard}>
          <div style={{ ...styles.avatarLarge, opacity: user.is_banned ? 0.6 : 1 }}>
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <h2 style={styles.userName}>{user.name}</h2>
          {user.is_banned && <span style={styles.bannedBadge}>Account Banned</span>}
          <p style={styles.userJoined}>
            Joined {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
          </p>

          <div style={styles.statsRow}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{completedRides}</span>
              <span style={styles.statLabel}>Rides</span>
            </div>
            <div style={styles.statDivider}></div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>${totalSpent.toFixed(0)}</span>
              <span style={styles.statLabel}>Spent</span>
            </div>
            <div style={styles.statDivider}></div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{cancelledRides}</span>
              <span style={styles.statLabel}>Cancelled</span>
            </div>
          </div>

          <div style={styles.infoList}>
            <div style={styles.infoRow}><Mail size={16} color="var(--primary-accent)" /><span>{user.email || 'N/A'}</span></div>
            <div style={styles.infoRow}><Phone size={16} color="var(--primary-accent)" /><span>{user.phone || 'N/A'}</span></div>
            <div style={styles.infoRow}>
              <Wallet size={16} color="#059669" />
              <span style={{ color: '#059669', fontWeight: 700 }}>${user.wallet_balance?.toFixed(2) ?? '0.00'} Wallet</span>
            </div>
          </div>
        </div>

        {/* Ride History */}
        <div className="glass" style={styles.historyCard}>
          <div style={styles.historyHeader}>
            <h3 style={styles.historyTitle}>Ride History ({userRides.length})</h3>
            <span style={styles.totalBadge}>Total Spent: ${totalSpent.toFixed(2)}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Fare</th>
                  <th style={styles.th}>Payment</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {userRides.map((ride) => {
                  const sc = getStatusColor(ride.status);
                  return (
                    <tr key={ride.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.routeWrap}>
                          <div style={styles.routeItem}><MapPin size={13} color="#2563eb" /><span style={styles.truncate}>{ride.pickup || 'N/A'}</span></div>
                          <div style={styles.routeItem}><Navigation size={13} color="#dc2626" /><span style={styles.truncate}>{ride.dropoff || 'N/A'}</span></div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, color: sc.color, backgroundColor: sc.bg }}>
                          {ride.status?.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}><span style={{ fontWeight: 700 }}>${ride.fare?.toFixed(2) ?? '0.00'}</span></td>
                      <td style={styles.td}>
                        <span style={styles.paymentBadge}>{ride.payment_method?.toUpperCase() || 'N/A'}</span>
                      </td>
                      <td style={styles.td}>{ride.created_at ? new Date(ride.created_at).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  );
                })}
                {userRides.length === 0 && (
                  <tr>
                    <td colSpan={5} style={styles.emptyState}>No rides found for this user.</td>
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

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: '24px' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', marginBottom: '12px', fontWeight: 500 },
  backLink: { marginTop: '16px', color: 'var(--primary-accent)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 },
  title: { fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' },
  banBtn: { backgroundColor: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' },
  unbanBtn: { backgroundColor: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' },
  grid: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' },
  profileCard: { padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRadius: 'var(--radius-lg)' },
  avatarLarge: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, marginBottom: '14px' },
  userName: { fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' },
  bannedBadge: { backgroundColor: 'rgba(220,38,38,0.1)', color: '#dc2626', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, marginBottom: '8px' },
  userJoined: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' },
  statsRow: { display: 'flex', gap: '0', width: '100%', backgroundColor: 'var(--bg-base)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', border: '1px solid var(--border-color)' },
  statItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 8px', gap: '4px' },
  statValue: { fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' },
  statLabel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  statDivider: { width: '1px', backgroundColor: 'var(--border-color)', alignSelf: 'stretch' },
  infoList: { width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' },
  infoRow: { display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 },
  historyCard: { borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  historyHeader: { padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' },
  historyTitle: { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' },
  totalBadge: { backgroundColor: 'var(--primary-glow)', color: 'var(--primary-accent)', padding: '6px 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-hover)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '14px 20px', fontSize: '14px', color: 'var(--text-primary)' },
  routeWrap: { display: 'flex', flexDirection: 'column', gap: '6px' },
  routeItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' },
  truncate: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' },
  badge: { padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 },
  paymentBadge: { backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' },
  emptyState: { textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' },
  centerState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '8px' },
  spinner: { width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  retryBtn: { marginTop: '8px', padding: '8px 20px', backgroundColor: 'var(--primary-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
};
