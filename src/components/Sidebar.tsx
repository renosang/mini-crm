import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  FiHome, FiUsers, FiShoppingCart, FiBox, FiKey,
  FiClock, FiBriefcase, FiSettings, FiLogOut, FiChevronRight,
  FiDollarSign, FiTrendingUp, FiDownload, FiGrid, FiMessageCircle,
  FiLayers, FiFileText, FiCreditCard, FiMail
} from 'react-icons/fi';

import logo from '../assets/logo.png';

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen] = useState(false);
  const [supplierOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem 1rem' }}>
        <Link to="/" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }} onClick={handleNavClick}>
          <img src={logo} alt="Logo" style={{ maxHeight: '65px', maxWidth: '85%', objectFit: 'contain' }} />
        </Link>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-category-header">Hoạt Động Chính</div>
        <NavLink to="/" end className="nav-item" onClick={handleNavClick}>
          <FiHome /> Dashboard
        </NavLink>
        <NavLink to="/khach-hang" className="nav-item" onClick={handleNavClick}>
          <FiUsers /> Khách Hàng
        </NavLink>
        <div style={{ marginBottom: '2px' }}>
          <NavLink to="/ban-hang" className="nav-item" onClick={handleNavClick} style={{ marginBottom: 0 }}>
            <FiShoppingCart /> Bán Hàng
          </NavLink>
          <NavLink to="/ban-hang/bao-gia" className="nav-item" onClick={handleNavClick} style={{ marginBottom: 0, paddingLeft: '2.8rem', fontSize: '0.88rem' }}>
            <FiFileText /> Báo Giá
          </NavLink>
          <NavLink to="/ban-hang/hoa-don" className="nav-item" onClick={handleNavClick} style={{ marginBottom: 0, paddingLeft: '2.8rem', fontSize: '0.88rem' }}>
            <FiCreditCard /> Hóa Đơn
          </NavLink>
          <NavLink to="/ban-hang/chi-phi" className="nav-item" onClick={handleNavClick} style={{ marginBottom: 0, paddingLeft: '2.8rem', fontSize: '0.88rem' }}>
            <FiDollarSign /> Chi Phí
          </NavLink>
        </div>
        <NavLink to="/mailbox" className="nav-item" onClick={handleNavClick}>
          <FiMail /> Mail Box
        </NavLink>

        <div className="sidebar-category-header">Quản Lý Kho & Bản Quyền</div>
        <NavLink to="/san-pham" className="nav-item" onClick={handleNavClick}>
          <FiLayers /> Sản Phẩm / Dịch Vụ
        </NavLink>
        <NavLink to="/ban-quyen-ca-nhan" className="nav-item" onClick={handleNavClick}>
          <FiKey /> Bản Quyền Cá Nhân
        </NavLink>
        <NavLink to="/gia-han" className="nav-item" onClick={handleNavClick}>
          <FiClock /> Quản Lý Gia Hạn
        </NavLink>

        <div className="sidebar-category-header">Hệ Thống</div>
        <NavLink to="/cai-dat" className="nav-item" onClick={handleNavClick}>
          <FiSettings /> Cài Đặt
        </NavLink>
      </nav>

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