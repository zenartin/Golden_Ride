import React, { useEffect, useState } from 'react';
import { Users, Car, Map, DollarSign, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { getDashboardStats, getChartData } from '../api/client';

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>({ revenue: [], activity: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, charts] = await Promise.all([
        getDashboardStats(),
        getChartData(),
      ]);
      setStats(statsData);
      setChartData(charts);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div style={styles.centerState}>
        <div style={styles.loadingSpinner}></div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerState}>
        <AlertCircle size={40} color="var(--danger)" />
        <p style={{ color: 'var(--danger)', marginTop: '12px', fontWeight: 600 }}>{error}</p>
        <button style={styles.retryBtn} onClick={fetchData}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const grossRev = stats?.total_revenue || 0;
  const adminCom = grossRev * 0.2;
  const driverEarn = grossRev * 0.8;

  const statCards = [
    { title: 'Gross Revenue', value: `$${grossRev.toFixed(2)}`, icon: <DollarSign size={22} />, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
    { title: 'Admin Commission (20%)', value: `$${adminCom.toFixed(2)}`, icon: <TrendingUp size={22} />, color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    { title: 'Driver Earnings (80%)', value: `$${driverEarn.toFixed(2)}`, icon: <DollarSign size={22} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { title: 'Active Trips', value: stats?.active_trips ?? 0, icon: <Map size={22} />, color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    { title: 'Total Users', value: stats?.total_users ?? 0, icon: <Users size={22} />, color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    { title: 'Total Drivers', value: stats?.total_drivers ?? 0, icon: <Car size={22} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  ];

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard Overview</h1>
        <p style={styles.subtitle}>Real-time metrics and analytics for Golden Ride</p>
      </div>

      <div style={{ padding: '16px', backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #2563eb' }}>
        <strong>Important: Commission Model & Payouts</strong><br/>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Users pay the total fare directly to you (the Admin) via Stripe/Razorpay or Cash. 
          The platform keeps a <strong>20% commission</strong>, and <strong>80%</strong> is owed to the driver. 
          The amount owed accumulates in the driver's Balance. Admins must manually settle payouts to drivers and mark them as paid in the Driver Details page.
        </span>
      </div>

      {/* Stat Cards */}
      <div style={styles.grid}>
        {statCards.map((card, idx) => (
          <div key={idx} className="glass" style={styles.card}>
            <div style={styles.cardTop}>
              <div>
                <p style={styles.cardTitle}>{card.title}</p>
                <p style={styles.cardValue}>{card.value}</p>
              </div>
              <div style={{ ...styles.iconWrap, color: card.color, backgroundColor: card.bg }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={styles.chartsGrid}>
        <div className="glass" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Revenue — Last 7 Days</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData.revenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Ride Activity — Last 7 Days</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData.activity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '13px' }} cursor={{ fill: 'var(--bg-surface-hover)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#059669" radius={[0, 0, 4, 4]} />
                <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: '28px' },
  title: { fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' },
  subtitle: { fontSize: '14px', color: 'var(--text-secondary)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' },
  card: { padding: '24px', borderRadius: 'var(--radius-md)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  cardTitle: { fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' },
  iconWrap: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardValue: { fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' },
  chartCard: { padding: '24px', borderRadius: 'var(--radius-md)' },
  chartTitle: { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' },
  centerState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '8px' },
  loadingSpinner: { width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  retryBtn: { marginTop: '12px', padding: '10px 20px', backgroundColor: 'var(--primary-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' },
};
