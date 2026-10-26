import React, { useEffect, useState } from 'react';
import { Save, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { getSettings, updateSettings } from '../api/client';

type S = {
  commission_percent: number;
  base_fare: number;
  per_mile_economy: number;
  per_mile_comfort: number;
  per_mile_premium: number;
  ride_request_timeout_seconds: number;
  support_phone: string;
  support_email: string;
  maintenance_mode: boolean;
};

export default function SettingsPage() {
  const [form, setForm] = useState<S | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSettings();
        setForm(res.settings);
        setCanEdit(res.can_edit);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k: keyof S, v: any) => { setSaved(false); setForm(f => f ? { ...f, [k]: v } : f); };
  const num = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value === '' ? 0 : Number(e.target.value));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError('');
    try {
      const res = await updateSettings(form);
      setForm(res.settings);
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.center}><div style={styles.spinner} /></div>;
  if (!form) return <div style={styles.center}><AlertCircle size={36} color="var(--danger)" /><p style={{ color: 'var(--danger)', marginTop: 10 }}>{error}</p></div>;

  const field = (label: string, key: keyof S, hint?: string, prefix?: string, step = '0.01') => (
    <div style={styles.field}>
      <label style={styles.label} htmlFor={`set-${key}`}>{label}</label>
      <div style={styles.inputWrap}>
        {prefix && <span style={styles.prefix}>{prefix}</span>}
        <input id={`set-${key}`} type="number" step={step} min="0" disabled={!canEdit} style={styles.input}
          value={form[key] as number} onChange={num(key)} />
      </div>
      {hint && <p style={styles.hint}>{hint}</p>}
    </div>
  );

  const commission = form.commission_percent;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>Platform configuration</p>
        </div>
        {canEdit && (
          <button id="settings-save" style={styles.saveBtn} onClick={save} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {!canEdit && (
        <div style={styles.notice}><Lock size={15} /> Read-only: only a Super Admin can change settings.</div>
      )}
      {saved && <div style={{ ...styles.notice, color: 'var(--success)', background: 'rgba(5,150,105,0.1)' }}><CheckCircle size={15} /> Settings saved.</div>}
      {error && <div style={{ ...styles.notice, color: 'var(--danger)', background: 'rgba(220,38,38,0.1)' }}><AlertCircle size={15} /> {error}</div>}

      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>Commission</h3>
        <div style={styles.grid}>
          {field('Admin commission', 'commission_percent', `Drivers keep ${(100 - commission).toFixed(1)}% of each fare.`, '%', '0.1')}
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>Fare Rates (USD)</h3>
        <div style={styles.grid}>
          {field('Base fare', 'base_fare', undefined, '$')}
          {field('Golden Ride Economy / mile', 'per_mile_economy', undefined, '$')}
          {field('Golden Ride Comfort / mile', 'per_mile_comfort', undefined, '$')}
          {field('Golden Ride Premium / mile', 'per_mile_premium', undefined, '$')}
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>Dispatch</h3>
        <div style={styles.grid}>
          {field('Ride request timeout (seconds)', 'ride_request_timeout_seconds', 'How long a driver has to accept a request.', undefined, '1')}
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>Support</h3>
        <div style={styles.grid}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="set-support_phone">Support phone</label>
            <div style={styles.inputWrap}>
              <input id="set-support_phone" disabled={!canEdit} style={styles.input} value={form.support_phone} onChange={e => set('support_phone', e.target.value)} />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="set-support_email">Support email</label>
            <div style={styles.inputWrap}>
              <input id="set-support_email" disabled={!canEdit} style={styles.input} value={form.support_email} onChange={e => set('support_email', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>System</h3>
        <label style={styles.toggleRow}>
          <input id="set-maintenance_mode" type="checkbox" disabled={!canEdit} checked={form.maintenance_mode} onChange={e => set('maintenance_mode', e.target.checked)} />
          <span>
            <strong>Maintenance mode</strong>
            <span style={styles.hint}> — flag for apps to show a maintenance notice.</span>
          </span>
        </label>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { color: 'var(--text-muted)', fontSize: 14, marginTop: 4 },
  saveBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--primary-accent)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  notice: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 },
  panel: { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)', marginBottom: 20 },
  panelTitle: { fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' },
  inputWrap: { display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-surface)', overflow: 'hidden' },
  prefix: { padding: '0 10px', color: 'var(--text-muted)', background: 'var(--bg-surface-hover)', alignSelf: 'stretch', display: 'flex', alignItems: 'center', fontSize: 14 },
  input: { flex: 1, border: 'none', outline: 'none', padding: '10px 12px', fontSize: 14, background: 'transparent', color: 'var(--text-primary)' },
  hint: { fontSize: 12, color: 'var(--text-muted)' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, cursor: 'pointer' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 },
  spinner: { width: 36, height: 36, border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
