import React from 'react';
import { Bell, Search } from 'lucide-react';

export default function Topbar() {
  return (
    <header style={styles.header}>
      <div style={styles.searchContainer}>
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
    padding: '0 32px',
    backgroundColor: 'var(--bg-surface)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 90,
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-base)',
    borderRadius: 'var(--radius-sm)',
    padding: '0 16px',
    width: '400px',
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
