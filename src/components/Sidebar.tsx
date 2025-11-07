import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <a href="/">MMO CRM</a>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/accounts">Tài Khoản</NavLink>
        <NavLink to="/customers">Khách Hàng</NavLink>
        <NavLink to="/orders">Đơn Hàng</NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;