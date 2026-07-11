import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDrivers, getRides } from '../api/client';
import { ArrowLeft, Car, Phone, Mail, Activity, MapPin, Navigation, DollarSign, Star } from 'lucide-react';

export default function DriverDetails() {
  const { id } = useParams();
  const [driver, setDriver] = useState<any>(null);
  const [driverRides, setDriverRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [drivers, rides] = await Promise.all([getDrivers(), getRides()]);
        const foundDriver = drivers.find((d: any) => d.id === Number(id));
        const foundRides = rides.filter((r: any) => r.driver_id === Number(id));
        setDriver(foundDriver);
        setDriverRides(foundRides);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading driver details...</div>;
  if (!driver) return <div style={{ color: 'var(--danger)' }}>Driver not found.</div>;

  const totalDriverRevenue = driverRides
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.fare || 0), 0);
  
  // Assuming 80% goes to driver, 20% to admin
  const driverEarnings = totalDriverRevenue * 0.8;
  const adminCommission = totalDriverRevenue * 0.2;

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
        <Link to="/drivers" style={styles.backBtn}><ArrowLeft size={16} /> Back to Drivers</Link>
        <h1 style={styles.title}>Driver Profile</h1>
      </div>

      <div style={styles.grid}>
        {/* Profile Card */}
        <div className="glass" style={styles.profileCard}>
          <div style={styles.avatarLarge}>{driver.name.charAt(0)}</div>
          <h2 style={styles.userName}>{driver.name}</h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <span style={styles.ratingBadge}><Star size={14} fill="currentColor" /> {driver.rating?.toFixed(1) || '0.0'}</span>
            {driver.is_online ? <span style={styles.onlineBadge}>Online</span> : <span style={styles.offlineBadge}>Offline</span>}
          </div>

          <div style={styles.infoList}>
            <div style={styles.infoRow}><Mail size={16} /> <span>{driver.email}</span></div>
            <div style={styles.infoRow}><Phone size={16} /> <span>{driver.phone}</span></div>
          </div>

          <div style={styles.earningsBox}>
            <div style={styles.earningsItem}>
              <span style={styles.earningsLabel}>Driver Earnings (80%)</span>
              <span style={styles.earningsValue}>${driverEarnings.toFixed(2)}</span>
            </div>
            <div style={styles.earningsItem}>
              <span style={styles.earningsLabel}>Admin Com. (20%)</span>
              <span style={{ ...styles.earningsValue, color: 'var(--text-secondary)' }}>${adminCommission.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Ride History Table */}
        <div className="glass" style={styles.historyCard}>
          <div style={styles.historyHeader}>
            <h3 style={styles.historyTitle}>Completed & Past Rides ({driverRides.length})</h3>
            <span style={styles.totalRevenueBadge}>Gross Rev: ${totalDriverRevenue.toFixed(2)}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Gross Fare</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {driverRides.map((ride) => (
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
                {driverRides.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No rides assigned yet.</td>
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
  grid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' },
  profileCard: { padding: '32px 24px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', textAlign: 'center' as const, borderRadius: 'var(--radius-lg)' },
  avatarLarge: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#8b5cf615', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, marginBottom: '16px' },
  userName: { fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' },
  ratingBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--warning)', color: '#fff', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600 },
  onlineBadge: { backgroundColor: 'var(--success)', color: '#fff', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600 },
  offlineBadge: { backgroundColor: 'var(--text-muted)', color: '#fff', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600 },
  infoList: { width: '100%', display: 'flex', flexDirection: 'column' as const, gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginBottom: '24px' },
  infoRow: { display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 },
  earningsBox: { width: '100%', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  earningsItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  earningsLabel: { fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 },
  earningsValue: { fontSize: '15px', color: 'var(--success)', fontWeight: 700 },
  historyCard: { borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  historyHeader: { padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' },
  historyTitle: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' },
  totalRevenueBadge: { backgroundColor: 'var(--primary-glow)', color: 'var(--primary-accent)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)' },
  tr: { borderBottom: '1px solid var(--border-color)', transition: 'var(--transition)' },
  td: { padding: '16px 24px', fontSize: '14px', color: 'var(--text-primary)' },
  routeWrap: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  routeItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' },
  truncate: { whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' },
  badge: { padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 600 },
};
