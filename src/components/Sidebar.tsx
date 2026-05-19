import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  FiHome, FiUsers, FiShoppingCart, FiBox, FiKey,
  FiClock, FiBriefcase, FiSettings, FiLogOut, FiChevronRight
} from 'react-icons/fi';

import logo from '../assets/logo.png';

const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isCaiDatPage = location.pathname === '/cai-dat';
  const [settingsOpen, setSettingsOpen] = useState<boolean>(isCaiDatPage);

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
        <div 
          className={`nav-item nav-group-toggle ${isCaiDatPage ? 'active' : ''} ${settingsOpen ? 'open' : ''}`}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FiSettings />
            <span>Cài Đặt</span>
          </div>
          <FiChevronRight className="chevron" />
        </div>
        <div className={`sidebar-submenu ${settingsOpen ? 'open' : ''}`}>
          <Link 
            to="/cai-dat?tab=smtp"
            style={{ 
              color: (isCaiDatPage && (location.search.includes('tab=smtp') || !location.search.includes('tab='))) ? 'var(--primary-color)' : 'var(--text-light)',
              fontWeight: (isCaiDatPage && (location.search.includes('tab=smtp') || !location.search.includes('tab='))) ? '600' : '500'
            }}
          >
            Cấu hình SMTP
          </Link>
          <Link 
            to="/cai-dat?tab=bank"
            style={{ 
              color: (isCaiDatPage && location.search.includes('tab=bank')) ? 'var(--primary-color)' : 'var(--text-light)',
              fontWeight: (isCaiDatPage && location.search.includes('tab=bank')) ? '600' : '500'
            }}
          >
            Thông tin chuyển khoản
          </Link>
        </div>

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