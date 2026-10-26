import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDriverDetails, getRides, approveDriver, rejectDriver, payoutDriver } from '../api/client';
import { ArrowLeft, Phone, Mail, FileText, MapPin, Navigation, AlertCircle, Star, CheckCircle, XCircle, RefreshCw, ShieldCheck, DollarSign } from 'lucide-react';

export default function DriverDetails() {
  const { id } = useParams();
  const [driver, setDriver] = useState<any>(null);
  const [driverRides, setDriverRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [driverData, rides] = await Promise.all([
        getDriverDetails(id),
        getRides(),
      ]);
      setDriver(driverData);
      const dr = Array.isArray(rides) ? rides.filter((r: any) => r.driver_id === Number(id)) : [];
      setDriverRides(dr);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load driver details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleApprove = async () => {
    if (!driver) return;
    setActionLoading(true);
    try {
      await approveDriver(driver.id);
      setDriver((prev: any) => ({ ...prev, is_approved: true }));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to approve driver.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!driver) return;
    if (!window.confirm('Are you sure you want to revoke approval for this driver?')) return;
    setActionLoading(true);
    try {
      await rejectDriver(driver.id);
      setDriver((prev: any) => ({ ...prev, is_approved: false }));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to revoke driver approval.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayout = async () => {
    if (!driver) return;
    const amountStr = window.prompt(`Enter amount to pay driver (Max: $${(driver.balance || 0).toFixed(2)}):`, (driver.balance || 0).toFixed(2));
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount.');
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await payoutDriver(driver.id, { amount });
      setDriver((prev: any) => ({ ...prev, balance: res.new_balance }));
      alert('Payout successful!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to process payout.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return { color: '#059669', backgroundColor: 'rgba(5,150,105,0.1)' };
      case 'cancelled': return { color: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)' };
      case 'pending': return { color: '#d97706', backgroundColor: 'rgba(217,119,6,0.1)' };
      default: return { color: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)' };
    }
  };

  if (loading) {
    return (
      <div style={styles.centerState}>
        <div style={styles.spinner}></div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Loading driver profile...</p>
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

  if (!driver) {
    return (
      <div style={styles.centerState}>
        <AlertCircle size={36} color="var(--warning)" />
        <p style={{ color: 'var(--warning)', marginTop: '10px', fontWeight: 600 }}>Driver not found.</p>
        <Link to="/drivers" style={styles.backLink}>← Back to Drivers</Link>
      </div>
    );
  }

  const totalGrossRev = driverRides
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.fare || 0), 0);
  const driverEarnings = totalGrossRev * 0.8;
  const adminCommission = totalGrossRev * 0.2;
  const completedCount = driverRides.filter(r => r.status === 'completed').length;
  const cancelledCount = driverRides.filter(r => r.status === 'cancelled').length;

  return (
    <div>
      <div style={styles.header}>
        <Link to="/drivers" style={styles.backBtn}><ArrowLeft size={16} /> Back to Drivers</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={styles.title}>Driver Profile</h1>
          {driver.is_approved ? (
            <button
              style={styles.rejectBtn}
              onClick={handleReject}
              disabled={actionLoading}
            >
              <XCircle size={15} /> {actionLoading ? 'Processing...' : 'Revoke Approval'}
            </button>
          ) : (
            <button
              style={styles.approveBtn}
              onClick={handleApprove}
              disabled={actionLoading}
            >
              <CheckCircle size={15} /> {actionLoading ? 'Processing...' : 'Approve Driver'}
            </button>
          )}
        </div>
      </div>

      <div style={styles.grid}>
        {/* Profile Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass" style={styles.profileCard}>
            <div style={styles.avatarLarge}>{driver.name?.charAt(0)?.toUpperCase() || '?'}</div>
            <h2 style={styles.userName}>{driver.name}</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={styles.ratingBadge}><Star size={13} fill="currentColor" /> {driver.rating?.toFixed(1) ?? '0.0'}</span>
              {driver.is_online
                ? <span style={styles.onlineBadge}>● Online</span>
                : <span style={styles.offlineBadge}>Offline</span>}
              {driver.is_approved
                ? <span style={styles.approvedBadge}><ShieldCheck size={12} /> Approved</span>
                : <span style={styles.pendingBadge}>Pending</span>}
            </div>

            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{completedCount}</span>
                <span style={styles.statLabel}>Rides</span>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>${driverEarnings.toFixed(0)}</span>
                <span style={styles.statLabel}>Earned</span>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{cancelledCount}</span>
                <span style={styles.statLabel}>Cancelled</span>
              </div>
            </div>

            <div style={styles.infoList}>
              <div style={styles.infoRow}><Mail size={15} color="var(--primary-accent)" /><span>{driver.email || 'N/A'}</span></div>
              <div style={styles.infoRow}><Phone size={15} color="var(--primary-accent)" /><span>{driver.phone || 'N/A'}</span></div>
            </div>
          </div>

          {/* Earnings Breakdown & Actions */}
          <div className="glass" style={{ ...styles.profileCard, gap: '14px', textAlign: 'left', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: 'rgba(37,99,235,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <strong>Note:</strong> Users pay you directly. The driver's balance represents the 80% cut you owe them. You must settle this balance manually.
            </div>
            
            <div style={styles.earningRow}>
              <span style={styles.earningLabel}>Gross Revenue (All Time)</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${totalGrossRev.toFixed(2)}</span>
            </div>
            <div style={styles.earningRow}>
              <span style={styles.earningLabel}>Driver Cut (80%)</span>
              <span style={{ fontWeight: 700, color: '#059669' }}>${driverEarnings.toFixed(2)}</span>
            </div>
            <div style={styles.earningRow}>
              <span style={styles.earningLabel}>Admin Commission (20%)</span>
              <span style={{ fontWeight: 700, color: 'var(--primary-accent)' }}>${adminCommission.toFixed(2)}</span>
            </div>
            
            <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-color)', margin: '8px 0' }}></div>
            
            <div style={styles.earningRow}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Unpaid Balance</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>${(driver.balance || 0).toFixed(2)}</span>
            </div>
            
            <button 
              style={{ ...styles.approveBtn, width: '100%', marginTop: '8px', backgroundColor: '#2563eb' }}
              onClick={handlePayout}
              disabled={actionLoading || (driver.balance || 0) <= 0}
            >
              <DollarSign size={15} /> {actionLoading ? 'Processing...' : 'Settle Driver Payout'}
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Vehicle & Documents */}
          <div className="glass" style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <FileText size={18} color="var(--primary-accent)" />
              <h3 style={styles.sectionTitle}>Vehicle &amp; Documents</h3>
            </div>
            <div style={styles.docsGrid}>
              {[
                { label: 'Vehicle Number', value: driver.documents?.vehicle_number },
                { label: 'License Plate', value: driver.documents?.vehicle_plate_number },
                { label: 'Vehicle Model', value: driver.documents?.vehicle_model },
                { label: 'Vehicle Year', value: driver.documents?.vehicle_year },
                { label: 'Vehicle Type', value: driver.documents?.vehicle_type },
                { label: 'Vehicle Color', value: driver.documents?.vehicle_color },
                { label: 'Vehicle VIN', value: driver.documents?.vehicle_vin },
                { label: 'License Number', value: driver.documents?.license_number },
                { label: 'License State', value: driver.documents?.license_state },
                { label: 'License Expiry', value: driver.documents?.license_expiry },
                { label: 'Insurance Policy', value: driver.documents?.insurance_policy },
                { label: 'Insurance Expiry', value: driver.documents?.insurance_expiry },
                { label: 'Bank Name', value: driver.documents?.bank_name },
                { label: 'Account Number', value: driver.documents?.account_number },
                { label: 'Routing Number', value: driver.documents?.routing_number },
                { label: 'Emergency Contact', value: driver.documents?.emergency_contact_name },
                { label: 'Emergency Phone', value: driver.documents?.emergency_contact_phone },
                { label: 'Tax ID', value: driver.documents?.tax_id },
                {
                  label: 'Background Check',
                  value: driver.documents?.criminal_bg_status?.toUpperCase() || 'PENDING',
                  color: driver.documents?.criminal_bg_status === 'approved' ? '#059669' : '#d97706',
                },
              ].map((item, i) => (
                <div key={i} style={styles.docItem}>
                  <span style={styles.docLabel}>{item.label}</span>
                  <span style={{ ...styles.docValue, color: item.color || 'var(--text-primary)' }}>
                    {item.value || 'N/A'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                { key: 'license_image', label: 'License Front' },
                { key: 'license_back_image', label: 'License Back' },
                { key: 'vehicle_image', label: 'Vehicle Photo' },
                { key: 'vehicle_registration_image', label: 'Registration' },
                { key: 'vehicle_inspection_image', label: 'Inspection' },
                { key: 'insurance_image', label: 'Insurance' },
                { key: 'w9_form_image', label: 'W9 Form' }
              ].map((doc, i) => driver.documents?.[doc.key] && (
                <a 
                  key={i} 
                  href={`https://api.golden-ride.com/${driver.documents[doc.key]}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563eb', borderRadius: '4px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                >
                  View {doc.label}
                </a>
              ))}
            </div>
          </div>

          {/* Ride History */}
          <div className="glass" style={{ ...styles.sectionCard, padding: 0, overflow: 'hidden' }}>
            <div style={{ ...styles.sectionHeader, padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={styles.sectionTitle}>Ride History ({driverRides.length})</h3>
              <span style={styles.totalBadge}>Gross: ${totalGrossRev.toFixed(2)}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Route</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Gross Fare</th>
                    <th style={styles.th}>Driver Cut</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {driverRides.map((ride) => {
                    const ss = getStatusStyle(ride.status);
                    return (
                      <tr key={ride.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.routeWrap}>
                            <div style={styles.routeItem}><MapPin size={13} color="#2563eb" /><span style={styles.truncate}>{ride.pickup || 'N/A'}</span></div>
                            <div style={styles.routeItem}><Navigation size={13} color="#dc2626" /><span style={styles.truncate}>{ride.dropoff || 'N/A'}</span></div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...ss }}>{ride.status?.toUpperCase()}</span>
                        </td>
                        <td style={styles.td}><span style={{ fontWeight: 700 }}>${ride.fare?.toFixed(2) ?? '0.00'}</span></td>
                        <td style={styles.td}><span style={{ fontWeight: 700, color: '#059669' }}>${((ride.fare || 0) * 0.8).toFixed(2)}</span></td>
                        <td style={styles.td}>{ride.created_at ? new Date(ride.created_at).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    );
                  })}
                  {driverRides.length === 0 && (
                    <tr>
                      <td colSpan={5} style={styles.emptyState}>No rides assigned to this driver yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
  approveBtn: { backgroundColor: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' },
  rejectBtn: { backgroundColor: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' },
  grid: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' },
  profileCard: { padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRadius: 'var(--radius-lg)' },
  avatarLarge: { width: '76px', height: '76px', borderRadius: '50%', backgroundColor: 'rgba(139,92,246,0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 800, marginBottom: '12px' },
  userName: { fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' },
  ratingBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#d97706', color: '#fff', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 },
  onlineBadge: { backgroundColor: 'rgba(5,150,105,0.15)', color: '#059669', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 },
  offlineBadge: { backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 },
  approvedBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(5,150,105,0.1)', color: '#059669', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 },
  pendingBadge: { backgroundColor: 'rgba(217,119,6,0.1)', color: '#d97706', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 },
  statsRow: { display: 'flex', width: '100%', backgroundColor: 'var(--bg-base)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', border: '1px solid var(--border-color)' },
  statItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 8px', gap: '4px' },
  statValue: { fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' },
  statLabel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  statDivider: { width: '1px', backgroundColor: 'var(--border-color)' },
  infoList: { width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' },
  infoRow: { display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 },
  earningRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 0', borderBottom: '1px solid var(--border-color)' },
  earningLabel: { fontSize: '13px', color: 'var(--text-muted)' },
  sectionCard: { borderRadius: 'var(--radius-lg)', padding: '20px 24px' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  sectionTitle: { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', flex: 1 },
  totalBadge: { backgroundColor: 'var(--primary-glow)', color: 'var(--primary-accent)', padding: '5px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 },
  docsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  docItem: { display: 'flex', flexDirection: 'column', padding: '12px', backgroundColor: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-color)', gap: '4px' },
  docLabel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  docValue: { fontSize: '13px', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-hover)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '14px 20px', fontSize: '14px', color: 'var(--text-primary)' },
  routeWrap: { display: 'flex', flexDirection: 'column', gap: '5px' },
  routeItem: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-secondary)' },
  truncate: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' },
  badge: { padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 },
  emptyState: { textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' },
  centerState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '8px' },
  spinner: { width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  retryBtn: { marginTop: '8px', padding: '8px 20px', backgroundColor: 'var(--primary-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
};
