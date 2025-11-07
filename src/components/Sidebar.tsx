import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  FiHome, FiUsers, FiShoppingCart, FiFileText, FiBox, 
  FiDatabase, FiClock, FiBriefcase, 
  FiBarChart2, FiUser, FiSettings, FiChevronRight,
  FiLogOut
} from 'react-icons/fi';

const Sidebar: React.FC = () => {
  const [isSubmenuOpen, setSubmenuOpen] = useState(false);
  
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSubmenu = () => {
    setSubmenuOpen(!isSubmenuOpen);
  };

  return (
    // Thẻ <aside> là container flex chính
    <aside className="sidebar"> 
      
      {/* === PHẦN 1: LOGO (Luôn cố định) === */}
      <div className="sidebar-logo">
        <Link to="/">MINI CRM</Link>
      </div>

      {/* === PHẦN 2: NAV (Sẽ tự cuộn) === */}
      <nav className="sidebar-nav">
        <NavLink to="/" end className="nav-item">
          <FiHome /> Dashboard
        </NavLink>
        <NavLink to="/khach-hang" className="nav-item">
          <FiUsers /> Khách Hàng
        </NavLink>
        <NavLink to="/ban-hang" className="nav-item">
          <FiShoppingCart /> Bán Hàng
        </NavLink>
        <NavLink to="/hop-dong" className="nav-item">
          <FiFileText /> Hợp Đồng
        </NavLink>

        {/* --- Nhóm Menu Con --- */}
        <div className="nav-group">
          <div className={`nav-item nav-group-toggle ${isSubmenuOpen ? 'open' : ''}`} onClick={toggleSubmenu}>
            <FiBox /> 
            <span className="nav-group-toggle">
              Tài Khoản Khách Hàng
              <FiChevronRight className="chevron" />
            </span>
          </div>
          <div className={`sidebar-submenu ${isSubmenuOpen ? 'open' : ''}`}>
            <NavLink to="/tai-khoan/loai-moi">Loại Tài Khoản Mới</NavLink>
            <NavLink to="/tai-khoan/nhap-don">Nhập Tài Khoản Đơn</NavLink>
            {/* Bạn có thể thêm nhiều link hơn để test cuộn */}
            {/* <NavLink to="/tai-khoan/test1">Menu Test 1</NavLink> */}
            {/* <NavLink to="/tai-khoan/test2">Menu Test 2</NavLink> */}
            {/* <NavLink to="/tai-khoan/test3">Menu Test 3</NavLink> */}
            {/* <NavLink to="/tai-khoan/test4">Menu Test 4</NavLink> */}
          </div>
        </div>
        {/* --- Hết Nhóm Menu Con --- */}

        <NavLink to="/giao-dich" className="nav-item">
          <FiDatabase /> Giao Dịch/Hóa đơn
        </NavLink>
        <NavLink to="/gia-han" className="nav-item">
          <FiClock /> Gia Hạn
        </NavLink>
        <NavLink to="/nha-cung-cap" className="nav-item">
          <FiBriefcase /> Nhà Cung Cấp
        </NavLink>
        <NavLink to="/bao-cao" className="nav-item">
          <FiBarChart2 /> Báo Cáo
        </NavLink>
        <NavLink to="/ho-so" className="nav-item">
          <FiUser /> Hồ Sơ
        </NavLink>
        <NavLink to="/cai-dat" className="nav-item">
          <FiSettings /> Cài Đặt
        </NavLink>
        {/* Thêm nhiều mục menu ở đây để kiểm tra thanh cuộn */}
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