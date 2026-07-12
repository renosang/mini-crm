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
import BaoGia from './pages/BaoGia.tsx';
import HoaDon from './pages/HoaDon.tsx';
import ChiPhi from './pages/ChiPhi.tsx';
import BaoGiaXacNhan from './pages/BaoGiaXacNhan.tsx';
import BanQuyenCaNhan from './pages/BanQuyenCaNhan.tsx';
import KhoTaiNguyen from './pages/KhoTaiNguyen.tsx';
import CustomerDetail from './pages/CustomerDetail.tsx';
import QuanLyGiaHan from './pages/QuanLyGiaHan.tsx';
import CaiDat from './pages/CaiDat.tsx';
import NhaCungCap from './pages/NhaCungCap.tsx';
import OmnichannelInbox from './pages/OmnichannelInbox.tsx';
import SanPham from './pages/SanPham.tsx';


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
        <Route path="/ban-hang/bao-gia" element={<BaoGia />} />
        <Route path="/ban-hang/hoa-don" element={<HoaDon />} />
        <Route path="/ban-hang/chi-phi" element={<ChiPhi />} />
        <Route path="/kho-tai-nguyen" element={<KhoTaiNguyen />} />
        <Route path="/ban-quyen-ca-nhan" element={<BanQuyenCaNhan />} />
        <Route path="/omnichannel" element={<OmnichannelInbox />} />
        <Route path="/san-pham" element={<SanPham />} />

        {/* Các trang khác */}
        <Route path="/gia-han" element={<QuanLyGiaHan />} />
        <Route path="/nha-cung-cap" element={<NhaCungCap />} />
        <Route path="/cai-dat" element={<CaiDat />} />
      </Route>

      {/* Public route for quotation confirmation */}
      <Route path="/bao-gia/xac-nhan/:token" element={<BaoGiaXacNhan />} />

      {/* Route 404 */}
      <Route path="*" element={<div>404 Not Found</div>} />
    </Routes>
  );
}

export default App;