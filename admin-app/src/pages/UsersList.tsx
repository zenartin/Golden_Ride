import React, { useEffect, useState } from 'react';
import { getUsers, banUser, unbanUser } from '../api/client';
import { Phone, Mail, Ban, CheckCircle, Search, RefreshCw, AlertCircle, Wallet, CalendarDays, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PALETTE = ['#0ea5e9', '#14b8a6', '#f43f5e', '#8b5cf6', '#f59e0b', '#22c55e'];

export default function UsersList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'all' | 'active' | 'banned'>('all');

  const load = async () => {
    setLoading(true); setError('');
    try { const d = await getUsers(); setUsers(Array.isArray(d) ? d : []); }
    catch (err: any) { setError(err.response?.data?.detail || 'Failed to load users.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleBan = async (e: React.MouseEvent, u: any) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to ${u.is_banned ? 'unban' : 'ban'} this user?`)) return;
    setBusy(u.id);
    try {
      u.is_banned ? await unbanUser(u.id) : await banUser(u.id);
      setUsers(p => p.map(x => x.id === u.id ? { ...x, is_banned: !u.is_banned } : x));
    } catch (err: any) { alert(err.response?.data?.detail || 'Action failed.'); }
    finally { setBusy(null); }
  };

  const list = users.filter(u =>
    (view === 'all' || (view === 'banned' ? u.is_banned : !u.is_banned)) &&
    (!q || u.name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase()) || u.phone?.includes(q)));
  const banned = users.filter(u => u.is_banned).length;
  const wallet = users.reduce((s, u) => s + (u.wallet_balance || 0), 0);

  return (
    <div>
      <div style={s.top}>
        <div>
          <h1 style={s.title}>Riders</h1>
          <p style={s.sub}>Everyone who books rides on Golden Ride</p>
        </div>
        <div style={s.chips}>
          <Chip icon={<UserRound size={15} />} label="Riders" value={users.length} />
          <Chip icon={<Ban size={15} />} label="Banned" value={banned} />
          <Chip icon={<Wallet size={15} />} label="Wallets" value={`$${wallet.toFixed(2)}`} />
        </div>
      </div>

      <div style={s.bar}>
        <div style={s.pills}>
          {(['all', 'active', 'banned'] as const).map(v => (
            <button key={v} id={`users-${v}`} onClick={() => setView(v)} style={{ ...s.pill, ...(view === v ? s.pillOn : {}) }}>{v}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={s.search}><Search size={15} color="#94a3b8" /><input id="users-search" placeholder="Search riders..." value={q} onChange={e => setQ(e.target.value)} style={s.input} /></div>
          <button style={s.icon} onClick={load} title="Refresh"><RefreshCw size={16} /></button>
        </div>
      </div>

      {loading ? <Center><div style={s.spinner} /></Center> : error ? (
        <Center><AlertCircle size={34} color="var(--danger)" /><p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p></Center>
      ) : list.length === 0 ? <Center><p style={{ color: 'var(--text-muted)' }}>{q ? `No riders matching "${q}"` : 'No riders found.'}</p></Center> : (
        <div style={s.grid}>
          {list.map(u => {
            const c = PALETTE[u.id % PALETTE.length];
            return (
              <div key={u.id} className="lift" style={{ ...s.card, opacity: u.is_banned ? 0.75 : 1 }} onClick={() => navigate(`/users/${u.id}`)}>
                <div style={{ ...s.cover, background: `linear-gradient(135deg, ${c}, ${c}99)` }}>
                  <span style={{ ...s.status, background: u.is_banned ? '#fee2e2' : 'rgba(255,255,255,0.9)', color: u.is_banned ? '#b91c1c' : '#047857' }}>{u.is_banned ? 'Banned' : 'Active'}</span>
                </div>
                <div style={{ ...s.avatar, color: c }}>{u.name?.charAt(0)?.toUpperCase() || '?'}</div>
                <div style={{ padding: '0 18px 18px', textAlign: 'center' }}>
                  <p style={s.name}>{u.name}</p>
                  <p style={s.id}>Rider #{u.id}</p>
                  <div style={s.info}><Phone size={13} /> <span style={s.ellip}>{u.phone || 'N/A'}</span></div>
                  <div style={s.info}><Mail size={13} /> <span style={s.ellip}>{u.email || 'N/A'}</span></div>
                  <div style={s.info}><CalendarDays size={13} /> Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</div>
                  <div style={s.foot}>
                    <div><p style={s.fl}>Wallet</p><p style={s.fv}>${(u.wallet_balance ?? 0).toFixed(2)}</p></div>
                    <button disabled={busy === u.id} onClick={e => toggleBan(e, u)} style={u.is_banned ? s.unban : s.ban}>
                      {u.is_banned ? <><CheckCircle size={14} /> Unban</> : <><Ban size={14} /> Ban</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const Chip = ({ icon, label, value }: any) => (
  <div style={s.chip}><span style={s.chipIcon}>{icon}</span><div><p style={s.cl}>{label}</p><p style={s.cv}>{value}</p></div></div>
);
const Center = ({ children }: any) => <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 70 }}>{children}</div>;

const s: Record<string, React.CSSProperties> = {
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 22 },
  title: { fontSize: 30, fontWeight: 800, letterSpacing: -0.8 },
  sub: { color: 'var(--text-muted)', fontSize: 14, marginTop: 4 },
  chips: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  chip: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 14, background: '#fff', border: '1px solid var(--border-color)' },
  chipIcon: { width: 32, height: 32, borderRadius: 10, background: 'var(--page-soft)', color: 'var(--page-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cl: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }, cv: { fontSize: 16, fontWeight: 800 },
  bar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 },
  pills: { display: 'flex', gap: 6 },
  pill: { padding: '8px 18px', borderRadius: 999, border: '1px solid var(--border-color)', background: '#fff', textTransform: 'capitalize', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' },
  pillOn: { background: 'var(--page-accent)', color: '#fff', borderColor: 'var(--page-accent)' },
  search: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 40, borderRadius: 999, border: '1px solid var(--border-color)', background: '#fff' },
  input: { border: 'none', outline: 'none', fontSize: 14, width: 180, background: 'transparent' },
  icon: { width: 40, height: 40, borderRadius: 999, border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 },
  card: { background: '#fff', border: '1px solid var(--border-color)', borderRadius: 20, overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' },
  cover: { height: 78, position: 'relative' },
  status: { position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 },
  avatar: { width: 66, height: 66, borderRadius: 20, background: '#fff', border: '4px solid #fff', boxShadow: '0 8px 18px -8px rgba(0,0,0,.3)', margin: '-34px auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800 },
  name: { fontWeight: 800, fontSize: 17 }, id: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 },
  info: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', marginTop: 5, minWidth: 0 },
  ellip: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 },
  foot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--border-color)', textAlign: 'left' },
  fl: { fontSize: 11, color: 'var(--text-muted)' }, fv: { fontSize: 18, fontWeight: 800, color: 'var(--success)' },
  ban: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  unban: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  spinner: { width: 36, height: 36, border: '4px solid var(--border-color)', borderTopColor: 'var(--page-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
