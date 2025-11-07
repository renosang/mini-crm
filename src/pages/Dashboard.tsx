import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DashboardWidget from '../components/DashboardWidget';

// 1. Định nghĩa kiểu dữ liệu cho Stats
interface IDashboardStats {
  totalCustomers: number;
  availableAccounts: number;
  monthlyOrders: number;
  monthlyRevenue: number;
}

const Dashboard: React.FC = () => {
  // 2. Sử dụng kiểu dữ liệu cho useState
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // 3. API response sẽ được kiểm tra theo kiểu
        const { data } = await api.get<{ success: boolean; data: IDashboardStats }>('/dashboard/stats');
        
        if (data.success) {
          setStats(data.data);
        } else {
          setError('Không thể tải dữ liệu.');
        }
      } catch (err) {
        setError('Lỗi kết nối máy chủ.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (loading) return <div>Đang tải dữ liệu...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      <div className="widgets-container">
        {stats && ( // Kiểm tra stats không null
          <>
            <DashboardWidget 
              title="Tổng Khách Hàng" 
              value={stats.totalCustomers} 
            />
            <DashboardWidget 
              title="Tài Khoản Khả Dụng" 
              value={stats.availableAccounts}
            />
            <DashboardWidget 
              title="Đơn Hàng (Tháng)" 
              value={stats.monthlyOrders} 
            />
            <DashboardWidget 
              title="Doanh Thu (Tháng)" 
              value={`${stats.monthlyRevenue.toLocaleString('vi-VN')} đ`}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;