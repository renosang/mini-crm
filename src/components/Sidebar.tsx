import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  FiHome, FiUsers, FiShoppingCart, FiBox, FiKey,
  FiClock, FiBriefcase, FiSettings, FiLogOut
} from 'react-icons/fi';

import logo from '../assets/logo.png';

const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">

      {/* === PHẦN 1: LOGO (Luôn cố định) === */}
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem 1rem' }}>
        <Link to="/" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <img src={logo} alt="Logo" style={{ maxHeight: '65px', maxWidth: '85%', objectFit: 'contain' }} />
        </Link>
      </div>

      {/* === PHẦN 2: NAV (Sẽ tự cuộn) === */}
      <nav className="sidebar-nav">

        {/* --- NHÓM 1: HOẠT ĐỘNG CHÍNH --- */}
        <div className="sidebar-category-header">Hoạt Động Chính</div>
        <NavLink to="/" end className="nav-item">
          <FiHome /> Dashboard
        </NavLink>
        <NavLink to="/khach-hang" className="nav-item">
          <FiUsers /> Khách Hàng
        </NavLink>
        <NavLink to="/ban-hang" className="nav-item">
          <FiShoppingCart /> Bán Hàng & Hóa Đơn
        </NavLink>

        {/* --- NHÓM 2: QUẢN LÝ KHO & HẠN DÙNG --- */}
        <div className="sidebar-category-header">Quản Lý Kho & Bản Quyền</div>
        <NavLink to="/kho-tai-nguyen" className="nav-item">
          <FiBox /> Kho Tài Nguyên
        </NavLink>
        <NavLink to="/ban-quyen-ca-nhan" className="nav-item">
          <FiKey /> Bản Quyền Cá Nhân
        </NavLink>
        <NavLink to="/gia-han" className="nav-item">
          <FiClock /> Quản Lý Gia Hạn
        </NavLink>

        {/* --- NHÓM 3: ĐỐI TÁC & HỆ THỐNG --- */}
        <div className="sidebar-category-header">Đối Tác & Hệ Thống</div>
        <NavLink to="/nha-cung-cap" className="nav-item">
          <FiBriefcase /> Nhà Cung Cấp
        </NavLink>
        <NavLink to="/cai-dat" className="nav-item">
          <FiSettings /> Cài Đặt
        </NavLink>

      </nav>

      {/* === PHẦN 3: FOOTER (Luôn cố định) === */}
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button-sidebar">
          <FiLogOut />
          Đăng xuất (Admin)
        </button>
      </div>

    </aside>
  );
}

export default Sidebar;