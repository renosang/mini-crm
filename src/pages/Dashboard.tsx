import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import {
  FiUsers, FiBox, FiShoppingCart, FiCreditCard,
  FiPlusCircle, FiClock, FiUserPlus, FiSettings,
  FiMail, FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiInfo
} from 'react-icons/fi';

// 1. Định nghĩa kiểu dữ liệu
interface IDashboardStats {
  totalCustomers: number;
  availableAccounts: number;
  monthlyOrders: number;
  monthlyRevenue: number;
}

interface ICustomer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
}

interface IAccount {
  _id: string;
  product_type: string;
  resource_type?: 'id_pass' | 'key' | 'slot';
  account_details?: {
    username?: string;
    license_key?: string;
  };
  cost: number;
  status: 'available' | 'sold' | 'expired' | 'banned';
  valid_until?: string;
  customer_id?: ICustomer | null;
  slots_assigned?: Array<{
    customer_id?: ICustomer;
    assigned_email?: string;
  }>;
  total_slots?: number;
  used_slots?: number;
}

interface IOrder {
  _id: string;
  customer_id?: ICustomer;
  accounts?: IAccount[];
  total_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  order_date: string;
}

interface IFlattenedSub {
  id: string;
  accountObj: IAccount;
  customer: ICustomer;
  productType: string;
  resourceType: 'id_pass' | 'key' | 'slot';
  detailsText: string;
  cost: number;
  validUntil?: string;
  parentAccountId: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Email Preview Modal state
  const [previewEmailData, setPreviewEmailData] = useState<{
    recipient: string;
    subject: string;
    html: string;
    isSimulation?: boolean;
  } | null>(null);
  const [activePreviewSub, setActivePreviewSub] = useState<IFlattenedSub | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsRes, ordersRes, accountsRes] = await Promise.all([
        api.get<{ success: boolean; data: IDashboardStats }>('/dashboard/stats'),
        api.get<{ success: boolean; data: IOrder[] }>('/orders'),
        api.get<{ success: boolean; data: IAccount[] }>('/accounts')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data);
      }
      if (accountsRes.data.success) {
        setAccounts(accountsRes.data.data);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Lỗi kết nối máy chủ hoặc không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 1. Phẳng hóa dữ liệu để tìm kiếm các tài khoản cần gia hạn
  const subscriptions: IFlattenedSub[] = [];
  accounts.forEach(acc => {
    if (acc.resource_type !== 'slot') {
      if (acc.customer_id) {
        const usernameStr = acc.account_details?.username ? `User: ${acc.account_details.username}` : '';
        const keyStr = acc.account_details?.license_key ? `Key: ${acc.account_details.license_key}` : '';
        subscriptions.push({
          id: acc._id,
          accountObj: acc,
          customer: acc.customer_id,
          productType: acc.product_type,
          resourceType: acc.resource_type || 'id_pass',
          detailsText: usernameStr || keyStr || 'Tài nguyên MMO',
          cost: acc.cost,
          validUntil: acc.valid_until,
          parentAccountId: acc._id
        });
      }
    } else {
      if (acc.slots_assigned && acc.slots_assigned.length > 0) {
        acc.slots_assigned.forEach(slot => {
          if (slot.customer_id) {
            subscriptions.push({
              id: `${acc._id}-${slot.customer_id._id}-${slot.assigned_email}`,
              accountObj: acc,
              customer: slot.customer_id,
              productType: `${acc.product_type} (Slot)`,
              resourceType: 'slot',
              detailsText: `Slot: ${slot.assigned_email || 'n/a'}`,
              cost: acc.cost,
              validUntil: acc.valid_until,
              parentAccountId: acc._id
            });
          }
        });
      }
    }
  });

  // 2. Tính số ngày hết hạn
  const getDaysRemaining = (validUntil?: string) => {
    if (!validUntil) return { days: Infinity, text: 'Không thời hạn', color: '#34C759', bg: '#EBF9EB', label: 'safe' };

    const expiry = new Date(validUntil);
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: diffDays, text: `Quá hạn ${Math.abs(diffDays)} ngày`, color: '#FF3B30', bg: '#FFEBEA', label: 'expired' };
    } else if (diffDays === 0) {
      return { days: 0, text: 'Hết hạn hôm nay', color: '#FF3B30', bg: '#FFEBEA', label: 'expired' };
    } else if (diffDays <= 3) {
      return { days: diffDays, text: `🚨 Chỉ còn ${diffDays} ngày`, color: '#FF3B30', bg: '#FFEBEA', label: 'soon-urgent' };
    } else if (diffDays <= 7) {
      return { days: diffDays, text: `Còn ${diffDays} ngày`, color: '#FF9500', bg: '#FFF3E0', label: 'soon' };
    } else {
      return { days: diffDays, text: `Còn ${diffDays} ngày`, color: '#34C759', bg: '#EBF9EB', label: 'safe' };
    }
  };

  // Lọc lấy danh sách thuê bao gia hạn gấp (Đã hết hạn hoặc sắp hết hạn trong 7 ngày), giới hạn tối đa 5 bản ghi
  const urgentRenewals = subscriptions
    .map(sub => ({ ...sub, expiry: getDaysRemaining(sub.validUntil) }))
    .filter(sub => sub.expiry.label === 'expired' || sub.expiry.label === 'soon' || sub.expiry.label === 'soon-urgent' || sub.expiry.label === 'today')
    .sort((a, b) => a.expiry.days - b.expiry.days)
    .slice(0, 5);

  // Tính toán số lượng tồn kho theo sản phẩm
  const productStockStats = (() => {
    const map: Record<string, { available: number; total: number; slotsFree: number; slotsTotal: number }> = {};
    accounts.forEach(acc => {
      const prod = acc.product_type;
      if (!map[prod]) {
        map[prod] = { available: 0, total: 0, slotsFree: 0, slotsTotal: 0 };
      }
      map[prod].total++;
      if (acc.status === 'available') {
        map[prod].available++;
      }
      if (acc.resource_type === 'slot') {
        const total = acc.total_slots || 5;
        const used = acc.used_slots || 0;
        map[prod].slotsFree += (total - used);
        map[prod].slotsTotal += total;
      }
    });
    return Object.entries(map).map(([name, val]) => ({
      name,
      ...val
    })).sort((a, b) => b.available - a.available);
  })();

  // Lấy 5 đơn hàng gần đây nhất
  const recentOrders = orders
    .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
    .slice(0, 5);

  // Kích hoạt Gửi email nhắc gia hạn tự động qua API
  const handleSendReminder = async (sub: IFlattenedSub, forceSend = false) => {
    const matchedOrder = orders.find(o => o.accounts?.some(acc => acc._id === sub.parentAccountId));

    try {
      setSendingEmailId(sub.id);
      let baseUrl = '';
      if (matchedOrder) {
        baseUrl = `/orders/send-reminder?id=${matchedOrder._id}`;
      } else {
        baseUrl = `/orders/send-reminder?account_id=${sub.parentAccountId}&customer_id=${sub.customer._id}`;
      }

      const url = forceSend ? baseUrl : `${baseUrl}&preview=true`;

      const res = await api.post<{
        success: boolean;
        mode: 'smtp' | 'simulation' | 'preview';
        message: string;
        previewHtml?: string;
        recipient?: string;
        subject?: string;
      }>(url, {});

      if (res.data.success) {
        if (res.data.mode === 'preview') {
          setActivePreviewSub(sub);
          setPreviewEmailData({
            recipient: res.data.recipient || sub.customer.email || 'khachhang@gmail.com',
            subject: res.data.subject || 'Thông báo gia hạn',
            html: res.data.previewHtml || '',
            isSimulation: false
          });
        } else if (res.data.mode === 'simulation' && res.data.previewHtml) {
          setActivePreviewSub(sub);
          setPreviewEmailData({
            recipient: res.data.recipient || sub.customer.email || 'khachhang@gmail.com',
            subject: res.data.subject || 'Thông báo gia hạn',
            html: res.data.previewHtml,
            isSimulation: true
          });
        } else {
          alert(res.data.message);
          setPreviewEmailData(null);
          setActivePreviewSub(null);
        }
      }
    } catch (err) {
      console.error('Error sending reminder:', err);
      alert('Gửi email nhắc nhở thất bại. Có lỗi xảy ra.');
    } finally {
      setSendingEmailId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-light)' }}>
        <FiRefreshCw className="spin-animation" style={{ fontSize: '2.5rem', marginBottom: '1rem' }} />
        <h3>Đang tải dữ liệu tổng quan...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'red' }}>
        <FiAlertTriangle style={{ fontSize: '3rem', marginBottom: '1rem' }} />
        <h3>{error}</h3>
        <button onClick={fetchAllData} style={{ marginTop: '1rem', padding: '8px 20px', borderRadius: '20px', border: '1px solid #E5E5EA', background: '#FFF', fontWeight: 600, cursor: 'pointer' }}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className="dashboard-page" style={{ padding: '0 0.5rem' }}>

      {/* 1. Header Chào Mừng */}
      <div className="customer-detail-header" style={{ marginBottom: '1.75rem' }}>
        <h1 className="gradient-title">Chào mừng trở lại, Admin! 🚀</h1>
        <p>Nền tảng quản trị tài nguyên số và tự động hóa quy trình gia hạn dịch vụ.</p>
      </div>

      {/* 2. Grid Thống Kê 4 Chỉ Số Chủ Chốt */}
      <div className="stats-grid-4" style={{ marginBottom: '1.75rem' }}>
        {stats && (
          <>
            <div className="stat-card widget stat-card-blue" onClick={() => navigate('/khach-hang')}>
              <div className="stat-card-icon"><FiUsers /></div>
              <div className="stat-card-info">
                <h3>Tổng Khách Hàng</h3>
                <p className="stat-card-value">{stats.totalCustomers}</p>
                <span className="stat-card-link">Quản lý khách hàng →</span>
              </div>
            </div>

            <div className="stat-card widget stat-card-green" onClick={() => navigate('/kho-tai-nguyen')}>
              <div className="stat-card-icon"><FiBox /></div>
              <div className="stat-card-info">
                <h3>Tài Khoản Khả Dụng</h3>
                <p className="stat-card-value">{stats.availableAccounts}</p>
                <span className="stat-card-link">Xem kho tài nguyên →</span>
              </div>
            </div>

            <div className="stat-card widget stat-card-purple" onClick={() => navigate('/ban-hang')}>
              <div className="stat-card-icon"><FiShoppingCart /></div>
              <div className="stat-card-info">
                <h3>Đơn Hàng (Tháng)</h3>
                <p className="stat-card-value">{stats.monthlyOrders}</p>
                <span className="stat-card-link">Xem lịch sử đơn hàng →</span>
              </div>
            </div>

            <div className="stat-card widget stat-card-orange" onClick={() => navigate('/ban-hang')}>
              <div className="stat-card-icon"><FiCreditCard /></div>
              <div className="stat-card-info">
                <h3>Doanh Thu (Tháng)</h3>
                <p className="stat-card-value">{stats.monthlyRevenue.toLocaleString('vi-VN')} đ</p>
                <span className="stat-card-link">Chi tiết doanh thu →</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Phân Hệ Hành Động Nhanh (Quick Actions) */}
      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.85rem', fontWeight: 700, color: 'var(--text-color)' }}>Hành động nhanh</h2>
      <div className="quick-actions-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="quick-action-card" onClick={() => navigate('/ban-hang', { state: { openCreateModal: true } })}>
          <div style={{ padding: '10px', backgroundColor: '#E3F2FD', color: '#0071E3', borderRadius: '10px', display: 'flex' }}><FiPlusCircle size={20} /></div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>Tạo Đơn Hàng Mới</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Lên hóa đơn dịch vụ</span>
          </div>
        </div>

        <div className="quick-action-card" onClick={() => navigate('/khach-hang', { state: { openCreateModal: true } })}>
          <div style={{ padding: '10px', backgroundColor: '#EBF9EB', color: '#34C759', borderRadius: '10px', display: 'flex' }}><FiUserPlus size={20} /></div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>Thêm Khách Hàng</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Đăng ký thành viên mới</span>
          </div>
        </div>

        <div className="quick-action-card" onClick={() => navigate('/kho-tai-nguyen')}>
          <div style={{ padding: '10px', backgroundColor: '#FFF3E0', color: '#FF9500', borderRadius: '10px', display: 'flex' }}><FiBox size={20} /></div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>Nhập Kho Tài Nguyên</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Cập nhật ID:Pass, Key</span>
          </div>
        </div>

        <div className="quick-action-card" onClick={() => navigate('/cai-dat')}>
          <div style={{ padding: '10px', backgroundColor: '#FAF5FE', color: '#AF52DE', borderRadius: '10px', display: 'flex' }}><FiSettings size={20} /></div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>Cấu Hình Hệ Thống</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Thiết lập SMTP & Brand</span>
          </div>
        </div>
      </div>

      {/* 4. Split Layout - Liên Kết Chặt Chẽ Các Chức Năng Cốt Lõi */}
      <div className="dashboard-split-grid">

        {/* Cột 1: Cảnh Báo Gia Hạn Gấp (Urgent Renewals Alert) */}
        <div className="dashboard-section-card">
          <div className="dashboard-section-header">
            <h2><FiClock style={{ color: '#FF3B30' }} /> Cảnh Báo Gia Hạn Gấp</h2>
            <Link to="/gia-han" className="dashboard-view-all">Xem tất cả →</Link>
          </div>

          <div className="table-responsive-wrapper" style={{ flex: 1 }}>
            {urgentRenewals.length > 0 ? (
              <table className="styled-table" style={{ fontSize: '0.85rem', margin: 0 }}>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Sản phẩm</th>
                    <th>Thời hạn</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {urgentRenewals.map(sub => (
                    <tr key={sub.id} style={{ borderLeft: `3px solid ${sub.expiry.color}` }}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{sub.customer.name}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{sub.customer.email || 'N/A'}</span>
                      </td>
                      <td>
                        <span className="product-badge nowrap" style={{
                          backgroundColor: sub.resourceType === 'slot' ? '#FAF5FE' : '#F2F7FD',
                          color: sub.resourceType === 'slot' ? '#AF52DE' : '#0071E3',
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontWeight: 600
                        }}>{sub.productType}</span>
                      </td>
                      <td>
                        <span className="nowrap" style={{
                          color: sub.expiry.color,
                          backgroundColor: sub.expiry.bg,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}>{sub.expiry.text}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-remind-action nowrap"
                          onClick={() => handleSendReminder(sub)}
                          disabled={sendingEmailId === sub.id}
                          style={{ height: '26px', padding: '0 10px', fontSize: '0.75rem', borderRadius: '13px' }}
                        >
                          <FiMail size={11} /> {sendingEmailId === sub.id ? '...' : 'Nhắc nợ'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-light)' }}>
                <FiCheckCircle size={32} style={{ color: '#34C759', marginBottom: '0.5rem' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-color)' }}>Tuyệt vời! Không có cảnh báo khẩn cấp</p>
                <span style={{ fontSize: '0.75rem' }}>Mọi gói dịch vụ vẫn hoạt động an toàn</span>
              </div>
            )}
          </div>
        </div>

        {/* Cột 2: Đơn Hàng Gần Đây (Recent Orders Table) */}
        <div className="dashboard-section-card">
          <div className="dashboard-section-header">
            <h2><FiShoppingCart style={{ color: '#0071E3' }} /> Đơn Hàng Gần Đây</h2>
            <Link to="/ban-hang" className="dashboard-view-all">Xem tất cả →</Link>
          </div>

          <div className="table-responsive-wrapper" style={{ flex: 1 }}>
            {recentOrders.length > 0 ? (
              <table className="styled-table" style={{ fontSize: '0.85rem', margin: 0 }}>
                <thead>
                  <tr>
                    <th>Đơn hàng</th>
                    <th>Khách hàng</th>
                    <th>Doanh thu</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o._id}>
                      <td className="nowrap" style={{ fontWeight: 700, color: '#0071E3' }}>
                        #{o._id.substring(18).toUpperCase()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.customer_id?.name || 'N/A'}</div>
                        <span className="nowrap" style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{new Date(o.order_date).toLocaleDateString('vi-VN')}</span>
                      </td>
                      <td className="nowrap" style={{ fontWeight: 700, color: '#D27B00' }}>
                        {o.total_amount.toLocaleString('vi-VN')} đ
                      </td>
                      <td>
                        <span className="product-badge nowrap" style={{
                          backgroundColor: o.status === 'paid' ? '#EBF9EB' : o.status === 'pending' ? '#FFF3E0' : '#FFEBEA',
                          color: o.status === 'paid' ? '#34C759' : o.status === 'pending' ? '#FF9500' : '#FF3B30',
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 700
                        }}>
                          {o.status === 'paid' ? 'Đã thanh toán' : o.status === 'pending' ? 'Chờ thanh toán' : 'Đã hủy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-light)' }}>
                <FiShoppingCart size={32} style={{ color: '#86868B', marginBottom: '0.5rem' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-color)' }}>Chưa có đơn hàng nào</p>
                <span style={{ fontSize: '0.75rem' }}>Bấm nút "Tạo Đơn Hàng Mới" để bắt đầu bán hàng</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 5. Phân Hệ Tồn Kho Khả Dụng Theo Sản Phẩm */}
      <div className="dashboard-section-card" style={{ marginTop: '1.75rem', marginBottom: '1.75rem' }}>
        <div className="dashboard-section-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <h2><FiBox style={{ color: '#34C759' }} /> Tình Trạng Kho Hàng</h2>
          <Link to="/kho-tai-nguyen" className="dashboard-view-all">Chi tiết kho →</Link>
        </div>
        <div className="table-responsive-wrapper">
          <table className="styled-table" style={{ fontSize: '0.875rem', margin: 0 }}>
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Dạng tài nguyên</th>
                <th>Hàng có sẵn (Còn trong kho)</th>
                <th className="hide-mobile">Tổng nhập kho</th>
              </tr>
            </thead>
            <tbody>
              {productStockStats.length > 0 ? (
                productStockStats.map((prod, idx) => {
                  const sampleAcc = accounts.find(a => a.product_type === prod.name);
                  const resType = sampleAcc?.resource_type || 'id_pass';
                  const resTypeLabel = resType === 'slot' ? '👥 Slot' : resType === 'key' ? '🎟️ Key' : '🔑 ID:Pass';

                  return (
                    <tr key={idx}>
                      <td><strong>{prod.name}</strong></td>
                      <td>
                        <span className="product-badge nowrap" style={{
                          backgroundColor: resType === 'slot' ? '#FAF5FE' : resType === 'key' ? '#F4FBF6' : '#F2F7FD',
                          color: resType === 'slot' ? '#AF52DE' : resType === 'key' ? '#34C759' : '#0071E3',
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontWeight: 600
                        }}>{resTypeLabel}</span>
                      </td>
                      <td>
                        {resType === 'slot' ? (
                          <div className="nowrap">
                            <strong style={{ color: prod.slotsFree > 0 ? '#34C759' : '#FF3B30' }}>{prod.slotsFree} slots trống</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginLeft: '6px' }}>(trong {prod.slotsTotal} tổng)</span>
                          </div>
                        ) : (
                          <strong className="nowrap" style={{ color: prod.available > 0 ? '#34C759' : '#FF3B30' }}>{prod.available} sản phẩm</strong>
                        )}
                      </td>
                      <td className="hide-mobile nowrap">{prod.total} sản phẩm</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    Không có dữ liệu hàng hóa trong kho.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================================================
         MODAL XEM TRƯỚC HÓA ĐƠN GỬI EMAIL NHẮC NỢ (ĐỒNG BỘ CHỨC NĂNG CRM)
         ========================================================================== */}
      {previewEmailData && (
        <div className="modal-overlay" onClick={() => { setPreviewEmailData(null); setActivePreviewSub(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '680px', padding: '1.75rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', flexShrink: 0 }}>
              <h2>{previewEmailData?.isSimulation ? '✉️ Xem Trước Hóa Đơn (Giả lập gửi Email)' : '✉️ Xem Trước & Xác Nhận Gửi Hóa Đơn'}</h2>
              <button className="close-button" onClick={() => { setPreviewEmailData(null); setActivePreviewSub(null); }}>&times;</button>
            </div>

            <div style={{ backgroundColor: '#F5F5F7', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem', flexShrink: 0 }}>
              <div><span style={{ color: 'var(--text-light)' }}>Người nhận:</span> <strong>{previewEmailData?.recipient}</strong></div>
              <div><span style={{ color: 'var(--text-light)' }}>Tiêu đề:</span> <strong>{previewEmailData?.subject}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: previewEmailData?.isSimulation ? '#FF9500' : '#0071E3', fontWeight: 600, fontSize: '0.8rem', marginTop: '4px' }}>
                <FiInfo /> {previewEmailData?.isSimulation
                  ? 'Chưa cấu hình SMTP - Hệ thống đang sử dụng chế độ xem trước giả lập.'
                  : 'Hệ thống đã kết nối SMTP thành công. Vui lòng kiểm tra kỹ trước khi xác nhận gửi.'}
              </div>
            </div>

            {/* Iframe Preview */}
            <div style={{ flex: 1, minHeight: '350px', border: '1px solid #E5E5EA', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FFF', display: 'flex', flexDirection: 'column' }}>
              <iframe
                title="Dashboard Preview Email Billing"
                srcDoc={previewEmailData?.html || ''}
                style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
              />
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #E5E5EA', padding: '1rem 0 0 0', marginTop: '1.25rem', flexShrink: 0, display: 'flex', gap: '0.75rem' }}>
              {previewEmailData?.isSimulation ? (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => { setPreviewEmailData(null); setActivePreviewSub(null); }}
                  style={{ width: '100%', height: '44px', fontWeight: 600, backgroundColor: '#1D1D1F', color: '#FFF' }}
                >
                  Đóng chế độ Xem trước
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => { setPreviewEmailData(null); setActivePreviewSub(null); }}
                    style={{ flex: 1, height: '44px', fontWeight: 600 }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-save"
                    onClick={() => activePreviewSub && handleSendReminder(activePreviewSub, true)}
                    disabled={sendingEmailId === activePreviewSub?.id}
                    style={{ flex: 1, height: '44px', fontWeight: 600, backgroundColor: '#0071E3' }}
                  >
                    {sendingEmailId === activePreviewSub?.id ? 'Đang gửi email...' : 'Xác Nhận Gửi Email'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;