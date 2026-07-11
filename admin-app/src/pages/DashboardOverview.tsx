import React, { useEffect, useState } from 'react';
import { Users, Car, Map, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getDashboardStats, getChartData } from '../api/client';

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>({ revenue: [], activity: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsData, charts] = await Promise.all([
          getDashboardStats(),
          getChartData()
        ]);
        setStats(statsData);
        setChartData(charts);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</div>;
  }

  const grossRev = stats?.total_revenue || 0;
  const adminCom = grossRev * 0.2;
  const driverEarn = grossRev * 0.8;

  const statCards = [
    { title: 'Gross Revenue', value: `$${grossRev.toFixed(2)}`, icon: <DollarSign size={24} />, color: 'var(--success)' },
    { title: 'Admin Commission (20%)', value: `$${adminCom.toFixed(2)}`, icon: <DollarSign size={24} />, color: 'var(--primary-accent)' },
    { title: 'Driver Earnings (80%)', value: `$${driverEarn.toFixed(2)}`, icon: <DollarSign size={24} />, color: '#8b5cf6' },
    { title: 'Active Trips', value: stats?.active_trips || 0, icon: <Map size={24} />, color: 'var(--warning)' },
    { title: 'Total Users', value: stats?.total_users || 0, icon: <Users size={24} />, color: 'var(--primary-accent)' },
    { title: 'Total Drivers', value: stats?.total_drivers || 0, icon: <Car size={24} />, color: '#8b5cf6' },
  ];

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard Overview</h1>
        <p style={styles.subtitle}>Real-time metrics and analytics</p>
      </div>

      <div style={styles.grid}>
        {statCards.map((card, idx) => (
          <div key={idx} className="glass" style={styles.card}>
            <div style={styles.cardTop}>
              <h3 style={styles.cardTitle}>{card.title}</h3>
              <div style={{ ...styles.iconWrap, color: card.color, backgroundColor: `${card.color}15` }}>
                {card.icon}
              </div>
            </div>
            <p style={styles.cardValue}>{card.value}</p>
          </div>
        ))}
      </div>

      <div style={styles.chartsGrid}>
        <div className="glass" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Last 7 Days Revenue</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData.revenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary-accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                <Area type="monotone" dataKey="total" stroke="var(--primary-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Ride Activity (Last 7 Days)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData.activity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)' }} cursor={{fill: 'var(--bg-surface-hover)'}} />
                <Bar dataKey="completed" stackId="a" fill="var(--success)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="cancelled" stackId="a" fill="var(--danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: { marginBottom: '32px' },
  title: { fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: 'var(--text-secondary)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' },
  card: { padding: '24px', display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' },
  iconWrap: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardValue: { fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-1px' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' },
  chartCard: { padding: '24px' },
  chartTitle: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }
};
