import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.tsx';
import Layout from './components/Layout.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Login from './pages/Login.tsx';

// === TẠO CÁC FILE PLACEHOLDER NÀY ===
// Ví dụ: src/pages/KhachHang.tsx
// const KhachHang = () => <h1>Quản lý Khách Hàng</h1>;
// export default KhachHang;
// ====================================
import KhachHang from './pages/KhachHang.tsx';
import BanHang from './pages/BanHang.tsx';
import HopDong from './pages/HopDong.tsx';
import CustomerDetail from './pages/CustomerDetail.tsx';
// (Bạn sẽ cần tạo các file này)


// Component bảo vệ (Protected Route)
function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />

      {/* Đây là các trang được bảo vệ */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        
        {/* === CÁC ROUTE MỚI === */}
        <Route path="/khach-hang" element={<KhachHang />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/ban-hang" element={<BanHang />} />
        <Route path="/hop-dong" element={<HopDong />} />
        
        {/* Các trang menu con */}
        <Route path="/tai-khoan/loai-moi" element={<div>Trang Loại Tài Khoản Mới</div>} />
        <Route path="/tai-khoan/nhap-don" element={<div>Trang Nhập Tài Khoản Đơn</div>} />

        {/* Các trang khác */}
        <Route path="/giao-dich" element={<div>Trang Giao Dịch</div>} />
        <Route path="/gia-han" element={<div>Trang Gia Hạn</div>} />
        <Route path="/nha-cung-cap" element={<div>Trang Nhà Cung Cấp</div>} />
        <Route path="/bao-cao" element={<div>Trang Báo Cáo</div>} />
        <Route path="/ho-so" element={<div>Trang Hồ Sơ</div>} />
        <Route path="/cai-dat" element={<div>Trang Cài Đặt</div>} />
        
      </Route>

      {/* Route 404 */}
      <Route path="*" element={<div>404 Not Found</div>} />
    </Routes>
  );
}

export default App;