import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { FiUsers, FiShoppingCart, FiCreditCard } from 'react-icons/fi';

// === ĐỊNH NGHĨA KIỂU DỮ LIỆU ===
// (Đây là các kiểu dữ liệu từ các trang khác, bạn có thể
//  tạo file riêng ví dụ 'src/types.ts' để import cho gọn)
interface IOrder {
  _id: string;
  total_amount: number;
  status: string;
  createdAt: string;
}
interface IAccount {
  _id: string;
  product_type: string;
  account_details: {
    username?: string;
    license_key?: string;
  };
  valid_until?: string;
}
interface ICustomer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
}
interface ICustomerDetailData {
  customer: ICustomer;
  orders: IOrder[];
  accounts: IAccount[];
  stats: {
    totalSpent: number;
    totalOrders: number;
    activeAccounts: number;
  };
}

// === COMPONENT TRANG CHI TIẾT ===
const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Lấy ID từ URL
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ICustomerDetailData | null>(null);
  
  // State cho Tab
  const [activeTab, setActiveTab] = useState<'history' | 'accounts' | 'notes' | 'reports'>('history');

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<{ success: boolean, data: ICustomerDetailData }>(`/customers/${id}`);
        if (data.success) {
          setData(data.data);
        } else {
          setError('Không tìm thấy dữ liệu.');
        }
      } catch (err) {
        setError('Lỗi tải dữ liệu chi tiết.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  if (loading) return <div>Đang tải chi tiết khách hàng...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!data) return <div>Không tìm thấy khách hàng.</div>;

  const { customer, orders, accounts, stats } = data;

  return (
    <div>
      <div className="customer-detail-header">
        <h1 className="gradient-title">Chi tiết Khách hàng</h1>
        <p>Hồ sơ đầy đủ của <strong>{customer.name}</strong></p>
      </div>

      <div className="customer-detail-grid">
        {/* --- KHU VỰC 1A: THẺ THÔNG TIN --- */}
        <div className="customer-info-card">
          <h2>{customer.name}</h2>
          <div className="info-item">
            <label>Email</label>
            <p>{customer.email || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Số Điện Thoại</label>
            <p>{customer.phone || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Nguồn</label>
            <p>{customer.source || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Ghi Chú</label>
            <p>{customer.notes || 'Không có ghi chú'}</p>
          </div>
          {/* Nút quay lại */}
          <Link to="/khach-hang" style={{marginTop: '1rem', display: 'inline-block'}}>
            &larr; Quay lại danh sách
          </Link>
        </div>

        {/* --- KHU VỰC 1B & 2: THỐNG KÊ & TABS --- */}
        <div>
          {/* Thẻ Thống kê nhanh */}
          <div className="stats-grid-3 customer-stats-grid">
            <div className="stat-card widget">
              <div className="stat-card-icon icon-total"><FiCreditCard /></div>
              <div className="stat-card-info">
                <h3>Tổng Chi Tiêu</h3>
                <p>{stats.totalSpent.toLocaleString('vi-VN')} đ</p>
              </div>
            </div>
            <div className="stat-card widget">
              <div className="stat-card-icon icon-new"><FiShoppingCart /></div>
              <div className="stat-card-info">
                <h3>Tổng Đơn Hàng</h3>
                <p>{stats.totalOrders}</p>
              </div>
            </div>
            <div className="stat-card widget">
              <div className="stat-card-icon icon-source"><FiUsers /></div>
              <div className="stat-card-info">
                <h3>Tài Khoản Active</h3>
                <p>{stats.activeAccounts}</p>
              </div>
            </div>
          </div>

          {/* Hệ thống Tab */}
          <div className="tabs-container">
            <nav className="tab-nav">
              <button 
                className={activeTab === 'history' ? 'active' : ''}
                onClick={() => setActiveTab('history')}
              >
                Lịch sử Mua Hàng ({orders.length})
              </button>
              <button 
                className={activeTab === 'accounts' ? 'active' : ''}
                onClick={() => setActiveTab('accounts')}
              >
                Tài Khoản Sở Hữu ({accounts.length})
              </button>
              <button 
                className={activeTab === 'notes' ? 'active' : ''}
                onClick={() => setActiveTab('notes')}
              >
                Ghi Chú
              </button>
              <button 
                className={activeTab === 'reports' ? 'active' : ''}
                onClick={() => setActiveTab('reports')}
              >
                Báo Cáo
              </button>
            </nav>
            <div className="tab-content">
              {/* Tab 1: Lịch sử Mua Hàng */}
              <div className={`tab-pane ${activeTab === 'history' ? 'active' : ''}`}>
                <div className="table-container">
                  <table className="styled-table">
                    <thead>
                      <tr><th>Ngày Mua</th><th>Tổng Tiền</th><th>Trạng Thái</th></tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order._id}>
                          <td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                          <td>{order.total_amount.toLocaleString('vi-VN')} đ</td>
                          <td><span className={`badge badge-${order.status === 'paid' ? 'success' : 'pending'}`}>{order.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Tab 2: Tài Khoản/Dịch Vụ */}
              <div className={`tab-pane ${activeTab === 'accounts' ? 'active' : ''}`}>
                <div className="table-container">
                  <table className="styled-table">
                    <thead>
                      <tr><th>Dịch Vụ</th><th>Thông Tin</th><th>Ngày Hết Hạn</th></tr>
                    </thead>
                    <tbody>
                      {accounts.map(acc => (
                        <tr key={acc._id}>
                          <td>{acc.product_type || 'N/A'}</td>
                          <td>{acc.account_details?.username || acc.account_details?.license_key || '...'}</td>
                          <td>{acc.valid_until ? new Date(acc.valid_until).toLocaleDateString('vi-VN') : 'Không thời hạn'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tab 3: Ghi Chú */}
              <div className={`tab-pane ${activeTab === 'notes' ? 'active' : ''}`}>
                <p>Khu vực này sẽ có một trình soạn thảo văn bản để thêm ghi chú về khách hàng (sẽ xây dựng sau).</p>
              </div>

              {/* Tab 4: Báo Cáo */}
              <div className={`tab-pane ${activeTab === 'reports' ? 'active' : ''}`}>
                <button className="login-button" onClick={() => window.print()}>
                  In Báo Cáo (Print)
                </button>
                <p style={{marginTop: '1rem'}}>Chức năng xuất PDF/CSV sẽ được xây dựng sau.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetail;