import React from 'react';
import Sidebar from './Sidebar.tsx';
// Xóa: import Header from './Header.tsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        {/* === ĐÃ XÓA HEADER RA KHỎI ĐÂY === */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;