import React, { useEffect, useState } from 'react';
import { getStripeDashboard } from '../api/client';
import { ExternalLink, DollarSign, Clock, CheckCircle, AlertCircle, RefreshCw, TrendingUp, CreditCard, XCircle, Undo2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const money = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const COLORS = ['#2563eb', '#059669', '#d97706', '#8b5cf6', '#dc2626'];

const badge = (status: string): React.CSSProperties => {
  const map: Record<string, [string, string]> = {
    succeeded: ['#059669', 'rgba(5,150,105,0.1)'],
    failed: ['#dc2626', 'rgba(220,38,38,0.1)'],
    refunded: ['#8b5cf6', 'rgba(139,92,246,0.1)'],
  };
  const [color, bg] = map[status] || ['#d97706', 'rgba(217,119,6,0.1)'];
  return { color, background: bg, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' };
};

export default function StripeDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getStripeDashboard());
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Loading payments...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.center}>
        <AlertCircle size={36} color="var(--danger)" />
        <p style={{ color: 'var(--danger)', marginTop: 10, fontWeight: 600 }}>{error}</p>
        <button style={styles.btn} onClick={fetchData}><RefreshCw size={14} /> Retry</button>
      </div>
    );
  }

  const s = data.summary || {};
  const cards = [
    { title: 'Ride Revenue', value: money(s.ride_revenue), icon: <DollarSign size={22} />, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
    { title: 'Admin Commission', value: money(s.admin_commission), icon: <TrendingUp size={22} />, color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    { title: 'Driver Earnings', value: money(s.driver_earnings), icon: <DollarSign size={22} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { title: 'Online Collected', value: money(s.total_collected), icon: <CreditCard size={22} />, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
    { title: 'Stripe Available', value: money(data.balance?.available), icon: <CheckCircle size={22} />, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
    { title: 'Stripe Pending', value: money(data.balance?.pending), icon: <Clock size={22} />, color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    { title: 'Failed Payments', value: s.failed_payments ?? 0, icon: <XCircle size={22} />, color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
    { title: 'Refunds', value: s.refunded_payments ?? 0, icon: <Undo2 size={22} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  ];

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Payments</h1>
          <p style={styles.subtitle}>Ride revenue, payouts and Stripe activity</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button id="payments-refresh" style={styles.btn} onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
          <button id="payments-stripe" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => window.open('https://dashboard.stripe.com', '_blank')}>
            Open Stripe <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {!data.stripe?.connected && (
        <div style={styles.warn}>
          <AlertCircle size={16} /> Live Stripe data unavailable{data.stripe?.error ? `: ${data.stripe.error}` : '.'} Showing platform data only.
        </div>
      )}

      <div style={styles.grid}>
        {cards.map(c => (
          <div key={c.title} style={styles.card}>
            <div style={{ ...styles.iconBox, color: c.color, background: c.bg }}>{c.icon}</div>
            <div>
              <p style={styles.cardTitle}>{c.title}</p>
              <p style={styles.cardValue}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.panel, flex: 1 }}>
          <h3 style={styles.panelTitle}>Revenue by Payment Method</h3>
          {data.by_method?.length ? (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.by_method} dataKey="total" nameKey="method" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {data.by_method.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => money(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p style={styles.empty}>No completed rides yet.</p>}
        </div>

        <div style={{ ...styles.panel, flex: 2 }}>
          <h3 style={styles.panelTitle}>Recent Platform Payments</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Payment', 'Ride', 'Rider', 'Amount', 'Status', 'Date', 'Receipt'].map(h => <th key={h} style={styles.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.payments?.length ? data.payments.map((p: any) => (
                  <tr key={p.id}>
                    <td style={styles.td}>#{p.id}</td>
                    <td style={styles.td}>{p.ride_id ? `#${p.ride_id}` : '—'}</td>
                    <td style={styles.td}>#{p.user_id}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{money(p.amount)} {String(p.currency || 'usd').toUpperCase()}</td>
                    <td style={styles.td}><span style={badge(p.refund_status && p.refund_status !== 'none' ? 'refunded' : p.status)}>{p.refund_status && p.refund_status !== 'none' ? 'refunded' : p.status}</span></td>
                    <td style={styles.td}>{p.date ? new Date(p.date).toLocaleString() : '—'}</td>
                    <td style={styles.td}>{p.receipt_url ? <a href={p.receipt_url} target="_blank" rel="noreferrer" style={styles.link}>View</a> : '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>No online payments recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>Recent Stripe Charges (Live)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>{['Amount', 'Status', 'Date', 'Receipt'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.recent_charges?.length ? data.recent_charges.map((c: any) => (
                <tr key={c.id}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{money(c.amount)} {c.currency.toUpperCase()}</td>
                  <td style={styles.td}><span style={badge(c.status)}>{c.status}</span></td>
                  <td style={styles.td}>{new Date(c.created * 1000).toLocaleString()}</td>
                  <td style={styles.td}>{c.receipt_url ? <a href={c.receipt_url} target="_blank" rel="noreferrer" style={styles.link}>View Receipt</a> : '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>No recent charges found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { color: 'var(--text-muted)', fontSize: 14, marginTop: 4 },
  btn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  btnPrimary: { background: 'var(--primary-accent)', color: '#fff', border: '1px solid var(--primary-accent)', marginTop: 0 },
  warn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(217,119,6,0.1)', color: '#b45309', fontSize: 14, marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 24 },
  card: { display: 'flex', alignItems: 'center', gap: 14, padding: 18, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 14, boxShadow: 'var(--shadow-sm)' },
  iconBox: { width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 },
  cardValue: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  panel: { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-sm)', marginBottom: 24, minWidth: 280 },
  panelTitle: { fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' },
  empty: { color: 'var(--text-muted)', fontSize: 14, padding: '30px 0', textAlign: 'center' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' },
  td: { padding: 12, fontSize: 14, borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)' },
  link: { color: 'var(--primary-accent)', fontWeight: 600, textDecoration: 'none' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 },
  spinner: { width: 36, height: 36, border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
