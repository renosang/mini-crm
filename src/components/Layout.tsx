import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

// Định nghĩa kiểu cho props, 'children' là một React Node
interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;