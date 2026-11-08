import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Banknote } from 'lucide-react';
import { getNotifications, readAllNotifications } from '../../api/client';

export default function Topbar() {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const seen = useRef<number>(0);

  const poll = async () => {
    try {
      const d = await getNotifications();
      setUnread(d.unread);
      setItems(d.notifications);
      // Tell the admin right away when a new request arrives
      const newest = d.notifications[0]?.id ?? 0;
      if (seen.current && newest > seen.current && d.unread > 0) {
        document.title = `(${d.unread}) Golden Ride Admin`;
      }
      seen.current = Math.max(seen.current, newest);
      if (d.unread === 0) document.title = 'Golden Ride Admin';
    } catch {
      /* not signed in yet or offline: try again next time */
    }
  };

  useEffect(() => {
    poll();
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
  }, []);

  const toggle = () => setOpen((o) => !o);
  const markRead = async () => { await readAllNotifications(); poll(); };
  const go = (n: any) => {
    setOpen(false);
    if (n.kind === 'withdrawal_request') navigate('/withdrawals');
  };

  return (
    <header style={styles.header}>
      <div className="admin-topbar-search" style={styles.searchContainer}>
        <Search size={18} color="var(--text-muted)" style={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Search users, drivers, rides..." 
          style={styles.searchInput} 
        />
      </div>

      <div style={styles.actions}>
        <div style={{ position: 'relative' }}>
          <button id="notif-bell" style={styles.iconBtn} onClick={toggle} aria-label="Notifications">
            <Bell size={20} color="var(--text-secondary)" />
            {unread > 0 && <span style={styles.count}>{unread > 9 ? '9+' : unread}</span>}
          </button>
          {open && (
            <div style={styles.panel}>
              <div style={styles.panelHead}>
                <strong>Notifications</strong>
                {unread > 0 && <button style={styles.link} onClick={markRead}>Mark all read</button>}
              </div>
              {items.length === 0 ? (
                <div style={styles.none}>Nothing new.</div>
              ) : items.slice(0, 8).map((n) => (
                <button key={n.id} style={{ ...styles.item, background: n.is_read ? 'transparent' : 'rgba(5,150,105,0.08)' }} onClick={() => go(n)}>
                  <Banknote size={16} color="#059669" />
                  <span style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>{n.title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>{n.body}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: '70px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 clamp(16px, 2.5vw, 40px)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 90,
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-base)',
    borderRadius: '12px',
    padding: '0 16px',
    width: 'min(400px, 100%)',
    height: '40px',
    border: '1px solid var(--border-color)',
    transition: 'var(--transition)',
  },
  searchIcon: {
    marginRight: '12px',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    position: 'absolute' as const,
    top: '2px',
    right: '2px',
    minWidth: '17px',
    height: '17px',
    padding: '0 4px',
    backgroundColor: 'var(--danger)',
    color: '#fff',
    borderRadius: '9px',
    fontSize: '10px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--bg-surface)',
    boxSizing: 'content-box' as const,
  },
  panel: {
    position: 'absolute' as const,
    top: '46px',
    right: 0,
    width: '320px',
    maxWidth: '90vw',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
    padding: '8px',
    zIndex: 200,
  },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px 10px', fontSize: '14px' },
  link: { background: 'none', border: 'none', color: 'var(--primary, #4f46e5)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 },
  none: { padding: '18px', textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: '13px' },
  item: { display: 'flex', gap: '10px', alignItems: 'flex-start', width: '100%', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '10px' },
};
