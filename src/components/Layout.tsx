import React, { useState } from 'react';
import Sidebar from './Sidebar.tsx';
import { FiMenu, FiX } from 'react-icons/fi';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="layout">
      {/* Sidebar with mobile toggle state */}
      <div className={`sidebar-container ${sidebarOpen ? 'mobile-open' : ''}`}>
        <Sidebar />
      </div>

      {/* Backdrop overlay for mobile menu */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 999,
            backdropFilter: 'blur(3px)',
            transition: 'opacity 0.2s'
          }}
        />
      )}

      <div className="main-content">
        {/* Mobile Header Top-Bar */}
        <header 
          style={{
            height: '50px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--header-bg)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1rem',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
          className="mobile-only-header"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-color)',
              display: 'flex',
              alignItems: 'center',
              padding: '6px'
            }}
          >
            <FiMenu size={22} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-color)' }}>ALTCRM Mobile</span>
          <div style={{ width: '34px' }} /> {/* Spacer */}
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;