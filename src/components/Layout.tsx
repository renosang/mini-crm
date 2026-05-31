import React, { useState } from 'react';
import Sidebar from './Sidebar.tsx';
import { FiMenu } from 'react-icons/fi';
import logo from '../assets/logo.png';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="layout">
      {/* Sidebar with mobile toggle state */}
      <div className={`sidebar-container ${sidebarOpen ? 'mobile-open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
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
            height: '55px',
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
          {/* Logo bên trái */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={logo} alt="Logo" style={{ maxHeight: '35px', maxWidth: '120px', objectFit: 'contain' }} />
          </div>

          {/* Nút menu bên phải */}
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
            <FiMenu size={24} />
          </button>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;