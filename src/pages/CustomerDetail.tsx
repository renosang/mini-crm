import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { FiUsers, FiShoppingCart, FiCreditCard, FiFacebook, FiSend, FiMessageCircle, FiLock, FiSave, FiInfo } from 'react-icons/fi';

// === Component hiển thị Tag Trạng thái MMO ===
const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const currentStatus = status || 'Bình thường';
  let className = "status-badge ";
  switch (currentStatus.toLowerCase()) {
    case "vip": className += "status-vip"; break;
    case "tiềm năng": className += "status-tiem-nang"; break;
    case "cảnh báo": className += "status-canh-bao"; break;
    default: className += "status-binh-thuong";
  }
  return <span className={className}>{currentStatus}</span>;
};

// === ĐỊNH NGHĨA KIỂU DỮ LIỆU ===
interface IAccount {
  _id: string;
  product_type: string;
  account_details: {
    username?: string;
    password_acc?: string;
    license_key?: string;
  };
  valid_until?: string;
}
interface IOrder {
  _id: string;
  total_amount: number;
  status: string;
  createdAt: string;
  accounts?: IAccount[];
}
interface ICustomer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  facebook?: string;
  telegram?: string;
  zalo?: string;
  status?: string;
  notes?: string;
  privateNotes?: string;
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
  
  // States cho ghi chú bảo mật cá nhân
  const [privateNotes, setPrivateNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

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
          setPrivateNotes(data.data.customer.privateNotes || '');
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

  const handleSaveNotes = async () => {
    if (!id || !data) return;
    try {
      setIsSavingNotes(true);
      setSaveMessage('');
      const updatedCustomer = { ...data.customer, privateNotes };
      const response = await api.put(`/customers/${id}`, updatedCustomer);
      if (response.data.success) {
        setData({
          ...data,
          customer: response.data.data
        });
        setSaveMessage('Đã lưu ghi chú bảo mật thành công!');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (err) {
      console.error("Lỗi lưu ghi chú:", err);
      alert('Không thể lưu ghi chú.');
    } finally {
      setIsSavingNotes(false);
    }
  };

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
        <div className="customer-info-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0' }}>
            <span>{customer.name}</span>
            <StatusBadge status={customer.status} />
          </h2>
          
          <div className="info-item">
            <label>Email</label>
            <p style={{ fontWeight: 500 }}>{customer.email || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Số Điện Thoại</label>
            <p style={{ fontWeight: 500 }}>{customer.phone || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Nguồn khách hàng</label>
            <p><span className="source-badge source-khac" style={{ minWidth: 'auto', padding: '0.2rem 0.6rem' }}>{customer.source || 'N/A'}</span></p>
          </div>
          <div className="info-item">
            <label>Ghi Chú Công Việc</label>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-color)', lineHeight: '1.5' }}>{customer.notes || 'Không có ghi chú'}</p>
          </div>

          {/* MMO Social Chat Buttons */}
          <div className="info-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <label style={{ marginBottom: '0.5rem' }}>Kênh liên lạc MMO</label>
            <div className="mmo-social-links">
              {customer.facebook ? (
                <a href={customer.facebook.startsWith('http') ? customer.facebook : `https://facebook.com/${customer.facebook}`} target="_blank" rel="noopener noreferrer" className="mmo-icon-btn mmo-facebook" title="Facebook Messenger">
                  <FiFacebook />
                </a>
              ) : (
                <span className="mmo-icon-btn mmo-empty" title="Không có Facebook"><FiFacebook /></span>
              )}
              {customer.telegram ? (
                <a href={customer.telegram.startsWith('http') ? customer.telegram : `https://t.me/${customer.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="mmo-icon-btn mmo-telegram" title="Chat Telegram">
                  <FiSend />
                </a>
              ) : (
                <span className="mmo-icon-btn mmo-empty" title="Không có Telegram"><FiSend /></span>
              )}
              {customer.zalo ? (
                <a href={customer.zalo.startsWith('http') ? customer.zalo : `https://zalo.me/${customer.zalo}`} target="_blank" rel="noopener noreferrer" className="mmo-icon-btn mmo-zalo" title="Chat Zalo">
                  <FiMessageCircle />
                </a>
              ) : (
                <span className="mmo-icon-btn mmo-empty" title="Không có Zalo"><FiMessageCircle /></span>
              )}
            </div>
          </div>

          {/* Ghi chú bảo mật nhanh */}
          {customer.privateNotes && (
            <div className="secure-note-box">
              <div className="secure-note-header">
                <FiLock /> Thông tin bảo mật / Cá nhân
              </div>
              <div className="secure-note-content" style={{ fontSize: '0.85rem' }}>
                {customer.privateNotes}
              </div>
            </div>
          )}

          {/* Nút quay lại */}
          <Link to="/khach-hang" className="customer-link" style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
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
                Ghi Chú Bảo Mật
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
                      <tr>
                        <th>Mã Đơn</th>
                        <th>Ngày Mua</th>
                        <th>Chi Tiết Bàn Giao Tài Nguyên</th>
                        <th>Tổng Tiền</th>
                        <th>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order._id}>
                          <td>
                            <Link 
                              to={`/ban-hang?viewOrder=${order._id}`}
                              style={{ 
                                fontFamily: 'monospace', 
                                color: '#0071E3', 
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textDecoration: 'underline'
                              }}
                              title="Click để xem chi tiết hóa đơn & phân tích lợi nhuận"
                            >
                              #{order._id.substring(order._id.length - 6).toUpperCase()}
                            </Link>
                          </td>
                          <td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                          <td>
                            {order.accounts && order.accounts.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {order.accounts.map((acc, index) => {
                                  const details = acc.account_details || {};
                                  const isClientUpgrade = !details.password_acc || details.password_acc === '';
                                  
                                  return (
                                    <div key={acc._id || index} style={{ fontSize: '0.85rem', padding: '6px 10px', backgroundColor: '#F5F5F7', borderRadius: '8px', border: '1px solid #E5E5EA' }}>
                                      <div style={{ fontWeight: 600, color: '#0071E3' }}>{acc.product_type}</div>
                                      <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginTop: '2px', wordBreak: 'break-all' }}>
                                        {details.username && (
                                          <div>Tài khoản: <strong>{details.username}</strong></div>
                                        )}
                                        {details.license_key && (
                                          <div style={{ marginTop: '2px' }}>Key: <code style={{ backgroundColor: '#FFFFFF', padding: '1px 3px', borderRadius: '3px', border: '1px solid #D2D2D7' }}>{details.license_key}</code></div>
                                        )}
                                        {isClientUpgrade && (
                                          <span style={{ display: 'inline-block', color: '#D84315', fontWeight: 600, fontSize: '0.75rem', marginTop: '2px' }}>
                                            ⚡ Nâng cấp trực tiếp trên TK khách
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Không có chi tiết</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 700 }}>{order.total_amount.toLocaleString('vi-VN')} đ</td>
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

              {/* Tab 3: Ghi Chú Bảo Mật */}
              <div className={`tab-pane ${activeTab === 'notes' ? 'active' : ''}`}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#B27B00', fontSize: '1.1rem' }}>
                  <FiLock /> Thông tin bảo mật & Cá nhân (MMO Only)
                </h3>
                <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Lưu trữ thông tin nhạy cảm của khách hàng (Proxy, Accounts giao nhận, Ví Crypto...). Chỉ Admin mới có quyền xem và sửa.
                </p>
                <textarea
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  rows={8}
                  placeholder="Nhập proxy, tài khoản bàn giao, thông tin cá nhân bảo mật tại đây..."
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '1px solid rgba(243, 164, 26, 0.3)',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontFamily: 'Inter, sans-serif',
                    backgroundColor: '#FFFDF9',
                    marginBottom: '1rem',
                    outline: 'none',
                    lineHeight: '1.5'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <button 
                    className="login-button" 
                    style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                  >
                    <FiSave /> {isSavingNotes ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                  </button>
                  {saveMessage && (
                    <span style={{ color: 'var(--success-color)', fontWeight: 600, fontSize: '0.9rem' }}>
                      {saveMessage}
                    </span>
                  )}
                </div>
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