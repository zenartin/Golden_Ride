import React from 'react';
import { Bell, Search } from 'lucide-react';

export default function Topbar() {
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
        <button style={styles.iconBtn}>
          <Bell size={20} color="var(--text-secondary)" />
          <span style={styles.badge}></span>
        </button>
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
  badge: {
    position: 'absolute' as const,
    top: '6px',
    right: '8px',
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--danger)',
    borderRadius: '50%',
    border: '2px solid var(--bg-surface)',
  }
};
