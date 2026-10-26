import React, { useEffect, useState } from 'react';
import { getRides } from '../api/client';
import { RefreshCw, AlertCircle, Search, CircleDot, MapPin, Clock, CreditCard } from 'lucide-react';

const STATUS: Record<string, [string, string]> = {
  completed: ['#059669', '#ecfdf5'], cancelled: ['#dc2626', '#fef2f2'], pending: ['#d97706', '#fffbeb'],
};
const money = (n: number) => `$${(n || 0).toFixed(2)}`;
const FILTERS = ['all', 'completed', 'pending', 'cancelled'];

export default function RidesList() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');

  const load = async () => {
    setLoading(true); setError('');
    try { const d = await getRides(); setRides(Array.isArray(d) ? d : []); }
    catch (err: any) { setError(err.response?.data?.detail || 'Failed to load rides.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const list = rides.filter(r => (f === 'all' || r.status === f) &&
    (!q || r.pickup?.toLowerCase().includes(q.toLowerCase()) || r.dropoff?.toLowerCase().includes(q.toLowerCase()) || String(r.id).includes(q)));
  const done = rides.filter(r => r.status === 'completed');
  const revenue = done.reduce((a, r) => a + (r.fare || 0), 0);
  const count = (k: string) => k === 'all' ? rides.length : rides.filter(r => r.status === k).length;

  return (
    <div>
      <div style={s.top}>
        <div>
          <h1 style={s.title}>Ride Feed</h1>
          <p style={s.sub}>Live log of every trip on the platform</p>
        </div>
        <div style={s.stats}>
          <div style={s.stat}><p style={s.sl}>Trips</p><p style={s.sv}>{rides.length}</p></div>
          <div style={s.stat}><p style={s.sl}>Revenue</p><p style={{ ...s.sv, color: '#059669' }}>{money(revenue)}</p></div>
          <div style={s.stat}><p style={s.sl}>Admin share</p><p style={{ ...s.sv, color: '#0284c7' }}>{money(revenue * 0.2)}</p></div>
        </div>
      </div>

      <div style={s.bar}>
        <div style={s.tabs}>
          {FILTERS.map(k => (
            <button key={k} id={`rides-${k}`} onClick={() => setF(k)} style={{ ...s.tab, ...(f === k ? s.tabOn : {}) }}>
              {k} <span style={s.tabCount}>{count(k)}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={s.search}><Search size={15} color="#94a3b8" /><input id="rides-search" placeholder="ID or location..." value={q} onChange={e => setQ(e.target.value)} style={s.input} /></div>
          <button style={s.icon} onClick={load}><RefreshCw size={16} /></button>
        </div>
      </div>

      {loading ? <Center><div style={s.spinner} /></Center> : error ? (
        <Center><AlertCircle size={34} color="var(--danger)" /><p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p></Center>
      ) : list.length === 0 ? <Center><p style={{ color: 'var(--text-muted)' }}>No rides found.</p></Center> : (
        <div style={s.feed}>
          {list.map(r => {
            const [c, bg] = STATUS[r.status] || ['#2563eb', '#eff6ff'];
            return (
              <div key={r.id} className="lift" style={{ ...s.item, borderLeftColor: c }}>
                <div style={s.route}>
                  <div style={s.rail}>
                    <CircleDot size={14} color="#0ea5e9" />
                    <span style={s.line} />
                    <MapPin size={14} color="#f43f5e" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={s.loc}>{r.pickup || '—'}</p>
                    <p style={{ ...s.loc, marginTop: 14 }}>{r.dropoff || '—'}</p>
                  </div>
                </div>
                <div style={s.meta}>
                  <span style={{ ...s.badge, color: c, background: bg }}>{r.status}</span>
                  <p style={s.small}>Ride #{r.id}</p>
                  <p style={s.small}><Clock size={11} /> {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</p>
                  <p style={s.small}><CreditCard size={11} /> {r.payment_method || '—'}</p>
                </div>
                <div style={s.money}>
                  <p style={s.fare}>{money(r.fare)}</p>
                  <p style={s.split}>Driver <b>{money(r.driver_cut)}</b></p>
                  <p style={s.split}>Admin <b style={{ color: '#0284c7' }}>{money(r.admin_cut)}</b></p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const Center = ({ children }: any) => <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 70 }}>{children}</div>;

const s: Record<string, React.CSSProperties> = {
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: 800, letterSpacing: -0.8 }, sub: { color: 'var(--text-muted)', fontSize: 14, marginTop: 4 },
  stats: { display: 'flex', background: '#0f172a', color: '#fff', borderRadius: 16, overflow: 'hidden' },
  stat: { padding: '12px 22px', borderRight: '1px solid rgba(255,255,255,.1)' },
  sl: { fontSize: 11, opacity: .6, textTransform: 'uppercase', letterSpacing: 1 }, sv: { fontSize: 20, fontWeight: 800 },
  bar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 },
  tabs: { display: 'flex', gap: 22, borderBottom: '2px solid var(--border-color)' },
  tab: { background: 'none', border: 'none', borderBottom: '3px solid transparent', marginBottom: -2, padding: '8px 2px', textTransform: 'capitalize', fontWeight: 700, fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' },
  tabOn: { color: 'var(--page-accent)', borderBottomColor: 'var(--page-accent)' },
  tabCount: { fontSize: 11, background: 'var(--bg-surface-hover)', padding: '1px 7px', borderRadius: 999, marginLeft: 4 },
  search: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 40, borderRadius: 10, border: '1px solid var(--border-color)', background: '#fff' },
  input: { border: 'none', outline: 'none', fontSize: 14, width: 170, background: 'transparent' },
  icon: { width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  feed: { display: 'flex', flexDirection: 'column', gap: 12 },
  item: { display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(150px,1fr) 130px', gap: 20, alignItems: 'center', background: '#fff', border: '1px solid var(--border-color)', borderLeft: '5px solid', borderRadius: 14, padding: '16px 20px' },
  route: { display: 'flex', gap: 12, minWidth: 0 },
  rail: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 },
  line: { flex: 1, width: 2, background: 'repeating-linear-gradient(#cbd5e1 0 4px, transparent 4px 8px)', margin: '3px 0' },
  loc: { fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { display: 'flex', flexDirection: 'column', gap: 4 },
  badge: { alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, letterSpacing: .5 },
  small: { fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 },
  money: { textAlign: 'right' },
  fare: { fontSize: 22, fontWeight: 800 }, split: { fontSize: 12, color: 'var(--text-muted)' },
  spinner: { width: 36, height: 36, border: '4px solid var(--border-color)', borderTopColor: 'var(--page-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
