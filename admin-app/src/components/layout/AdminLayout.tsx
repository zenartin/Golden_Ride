import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AdminLayout() {
  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainWrapper}>
        <Topbar />
        <main style={styles.mainContent}>
          <div style={styles.contentInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-base)',
  },
  mainWrapper: {
    flex: 1,
    marginLeft: '260px', /* Width of sidebar */
    display: 'flex',
    flexDirection: 'column' as const,
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '32px',
  },
  contentInner: {
    maxWidth: '1200px',
    margin: '0 auto',
  }
};
