import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-search">
        {/* Bạn có thể thêm ô tìm kiếm ở đây */}
      </div>
      <div className="header-user">
        <span>Chào, {user?.username}</span>
        <button onClick={handleLogout} className="logout-button">
          Đăng xuất
        </button>
      </div>
    </header>
  );
}

export default Header;