import React, { useEffect, useState } from 'react';
import { Banknote, Clock, CheckCircle2, XCircle, Copy, RefreshCw, AlertCircle, Landmark, Phone, Mail } from 'lucide-react';
import { getWithdrawals, approveWithdrawal, rejectWithdrawal } from '../api/client';

const money = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (iso: string) => new Date(iso.endsWith('Z') ? iso : iso + 'Z').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#b45309', bg: '#fef3c7' },
  completed: { label: 'Paid', color: '#047857', bg: '#d1fae5' },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fee2e2' },
  failed: { label: 'Failed', color: '#b91c1c', bg: '#fee2e2' },
};

export default function Withdrawals() {
  const [filter, setFilter] = useState<'pending' | 'completed' | 'rejected' | ''>('pending');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<any>(null);
  const [mode, setMode] = useState<'pay' | 'reject'>('pay');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const [toast, setToast] = useState('');

  const load = async () => {
    try {
      setError('');
      setData(await getWithdrawals(filter || undefined));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not load withdrawal requests.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { setLoading(true); load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [filter]);

  const copy = (text: string) => { navigator.clipboard?.writeText(text); setToast('Copied'); setTimeout(() => setToast(''), 1500); };

  const open = (w: any, m: 'pay' | 'reject') => { setTarget(w); setMode(m); setReference(''); setNote(''); setModalErr(''); };

  const submit = async () => {
    setSaving(true); setModalErr('');
    try {
      if (mode === 'pay') await approveWithdrawal(target.id, { reference: reference || undefined, note: note || undefined });
      else await rejectWithdrawal(target.id, { note });
      setToast(mode === 'pay' ? `Marked ${money(target.amount)} as paid to ${target.driver_name}` : 'Request rejected and the amount returned to the driver');
      setTarget(null);
      await load();
      setTimeout(() => setToast(''), 4000);
    } catch (err: any) {
      setModalErr(err.response?.data?.detail || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const rows: any[] = data?.withdrawals ?? [];

  return (
    <div>
      <div style={st.header}>
        <div>
          <h1 style={st.title}><Banknote size={24} /> Withdrawal requests</h1>
          <p style={st.sub}>Drivers ask to move their balance to a bank account. Send the transfer, then mark it paid.</p>
        </div>
        <div style={st.kpis}>
          <div style={st.kpi}><Clock size={16} color="#b45309" /><div><div style={st.kpiVal}>{data?.pending_count ?? 0}</div><div style={st.kpiLabel}>Pending</div></div></div>
          <div style={st.kpi}><Landmark size={16} color="#7c3aed" /><div><div style={st.kpiVal}>{money(data?.pending_total ?? 0)}</div><div style={st.kpiLabel}>To send</div></div></div>
        </div>
      </div>

      {toast && <div style={st.toast}>{toast}</div>}

      <div style={st.toolbar}>
        <div style={st.tabs}>
          {([['pending', 'Pending'], ['completed', 'Paid'], ['rejected', 'Rejected'], ['', 'All']] as const).map(([v, label]) => (
            <button key={label} id={`wd-tab-${label.toLowerCase()}`} style={{ ...st.tab, ...(filter === v ? st.tabOn : {}) }} onClick={() => setFilter(v as any)}>{label}</button>
          ))}
        </div>
        <button style={st.refresh} onClick={() => { setLoading(true); load(); }}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div style={st.error}><AlertCircle size={16} /> {error}</div>}
      {loading && !data ? <div style={st.empty}>Loading…</div> : rows.length === 0 ? (
        <div style={st.empty}>{filter === 'pending' ? 'No pending withdrawal requests.' : 'Nothing here yet.'}</div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {rows.map((w) => {
            const s = STATUS[w.status] ?? STATUS.pending;
            return (
              <div key={w.id} style={st.card}>
                <div style={st.cardTop}>
                  <div>
                    <div style={st.driver}>{w.driver_name} <span style={st.muted}>#{w.driver_id}</span></div>
                    <div style={st.contact}>
                      {w.driver_phone && <span><Phone size={12} /> {w.driver_phone}</span>}
                      {w.driver_email && <span><Mail size={12} /> {w.driver_email}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={st.amount}>{money(w.amount)}</div>
                    <span style={{ ...st.chip, color: s.color, background: s.bg }}>{s.label}</span>
                  </div>
                </div>

                <div style={st.bank}>
                  <div style={st.bankTitle}><Landmark size={14} /> Send to this account</div>
                  <div style={st.bankGrid}>
                    <Field label="Account holder" value={w.account_holder_name} onCopy={copy} />
                    <Field label="Bank" value={w.bank_name} onCopy={copy} />
                    <Field label="Routing number" value={w.routing_number} onCopy={copy} />
                    <Field label="Account number" value={w.account_number} onCopy={copy} />
                  </div>
                </div>

                <div style={st.footer}>
                  <span style={st.muted}>Requested {when(w.created_at)}{w.processed_at ? ` · decided ${when(w.processed_at)}` : ''}{w.reference ? ` · ref ${w.reference}` : ''}{w.admin_note ? ` · ${w.admin_note}` : ''}</span>
                  {w.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button id={`wd-reject-${w.id}`} style={st.rejectBtn} onClick={() => open(w, 'reject')}><XCircle size={15} /> Reject</button>
                      <button id={`wd-pay-${w.id}`} style={st.payBtn} onClick={() => open(w, 'pay')}><CheckCircle2 size={15} /> Mark as paid</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {target && (
        <div style={st.overlay} onClick={() => !saving && setTarget(null)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>{mode === 'pay' ? `Mark ${money(target.amount)} as paid` : 'Reject request'}</h3>
            <p style={st.sub}>{target.driver_name}{mode === 'pay' ? ` · ${target.bank_name} ${'•'.repeat(4)}${String(target.account_number || '').slice(-4)}` : ''}</p>
            {mode === 'pay' ? (
              <>
                <label style={st.label}>Transfer reference (optional)</label>
                <input id="wd-reference" style={st.input} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. ACH confirmation number" />
                <label style={st.label}>Note to keep (optional)</label>
                <input style={st.input} value={note} onChange={(e) => setNote(e.target.value)} />
                <p style={st.hint}>Confirm only after you have sent the money. The driver sees it as Paid.</p>
              </>
            ) : (
              <>
                <label style={st.label}>Reason (the driver will see this)</label>
                <input id="wd-reason" style={st.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank details do not match" />
                <p style={st.hint}>The amount goes back to the driver's available balance.</p>
              </>
            )}
            {modalErr && <div style={st.error}><AlertCircle size={15} /> {modalErr}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={st.cancel} disabled={saving} onClick={() => setTarget(null)}>Cancel</button>
              <button id="wd-confirm" style={mode === 'pay' ? st.payBtn : st.rejectSolid} disabled={saving} onClick={submit}>{saving ? 'Saving…' : mode === 'pay' ? 'Confirm paid' : 'Reject request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onCopy }: { label: string; value?: string; onCopy: (t: string) => void }) {
  return (
    <div>
      <div style={st.fieldLabel}>{label}</div>
      <div style={st.fieldVal}>
        <span>{value || '—'}</span>
        {value ? <button style={st.copy} title="Copy" onClick={() => onCopy(value)}><Copy size={13} /></button> : null}
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: 18 },
  title: { margin: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 10 },
  sub: { margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 },
  kpis: { display: 'flex', gap: 12 },
  kpi: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '10px 16px' },
  kpiVal: { fontWeight: 800, fontSize: 18 },
  kpiLabel: { fontSize: 12, color: 'var(--text-muted)' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 },
  tabs: { display: 'flex', gap: 6, background: 'var(--bg-base)', padding: 4, borderRadius: 12, border: '1px solid var(--border-color)' },
  tab: { border: 'none', background: 'transparent', padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' },
  tabOn: { background: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  refresh: { display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 13 },
  card: { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 18 },
  cardTop: { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  driver: { fontWeight: 800, fontSize: 17 },
  muted: { color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 },
  contact: { display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4, color: 'var(--text-secondary)', fontSize: 13 },
  amount: { fontSize: 26, fontWeight: 800 },
  chip: { display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginTop: 4 },
  bank: { marginTop: 14, background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 14 },
  bankTitle: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  bankGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  fieldLabel: { fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 },
  fieldVal: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  copy: { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' },
  payBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  rejectBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  rejectSolid: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  cancel: { background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 },
  empty: { textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', background: 'var(--bg-surface)', border: '1px dashed var(--border-color)', borderRadius: 16 },
  error: { display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px', fontSize: 13, margin: '10px 0' },
  toast: { position: 'fixed', top: 84, right: 24, background: '#065f46', color: '#fff', padding: '10px 16px', borderRadius: 12, fontWeight: 600, fontSize: 13, zIndex: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 },
  modal: { background: 'var(--bg-surface)', borderRadius: 18, padding: 24, width: 'min(440px, 100%)' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', margin: '14px 0 6px' },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--bg-base)', color: 'var(--text-primary)' },
  hint: { fontSize: 12, color: 'var(--text-muted)', margin: '10px 0 0' },
};
