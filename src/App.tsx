import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Accounts from './pages/Accounts';
import Customers from './pages/Customers';
import Orders from './pages/Orders';

// Component bảo vệ (Protected Route)
function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 'Layout' cần children, và 'Outlet' chính là children đó
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

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        {/* Các trang này bạn cần tự tạo file .tsx tương tự Dashboard */}
        {/* <Route path="/accounts" element={<Accounts />} /> */}
        {/* <Route path="/customers" element={<Customers />} /> */}
        {/* <Route path="/orders" element={<Orders />} /> */}
      </Route>

      <Route path="*" element={<div>404 Not Found</div>} />
    </Routes>
  );
}

export default App;