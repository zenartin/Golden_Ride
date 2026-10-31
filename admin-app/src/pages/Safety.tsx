import { useEffect, useState } from 'react';
import { getRecordings, getSafetyAlerts, resolveSafetyAlert } from '../api/client';

export default function SafetyPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setAlerts(await getSafetyAlerts());
      setRecordings(await getRecordings());
      setError('');
    } catch {
      setError('Could not load safety data.');
    }
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id: number) => {
    await resolveSafetyAlert(id);
    await load();
  };

  const cell = { padding: 10, borderBottom: '1px solid #e5e7eb', textAlign: 'left' as const };

  return (
    <div style={{ padding: 24 }}>
      <h1>Safety</h1>
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      <h2>Alerts and incident reports</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead><tr>{['When', 'Type', 'From', 'Ride', 'Location', 'Details', 'Status', ''].map(h => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>
          {alerts.map(a => (
            <tr key={a.id}>
              <td style={cell}>{new Date(a.created_at).toLocaleString()}</td>
              <td style={cell}>{a.kind}</td>
              <td style={cell}>{a.actor_role} #{a.actor_id}</td>
              <td style={cell}>{a.ride_id ?? '-'}</td>
              <td style={cell}>{a.latitude ? <a href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer">Map</a> : '-'}</td>
              <td style={cell}>{a.message ?? '-'}</td>
              <td style={cell}>{a.status}</td>
              <td style={cell}>{a.status === 'open' && <button onClick={() => resolve(a.id)}>Resolve</button>}</td>
            </tr>
          ))}
          {alerts.length === 0 && <tr><td style={cell} colSpan={8}>No alerts.</td></tr>}
        </tbody>
      </table>
      <h2 style={{ marginTop: 32 }}>Trip recordings</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead><tr>{['Recording', 'Ride', 'Uploaded by', 'Status', 'Expires'].map(h => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>
          {recordings.map(r => (
            <tr key={r.id}>
              <td style={cell}>#{r.id}</td>
              <td style={cell}>{r.ride_id}</td>
              <td style={cell}>{r.uploader_role}</td>
              <td style={cell}>{r.status}</td>
              <td style={cell}>{r.expires_at ? new Date(r.expires_at).toLocaleString() : '-'}</td>
            </tr>
          ))}
          {recordings.length === 0 && <tr><td style={cell} colSpan={5}>No recordings.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
