import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, Landmark, Percent, CheckCircle2, Clock, Users, Search, X, BadgeCheck, History, AlertCircle, RefreshCw, Phone, Car } from 'lucide-react';
import { getPayouts, getPayoutHistory, payoutDriver } from '../api/client';

const money = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'cash_app', label: 'Cash App' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
];

export default function Payouts() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'due' | 'history'>('due');
  const [filter, setFilter] = useState<'all' | 'due' | 'settled'>('due');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [d, h] = await Promise.all([getPayouts(), getPayoutHistory()]);
      setData(d);
      setHistory(h);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payouts.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.drivers.filter((d: any) => {
      const f = filter === 'all' || (filter === 'due' ? d.due > 0.009 : d.due <= 0.009);
      const s = !q || d.name?.toLowerCase().includes(q.toLowerCase()) || d.phone?.includes(q) || String(d.driver_id).includes(q);
      return f && s;
    });
  }, [data, filter, q]);

  const openPay = (d: any) => {
    setTarget(d);
    setAmount(d.due.toFixed(2));
    setMethod('bank_transfer');
    setReference('');
    setNote('');
    setModalErr('');
  };

  const confirmPay = async () => {
    setSaving(true);
    setModalErr('');
    try {
      await payoutDriver(target.driver_id, { amount: Number(amount), method, reference: reference || undefined, note: note || undefined });
      setToast(`Marked ${money(Number(amount))} as paid to ${target.name}`);
      setTarget(null);
      await load();
      setTimeout(() => setToast(''), 4000);
    } catch (err: any) {
      setModalErr(err.response?.data?.detail || 'Payment could not be recorded.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <div style={st.center}><div style={st.spinner} /></div>;
  if (error && !data) return (
    <div style={st.center}>
      <AlertCircle size={36} color="var(--danger)" />
      <p style={{ color: 'var(--danger)', marginTop: 10, fontWeight: 600 }}>{error}</p>
      <button style={st.btn} onClick={load}><RefreshCw size={14} /> Retry</button>
    </div>
  );

  const s = data.summary;
  const pct = data.commission_percent;
  const paidPct = s.driver_share > 0 ? Math.min(100, (s.total_paid / s.driver_share) * 100) : 0;

  return (
    <div>
      <div style={st.hero}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <p style={st.heroKicker}>DRIVER PAYOUTS</p>
          <h1 className="keep-color" style={st.heroTitle}>{money(s.total_due)}</h1>
          <p style={st.heroSub}>
            to pay across <strong>{s.drivers_to_pay}</strong> driver{s.drivers_to_pay === 1 ? '' : 's'} · you keep {pct}% commission, drivers get {(100 - pct).toFixed(0)}%
          </p>
          <div style={st.progressTrack}><div style={{ ...st.progressBar, width: `${paidPct}%` }} /></div>
          <p style={st.progressLabel}>{money(s.total_paid)} of {money(s.driver_share)} driver share already paid ({paidPct.toFixed(0)}%)</p>
        </div>
        <div style={st.heroStats}>
          <HeroStat icon={<Wallet size={18} />} label="Collected by admin" value={money(s.total_collected)} />
          <HeroStat icon={<Percent size={18} />} label="Admin commission" value={money(s.admin_commission)} />
          <HeroStat icon={<Landmark size={18} />} label="Driver share" value={money(s.driver_share)} />
        </div>
      </div>

      {toast && <div style={st.toast}><BadgeCheck size={16} /> {toast}</div>}

      <div style={st.toolbar}>
        <div style={st.tabs}>
          <button id="tab-due" style={{ ...st.tab, ...(tab === 'due' ? st.tabActive : {}) }} onClick={() => setTab('due')}><Users size={14} /> Drivers</button>
          <button id="tab-history" style={{ ...st.tab, ...(tab === 'history' ? st.tabActive : {}) }} onClick={() => setTab('history')}><History size={14} /> Payment history</button>
        </div>
        {tab === 'due' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={st.search}>
              <Search size={15} color="var(--text-muted)" />
              <input id="payout-search" placeholder="Search driver..." value={q} onChange={e => setQ(e.target.value)} style={st.searchInput} />
            </div>
            <select id="payout-filter" value={filter} onChange={e => setFilter(e.target.value as any)} style={st.select}>
              <option value="due">Needs payment</option>
              <option value="settled">Settled</option>
              <option value="all">All drivers</option>
            </select>
            <button style={st.btn} onClick={load}><RefreshCw size={14} /></button>
          </div>
        )}
      </div>

      {tab === 'due' ? (
        <div style={st.tableCard}>
          <div style={{ overflowX: 'auto' }}>
            <table style={st.table}>
              <thead>
                <tr>
                  {['Driver', 'Rides', 'Collected', `Commission (${pct}%)`, 'Driver earned', 'Paid', 'Amount due', ''].map(h => <th key={h} style={st.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8} style={{ ...st.td, textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    {filter === 'due' ? 'All caught up — no driver is waiting for payment.' : 'No drivers found.'}
                  </td></tr>
                )}
                {rows.map((d: any) => (
                  <tr key={d.driver_id} style={st.tr}>
                    <td style={st.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={st.avatar}>{(d.name || 'D').charAt(0).toUpperCase()}</div>
                        <div>
                          <p style={{ fontWeight: 700 }}>{d.name}</p>
                          <p style={st.meta}><Phone size={11} /> {d.phone || '—'}{d.vehicle ? <> · <Car size={11} /> {d.vehicle}</> : null}</p>
                          {d.requested > 0 && <span style={st.reqTag}><Clock size={11} /> Requested {money(d.requested)}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={st.td}>{d.rides}</td>
                    <td style={st.td}>{money(d.gross)}</td>
                    <td style={{ ...st.td, color: '#2563eb' }}>{money(d.commission)}</td>
                    <td style={{ ...st.td, fontWeight: 600 }}>{money(d.earned)}</td>
                    <td style={{ ...st.td, color: 'var(--success)' }}>{money(d.paid)}</td>
                    <td style={st.td}>
                      <span style={d.due > 0.009 ? st.dueBadge : st.paidBadge}>
                        {d.due > 0.009 ? money(d.due) : <><CheckCircle2 size={13} /> Settled</>}
                      </span>
                    </td>
                    <td style={{ ...st.td, textAlign: 'right' }}>
                      <button id={`pay-${d.driver_id}`} disabled={d.due <= 0.009} style={{ ...st.payBtn, ...(d.due <= 0.009 ? st.payBtnOff : {}) }} onClick={() => openPay(d)}>
                        Mark as paid
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={st.tableCard}>
          <div style={{ overflowX: 'auto' }}>
            <table style={st.table}>
              <thead><tr>{['Date', 'Driver', 'Amount', 'Method', 'Reference', 'Note', 'Paid by'].map(h => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
              <tbody>
                {history.length === 0 && <tr><td colSpan={7} style={{ ...st.td, textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No payments recorded yet.</td></tr>}
                {history.map(h => (
                  <tr key={h.id} style={st.tr}>
                    <td style={st.td}>{h.created_at ? new Date(h.created_at + 'Z').toLocaleString() : '—'}</td>
                    <td style={{ ...st.td, fontWeight: 600 }}>{h.driver_name}</td>
                    <td style={{ ...st.td, color: 'var(--success)', fontWeight: 700 }}>{money(h.amount)}</td>
                    <td style={st.td}>{METHODS.find(m => m.value === h.method)?.label || h.method}</td>
                    <td style={st.td}>{h.reference || '—'}</td>
                    <td style={st.td}>{h.note || '—'}</td>
                    <td style={st.td}>{h.paid_by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {target && (
        <div style={st.overlay} onClick={() => !saving && setTarget(null)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={st.modalHead}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Pay {target.name}</h3>
                <p style={st.meta}>Record a payment you have made to this driver</p>
              </div>
              <button style={st.close} onClick={() => setTarget(null)}><X size={18} /></button>
            </div>

            <div style={st.breakdown}>
              <Row label={`Collected from riders (${target.rides} rides)`} value={money(target.gross)} />
              <Row label={`Admin commission (${pct}%)`} value={`− ${money(target.commission)}`} />
              <Row label="Driver earned" value={money(target.earned)} bold />
              <Row label="Already paid" value={`− ${money(target.paid)}`} />
              <div style={st.divider} />
              <Row label="Amount due now" value={money(target.due)} bold accent />
            </div>

            <label style={st.label}>Amount to pay (USD)</label>
            <input id="pay-amount" type="number" step="0.01" min="0" max={target.due} value={amount} onChange={e => setAmount(e.target.value)} style={st.input} />

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={st.label}>Method</label>
                <select id="pay-method" value={method} onChange={e => setMethod(e.target.value)} style={{ ...st.input, width: '100%' }}>
                  {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={st.label}>Reference / Txn ID</label>
                <input id="pay-reference" value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional" style={{ ...st.input, width: '100%' }} />
              </div>
            </div>

            <label style={st.label}>Note</label>
            <input id="pay-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" style={st.input} />

            {modalErr && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{modalErr}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button style={{ ...st.btn, flex: 1, justifyContent: 'center', marginTop: 0 }} onClick={() => setTarget(null)} disabled={saving}>Cancel</button>
              <button id="pay-confirm" style={{ ...st.payBtn, flex: 2, padding: '12px 16px' }} onClick={confirmPay} disabled={saving || !(Number(amount) > 0)}>
                {saving ? 'Saving...' : `Confirm payment of ${money(Number(amount) || 0)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={st.heroStat}>
      <div style={st.heroIcon}>{icon}</div>
      <div>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{label}</p>
        <p style={{ fontSize: 18, fontWeight: 800 }}>{value}</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14, fontWeight: bold ? 700 : 500, color: accent ? '#b45309' : 'var(--text-primary)' }}>
      <span style={{ color: bold ? undefined : 'var(--text-secondary)' }}>{label}</span><span>{value}</span>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  hero: { display: 'flex', gap: 28, flexWrap: 'wrap', padding: 28, borderRadius: 20, color: '#fff', marginBottom: 22, background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #7c3aed 120%)', boxShadow: '0 20px 40px -20px rgba(30,58,138,0.6)' },
  heroKicker: { fontSize: 12, letterSpacing: 2, opacity: 0.7, fontWeight: 700 },
  heroTitle: { fontSize: 46, fontWeight: 800, letterSpacing: -1, margin: '6px 0' },
  heroSub: { fontSize: 14, opacity: 0.85 },
  progressTrack: { height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.18)', marginTop: 18, overflow: 'hidden', maxWidth: 460 },
  progressBar: { height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#34d399,#a7f3d0)', transition: 'width .6s ease' },
  progressLabel: { fontSize: 12, opacity: 0.75, marginTop: 8 },
  heroStats: { display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', minWidth: 240 },
  heroStat: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)' },
  heroIcon: { width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  toast: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, background: 'rgba(5,150,105,0.12)', color: '#047857', fontWeight: 600, fontSize: 14, marginBottom: 16 },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  tabs: { display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--bg-surface-hover)' },
  tab: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  tabActive: { background: 'var(--bg-surface)', color: 'var(--primary-accent)', boxShadow: 'var(--shadow-sm)' },
  search: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 40, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-surface)' },
  searchInput: { border: 'none', outline: 'none', fontSize: 14, background: 'transparent', width: 170 },
  select: { height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: 14 },
  btn: { display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  tableCard: { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 16px', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-muted)', background: '#f8fafc', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' },
  tr: { transition: 'background .15s' },
  td: { padding: '14px 16px', fontSize: 14, borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)', verticalAlign: 'middle' },
  avatar: { width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  meta: { fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 },
  reqTag: { display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 11, fontWeight: 700, color: '#b45309', background: 'rgba(217,119,6,0.12)', padding: '2px 8px', borderRadius: 999 },
  dueBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 999, background: 'rgba(217,119,6,0.12)', color: '#b45309', fontWeight: 800 },
  paidBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 999, background: 'rgba(5,150,105,0.1)', color: '#047857', fontWeight: 700, fontSize: 13 },
  payBtn: { padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 6px 14px -6px rgba(37,99,235,0.7)' },
  payBtnOff: { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none', cursor: 'not-allowed' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, padding: 26, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.4)', maxHeight: '92vh', overflowY: 'auto' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  close: { border: 'none', background: 'var(--bg-surface-hover)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  breakdown: { background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 14, padding: '10px 16px', marginBottom: 16 },
  divider: { height: 1, background: 'var(--border-color)', margin: '6px 0' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', margin: '14px 0 6px' },
  input: { width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 14, outline: 'none', background: '#fff' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 },
  spinner: { width: 36, height: 36, border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
