import React, { useEffect, useState } from 'react';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../api/client';
import { Tag, Plus, Edit2, Trash2, CheckCircle, Ban, AlertCircle, RefreshCw } from 'lucide-react';

const PALETTE = ['#0ea5e9', '#14b8a6', '#f43f5e', '#8b5cf6', '#f59e0b', '#22c55e'];

export default function CouponsList() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    code: '', title: '', description: '', type: 'percentage',
    value: 0, max_discount_usd: 0, min_fare_usd: 0, rides_required: 0,
    one_time: false, is_active: true
  });

  const load = async () => {
    setLoading(true); setError('');
    try { 
      const d = await getCoupons(); 
      setCoupons(Array.isArray(d) ? d : []); 
    }
    catch (err: any) { setError(err.response?.data?.detail || 'Failed to load coupons.'); }
    finally { setLoading(false); }
  };
  
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditItem(null);
    setFormData({
      code: '', title: '', description: '', type: 'percentage',
      value: 0, max_discount_usd: 0, min_fare_usd: 0, rides_required: 0,
      one_time: false, is_active: true
    });
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditItem(c);
    setFormData({
      code: c.code, title: c.title, description: c.description || '', type: c.type,
      value: c.value, max_discount_usd: c.max_discount_usd || 0, min_fare_usd: c.min_fare_usd || 0,
      rides_required: c.rides_required || 0, one_time: c.one_time || false, is_active: c.is_active !== false
    });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editItem) {
        await updateCoupon(editItem.id, formData);
      } else {
        await createCoupon(formData);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save coupon');
    }
  };

  const remove = async (c: any) => {
    if (!window.confirm(`Are you sure you want to delete coupon ${c.code}?`)) return;
    try {
      await deleteCoupon(c.id);
      load();
    } catch (err: any) {
      alert('Failed to delete coupon');
    }
  };

  const activeCount = coupons.filter(c => c.is_active).length;

  return (
    <div>
      <div style={s.top}>
        <div>
          <h1 style={s.title}>Coupons</h1>
          <p style={s.sub}>Manage promotional and loyalty coupons</p>
        </div>
        <div style={s.chips}>
          <div style={s.chip}>
            <span style={s.chipIcon}><Tag size={15} /></span>
            <div><p style={s.cl}>Total</p><p style={s.cv}>{coupons.length}</p></div>
          </div>
          <div style={s.chip}>
            <span style={s.chipIcon}><CheckCircle size={15} /></span>
            <div><p style={s.cl}>Active</p><p style={s.cv}>{activeCount}</p></div>
          </div>
        </div>
      </div>

      <div style={s.bar}>
        <button onClick={openNew} style={{...s.btn, background: 'var(--page-accent)', color: '#fff', border: 'none'}}>
          <Plus size={16} /> New Coupon
        </button>
        <button style={s.icon} onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>

      {loading ? <Center><div style={s.spinner} /></Center> : error ? (
        <Center><AlertCircle size={34} color="var(--danger)" /><p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p></Center>
      ) : coupons.length === 0 ? <Center><p style={{ color: 'var(--text-muted)' }}>No coupons found.</p></Center> : (
        <div style={s.grid}>
          {coupons.map((c, i) => {
            const color = PALETTE[i % PALETTE.length];
            return (
              <div key={c.id} className="lift" style={{ ...s.card, opacity: c.is_active ? 1 : 0.6 }}>
                <div style={{ ...s.cover, background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                  <span style={{ ...s.status, background: c.is_active ? '#ecfdf5' : '#fef2f2', color: c.is_active ? '#047857' : '#b91c1c' }}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: color }}>{c.code}</h3>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{c.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 15, minHeight: 40 }}>{c.description}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12, marginBottom: 15 }}>
                    <div><span style={{color: '#94a3b8'}}>Type:</span> <b>{c.type}</b></div>
                    <div><span style={{color: '#94a3b8'}}>Discount:</span> <b>{c.type === 'percentage' ? c.value + '%' : '$' + c.value}</b></div>
                    <div><span style={{color: '#94a3b8'}}>Max Disc:</span> <b>{c.max_discount_usd ? '$'+c.max_discount_usd : 'Unlimited'}</b></div>
                    <div><span style={{color: '#94a3b8'}}>Min Fare:</span> <b>${c.min_fare_usd}</b></div>
                    <div><span style={{color: '#94a3b8'}}>Rides Req:</span> <b>{c.rides_required}</b></div>
                    <div><span style={{color: '#94a3b8'}}>Usage:</span> <b>{c.one_time ? 'One Time' : 'Multi'}</b></div>
                  </div>

                  <div style={s.foot}>
                    <button onClick={() => openEdit(c)} style={s.iconBtn}><Edit2 size={15} /> Edit</button>
                    <button onClick={() => remove(c)} style={{...s.iconBtn, color: '#b91c1c', borderColor: '#fecaca', background: '#fef2f2'}}><Trash2 size={15} /> Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <h2 style={{fontSize: 20, fontWeight: 700, marginBottom: 20}}>{editItem ? 'Edit Coupon' : 'New Coupon'}</h2>
            
            <div style={s.field}><label>Code</label><input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="e.g. WELCOME10" style={s.inputBox} /></div>
            <div style={s.field}><label>Title</label><input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. 10% off" style={s.inputBox} /></div>
            <div style={s.field}><label>Description</label><input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={s.inputBox} /></div>
            
            <div style={{display: 'flex', gap: 10}}>
              <div style={s.field}><label>Type</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={s.inputBox}><option value="percentage">Percentage</option><option value="flat">Flat Amount</option></select></div>
              <div style={s.field}><label>Value ({formData.type === 'percentage' ? '%' : '$'})</label><input type="number" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} style={s.inputBox} /></div>
            </div>

            <div style={{display: 'flex', gap: 10}}>
              <div style={s.field}><label>Max Discount ($)</label><input type="number" value={formData.max_discount_usd} onChange={e => setFormData({...formData, max_discount_usd: parseFloat(e.target.value)})} style={s.inputBox} /></div>
              <div style={s.field}><label>Min Fare ($)</label><input type="number" value={formData.min_fare_usd} onChange={e => setFormData({...formData, min_fare_usd: parseFloat(e.target.value)})} style={s.inputBox} /></div>
            </div>

            <div style={{display: 'flex', gap: 10}}>
              <div style={s.field}><label>Rides Required</label><input type="number" value={formData.rides_required} onChange={e => setFormData({...formData, rides_required: parseInt(e.target.value, 10)})} style={s.inputBox} /></div>
              <div style={s.field}>
                <label>Settings</label>
                <div style={{display: 'flex', gap: 15, marginTop: 10}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: 5}}><input type="checkbox" checked={formData.one_time} onChange={e => setFormData({...formData, one_time: e.target.checked})} /> One Time</label>
                  <label style={{display: 'flex', alignItems: 'center', gap: 5}}><input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} /> Active</label>
                </div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20}}>
              <button onClick={() => setShowModal(false)} style={s.btnOutline}>Cancel</button>
              <button onClick={save} style={{...s.btn, background: 'var(--page-accent)', color: '#fff', border: 'none'}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  icon: { width: 40, height: 40, borderRadius: 999, border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnOutline: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: '#fff', border: '1px solid var(--border-color)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 },
  card: { background: '#fff', border: '1px solid var(--border-color)', borderRadius: 20, overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' },
  cover: { height: 80, position: 'relative' },
  status: { position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 },
  foot: { display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 15, paddingTop: 15, borderTop: '1px dashed var(--border-color)' },
  iconBtn: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '8px', borderRadius: 10, background: '#f8fafc', border: '1px solid var(--border-color)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' },
  spinner: { width: 36, height: 36, border: '4px solid var(--border-color)', borderTopColor: 'var(--page-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', padding: 24, borderRadius: 16, width: 450, maxWidth: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  field: { marginBottom: 15, flex: 1 },
  inputBox: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 14, outline: 'none' }
};
