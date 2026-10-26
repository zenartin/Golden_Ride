import React, { useEffect, useState } from 'react';
import { getDrivers, approveDriver, rejectDriver } from '../api/client';
import { Phone, Mail, Star, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, ChevronRight, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DriversList() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { const d = await getDrivers(); setDrivers(Array.isArray(d) ? d : []); }
    catch (err: any) { setError(err.response?.data?.detail || 'Failed to load drivers.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (e: React.MouseEvent, d: any, approve: boolean) => {
    e.stopPropagation();
    if (!approve && !window.confirm('Are you sure you want to reject this driver?')) return;
    setBusy(d.id);
    try {
      approve ? await approveDriver(d.id) : await rejectDriver(d.id);
      setDrivers(p => p.map(x => x.id === d.id ? { ...x, is_approved: approve } : x));
    } catch (err: any) { alert(err.response?.data?.detail || 'Action failed.'); }
    finally { setBusy(null); }
  };

  const match = (d: any) => !q || d.name?.toLowerCase().includes(q.toLowerCase()) || d.email?.toLowerCase().includes(q.toLowerCase()) || d.phone?.includes(q);
  const pending = drivers.filter(d => !d.is_approved && match(d));
  const approved = drivers.filter(d => d.is_approved && match(d));
  const online = drivers.filter(d => d.is_online).length;

  return (
    <div>
      <div style={s.top}>
        <div>
          <h1 style={s.title}>Driver Fleet</h1>
          <p style={s.sub}>{drivers.length} drivers · <span style={{ color: '#059669', fontWeight: 700 }}>{online} online now</span></p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={s.search}><Search size={15} color="#94a3b8" /><input id="drivers-search" placeholder="Search drivers..." value={q} onChange={e => setQ(e.target.value)} style={s.input} /></div>
          <button style={s.icon} onClick={load} title="Refresh"><RefreshCw size={16} /></button>
        </div>
      </div>

      {loading ? <Center><div style={s.spinner} /></Center> : error ? (
        <Center><AlertCircle size={34} color="var(--danger)" /><p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p></Center>
      ) : (
        <>
          {pending.length > 0 && (
            <section style={s.queue}>
              <div style={s.queueHead}><span style={s.queueDot} /> Awaiting approval <b style={s.count}>{pending.length}</b></div>
              <div style={s.queueList}>
                {pending.map(d => (
                  <div key={d.id} className="lift" style={s.pend} onClick={() => navigate(`/drivers/${d.id}`)}>
                    <div style={s.pAvatar}>{d.name?.charAt(0)?.toUpperCase() || '?'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700 }}>{d.name}</p>
                      <p style={s.small}>{d.phone || d.email || `Driver #${d.id}`}</p>
                    </div>
                    <button disabled={busy === d.id} style={s.ok} onClick={e => act(e, d, true)}><CheckCircle size={14} /> Approve</button>
                    <button disabled={busy === d.id} style={s.no} onClick={e => act(e, d, false)}><XCircle size={14} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <h3 style={s.section}>Active drivers</h3>
          {approved.length === 0 ? <Center><p style={{ color: 'var(--text-muted)' }}>No approved drivers yet.</p></Center> : (
            <div style={s.grid}>
              {approved.map(d => (
                <div key={d.id} className="lift" style={s.card} onClick={() => navigate(`/drivers/${d.id}`)}>
                  <div style={s.cardTop}>
                    <div style={s.avatarWrap}>
                      <div style={s.avatar}>{d.name?.charAt(0)?.toUpperCase() || '?'}</div>
                      <span style={{ ...s.dot, background: d.is_online ? '#22c55e' : '#94a3b8' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={s.name}>{d.name}</p>
                      <p style={s.small}>Driver #{d.id}</p>
                    </div>
                    <span style={{ ...s.live, ...(d.is_online ? s.liveOn : {}) }}><Radio size={11} /> {d.is_online ? 'Online' : 'Offline'}</span>
                  </div>
                  <div style={s.row}><Phone size={13} /> {d.phone || 'N/A'}</div>
                  <div style={s.row}><Mail size={13} /> <span style={s.ellip}>{d.email || 'N/A'}</span></div>
                  <div style={s.foot}>
                    <span style={s.rating}><Star size={14} fill="#f59e0b" color="#f59e0b" /> {(d.rating ?? 0).toFixed ? d.rating.toFixed(1) : d.rating}</span>
                    <span style={s.view}>Profile <ChevronRight size={14} /></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const Center = ({ children }: any) => <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 70 }}>{children}</div>;

const s: Record<string, React.CSSProperties> = {
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 22 },
  title: { fontSize: 30, fontWeight: 800, letterSpacing: -0.8 }, sub: { color: 'var(--text-muted)', fontSize: 14, marginTop: 4 },
  search: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 40, borderRadius: 12, border: '1px solid var(--border-color)', background: '#fff' },
  input: { border: 'none', outline: 'none', fontSize: 14, width: 180, background: 'transparent' },
  icon: { width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  queue: { background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1px solid #fde68a', borderRadius: 18, padding: 18, marginBottom: 26 },
  queueHead: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#92400e', marginBottom: 12 },
  queueDot: { width: 9, height: 9, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 0 4px rgba(245,158,11,.25)' },
  count: { background: '#f59e0b', color: '#fff', borderRadius: 999, padding: '1px 9px', fontSize: 12 },
  queueList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 },
  pend: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 14, padding: 12, cursor: 'pointer', border: '1px solid #fde68a' },
  pAvatar: { width: 38, height: 38, borderRadius: 12, background: '#fef3c7', color: '#b45309', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  small: { fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  ok: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  no: { display: 'flex', alignItems: 'center', padding: 8, borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' },
  section: { fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 },
  card: { background: '#fff', border: '1px solid var(--border-color)', borderLeft: '5px solid var(--page-accent)', borderRadius: 16, padding: 18, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#10b981,#0d9488)', color: '#fff', fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: -3, bottom: -3, width: 14, height: 14, borderRadius: '50%', border: '3px solid #fff' },
  name: { fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  live: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#f1f5f9', color: '#64748b' },
  liveOn: { background: '#dcfce7', color: '#15803d' },
  row: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, minWidth: 0 },
  ellip: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  foot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-light)' },
  rating: { display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800 },
  view: { display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, color: 'var(--page-accent)' },
  spinner: { width: 36, height: 36, border: '4px solid var(--border-color)', borderTopColor: 'var(--page-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
