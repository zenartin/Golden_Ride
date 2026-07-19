import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Car, Map, Settings, FileText, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Sidebar() {
  const { role, name, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Users size={20} />, label: 'Users', path: '/users' },
    { icon: <Car size={20} />, label: 'Drivers', path: '/drivers' },
    { icon: <Map size={20} />, label: 'Rides', path: '/rides' },
    { icon: <FileText size={20} />, label: 'Reports', path: '/reports' },
    ...(role === 'super_admin' ? [{ icon: <Settings size={20} />, label: 'Settings', path: '/settings' }] : []),
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoContainer}>
        <div style={styles.logo}>GR</div>
        <span style={styles.brandName}>Golden Ride</span>
      </div>

      <nav style={styles.nav}>
        <div style={styles.navGroup}>
          <p style={styles.navTitle}>OVERVIEW</p>
          {menuItems.map((item, idx) => (
            <NavLink 
              key={idx} 
              to={item.path} 
              style={({ isActive }) => ({
                ...styles.navLink,
                backgroundColor: isActive ? 'var(--primary-glow)' : 'transparent',
                color: isActive ? 'var(--primary-accent)' : 'var(--text-secondary)',
                borderRight: isActive ? '3px solid var(--primary-accent)' : '3px solid transparent'
              })}
            >
              {item.icon}
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div style={styles.footer}>
        <div style={styles.adminProfile}>
          <div style={styles.avatar}>{name ? name.charAt(0).toUpperCase() : 'A'}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{name || 'Admin'}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
          <LogOut 
            size={18} 
            color="var(--text-muted)" 
            style={{ cursor: 'pointer' }} 
            onClick={handleLogout} 
          />
        </div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    height: '100vh',
    backgroundColor: 'var(--bg-surface)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'fixed' as const,
    left: 0,
    top: 0,
    zIndex: 100,
  },
  logoContainer: {
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: '12px',
    borderBottom: '1px solid var(--border-color)',
  },
  logo: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'var(--primary-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
    color: '#fff',
  },
  brandName: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  nav: {
    flex: 1,
    padding: '24px 0',
    overflowY: 'auto' as const,
  },
  navGroup: {
    marginBottom: '24px',
  },
  navTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '1px',
    padding: '0 24px',
    marginBottom: '12px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    gap: '14px',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'var(--transition)',
  },
  footer: {
    padding: '20px 24px',
    borderTop: '1px solid var(--border-color)',
  },
  adminProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-glow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    color: 'var(--primary-accent)',
  }
};
