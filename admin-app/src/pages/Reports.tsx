import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Car, CheckCircle, XCircle, Users, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { getReports } from '../api/client';

const PERIODS = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'Last 7 days' },
  { value: 'monthly', label: 'Last 30 days' },
  { value: 'yearly', label: 'Last 12 months' },
];
const PIE_COLORS = ['#2563eb', '#059669', '#d97706', '#8b5cf6', '#dc2626'];
const money = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Reports() {
  const [period, setPeriod] = useState('weekly');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getReports(period));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [['Period', 'Rides', 'Gross (USD)', 'Admin (USD)', 'Driver (USD)']];
    data.timeline.forEach((t: any) => rows.push([t.label, t.rides, t.gross, t.admin, t.driver]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `golden-ride-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = data?.summary;
  const cards = s ? [
    { title: 'Gross Revenue', value: money(s.gross_revenue), icon: <DollarSign size={22} />, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
    { title: `Admin Commission (${data.commission_percent}%)`, value: money(s.admin_commission), icon: <TrendingUp size={22} />, color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    { title: 'Driver Earnings', value: money(s.driver_earnings), icon: <DollarSign size={22} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { title: 'Avg. Fare', value: money(s.avg_fare), icon: <Car size={22} />, color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    { title: 'Completed Rides', value: s.completed_rides, icon: <CheckCircle size={22} />, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
    { title: 'Cancelled Rides', value: s.cancelled_rides, icon: <XCircle size={22} />, color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
    { title: 'Completion Rate', value: `${s.completion_rate}%`, icon: <TrendingUp size={22} />, color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    { title: 'New Riders / Drivers', value: `${s.new_users} / ${s.new_drivers}`, icon: <Users size={22} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  ] : [];

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Reports</h1>
          <p style={styles.subtitle}>Revenue, commission and ride performance</p>
        </div>
        <div style={styles.actions}>
          <select id="report-period" value={period} onChange={e => setPeriod(e.target.value)} style={styles.select}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button id="report-refresh" style={styles.btn} onClick={load}><RefreshCw size={14} /> Refresh</button>
          <button id="report-export" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={exportCsv} disabled={!data}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {loading && <div style={styles.center}><div style={styles.spinner} /></div>}
      {error && !loading && (
        <div style={styles.center}>
          <AlertCircle size={36} color="var(--danger)" />
          <p style={{ color: 'var(--danger)', marginTop: 10, fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {data && !loading && !error && (
        <>
          <div style={styles.grid}>
            {cards.map(c => (
              <div key={c.title} style={styles.card}>
                <div style={{ ...styles.iconBox, color: c.color, backgroundColor: c.bg }}>{c.icon}</div>
                <div>
                  <p style={styles.cardTitle}>{c.title}</p>
                  <p style={styles.cardValue}>{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.panel, flex: 2 }}>
              <h3 style={styles.panelTitle}>Revenue Breakdown</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.timeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: any) => money(Number(v))} />
                    <Legend />
                    <Area type="monotone" dataKey="gross" name="Gross" stroke="#2563eb" fill="rgba(37,99,235,0.12)" />
                    <Bar dataKey="admin" name="Admin" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="driver" name="Drivers" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ ...styles.panel, flex: 1 }}>
              <h3 style={styles.panelTitle}>Payment Methods</h3>
              {data.payment_methods.length === 0 ? (
                <p style={styles.empty}>No completed rides in this period.</p>
              ) : (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.payment_methods} dataKey="total" nameKey="method" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {data.payment_methods.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => money(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Top Drivers</h3>
            {data.top_drivers.length === 0 ? (
              <p style={styles.empty}>No driver earnings in this period.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Driver</th>
                    <th style={styles.th}>Rides</th>
                    <th style={styles.th}>Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_drivers.map((d: any, i: number) => (
                    <tr key={d.driver_id}>
                      <td style={styles.td}>{i + 1}</td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{d.name}</td>
                      <td style={styles.td}>{d.rides}</td>
                      <td style={{ ...styles.td, color: 'var(--success)', fontWeight: 600 }}>{money(d.earnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { color: 'var(--text-muted)', fontSize: 14, marginTop: 4 },
  actions: { display: 'flex', gap: 10, alignItems: 'center' },
  select: { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: 14, color: 'var(--text-primary)' },
  btn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnPrimary: { background: 'var(--primary-accent)', color: '#fff', border: '1px solid var(--primary-accent)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 24 },
  card: { display: 'flex', alignItems: 'center', gap: 14, padding: 18, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 14, boxShadow: 'var(--shadow-sm)' },
  iconBox: { width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 },
  cardValue: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 },
  row: { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  panel: { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-sm)', marginBottom: 24, minWidth: 280 },
  panelTitle: { fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' },
  empty: { color: 'var(--text-muted)', fontSize: 14, padding: '30px 0', textAlign: 'center' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' },
  td: { padding: '12px', fontSize: 14, borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 },
  spinner: { width: 36, height: 36, border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
