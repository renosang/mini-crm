import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { 
  FiShoppingCart, FiPlus, FiTrash2, FiUser, FiCreditCard, 
  FiPackage, FiSearch, FiCalendar, FiCheckCircle, FiClock, 
  FiXCircle, FiLock, FiPlusCircle, FiList, FiMail, FiInfo
} from 'react-icons/fi';

// === KIỂU DỮ LIỆU ===
interface ICustomer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  status?: string;
  source?: string;
}

interface IAccount {
  _id: string;
  product_type: string;
  account_details?: {
    username?: string;
    password_acc?: string;
    license_key?: string;
    pin?: string;
  };
  cost: number;
  status: string;
}

interface IOrder {
  _id: string;
  customer_id: ICustomer | null;
  accounts: IAccount[];
  total_amount: number;
  status: 'paid' | 'pending' | 'cancelled';
  createdAt: string;
}

// === COMPONENT TRANG BÁN HÀNG ===
const BanHang: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [stockAccounts, setStockAccounts] = useState<IAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  const location = useLocation();
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);

  // States điều khiển Modal tạo đơn
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  
  // Thêm nhanh khách hàng inline
  const [showQuickCustomerForm, setShowQuickCustomerForm] = useState<boolean>(false);
  const [quickCustomerName, setQuickCustomerName] = useState<string>('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState<string>('');

  // Cấu trúc sản phẩm bán trong đơn hàng
  const [sellMode, setSellMode] = useState<'inventory' | 'direct'>('direct');
  const [selectedInventoryAccountIds, setSelectedInventoryAccountIds] = useState<string[]>([]);
  
  // Tạo tài khoản trực tiếp
  const [directProductType, setDirectProductType] = useState<string>('Proxy IPv4');
  const [directUsername, setDirectUsername] = useState<string>('');
  const [directPassword, setDirectPassword] = useState<string>('');
  const [directLicense, setDirectLicense] = useState<string>('');
  const [directCost, setDirectCost] = useState<number>(0);
  const [directValidUntil, setDirectValidUntil] = useState<string>('');

  // Giá bán & trạng thái đơn hàng
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<'paid' | 'pending'>('paid');
  const [isDirectUpgrade, setIsDirectUpgrade] = useState<boolean>(false);

  // States gửi Email nhắc nợ / gia hạn
  const [isSendingEmailId, setIsSendingEmailId] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<{ recipient: string, subject: string, previewHtml: string, isSimulation?: boolean } | null>(null);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState<boolean>(false);
  const [activePreviewOrderId, setActivePreviewOrderId] = useState<string | null>(null);

  // Load tất cả dữ liệu
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [resOrders, resCustomers, resAccounts] = await Promise.all([
        api.get<{ success: boolean, data: IOrder[] }>('/orders'),
        api.get<{ success: boolean, data: ICustomer[] }>('/customers'),
        api.get<{ success: boolean, data: IAccount[] }>('/accounts')
      ]);

      if (resOrders.data.success) setOrders(resOrders.data.data);
      if (resCustomers.data.success) setCustomers(resCustomers.data.data);
      
      // Lọc các tài khoản còn trống trong kho (status = available)
      if (resAccounts.data.success) {
        const availableStock = resAccounts.data.data.filter(acc => acc.status === 'available');
        setStockAccounts(availableStock);
      }
    } catch (err) {
      console.error("Lỗi nạp dữ liệu bán hàng:", err);
      setError('Không thể kết nối API máy chủ để nạp dữ liệu bán hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Hỗ trợ tự động mở chi tiết đơn hàng nếu có ?viewOrder=... trong URL
  useEffect(() => {
    if (orders.length > 0) {
      const searchParams = new URLSearchParams(location.search);
      const viewOrderId = searchParams.get('viewOrder');
      if (viewOrderId) {
        const found = orders.find(o => o._id === viewOrderId);
        if (found) {
          setViewingOrder(found);
        }
      }
    }
  }, [location.search, orders]);

  // Tìm kiếm khách hàng trong Modal
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearchQuery))
  );

  // Xử lý tạo nhanh Khách hàng inline
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomerName.trim()) return;

    try {
      const res = await api.post<{ success: boolean, data: ICustomer }>('/customers', {
        name: quickCustomerName,
        phone: quickCustomerPhone,
        source: 'Tạo nhanh đơn hàng'
      });
      if (res.data.success) {
        const newCust = res.data.data;
        setCustomers([newCust, ...customers]);
        setSelectedCustomerId(newCust._id);
        setCustomerSearchQuery(newCust.name);
        setShowQuickCustomerForm(false);
        setQuickCustomerName('');
        setQuickCustomerPhone('');
      }
    } catch (err) {
      alert('Không thể tạo nhanh khách hàng.');
    }
  };

  // Submit tạo Đơn hàng mới
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Vui lòng chọn khách hàng.');
      return;
    }
    if (!totalAmount || isNaN(Number(totalAmount))) {
      alert('Vui lòng nhập giá bán hợp lệ.');
      return;
    }

    try {
      const reqBody: any = {
        customer_id: selectedCustomerId,
        total_amount: Number(totalAmount),
        status: orderStatus,
      };

      if (sellMode === 'inventory') {
        if (selectedInventoryAccountIds.length === 0) {
          alert('Vui lòng chọn ít nhất một tài khoản trong kho.');
          return;
        }
        reqBody.existingAccountIds = selectedInventoryAccountIds;
      } else {
        // Direct creation of account/service
        reqBody.accountsData = [{
          product_type: directProductType,
          username: directUsername,
          password_acc: isDirectUpgrade ? '' : directPassword,
          license_key: directLicense,
          cost: directCost,
          valid_until: directValidUntil || null
        }];
      }

      const res = await api.post<{ success: boolean }>('/orders', reqBody);
      if (res.data.success) {
        setIsModalOpen(false);
        setIsDirectUpgrade(false);
        // Reset form
        setSelectedCustomerId('');
        setCustomerSearchQuery('');
        setSelectedInventoryAccountIds([]);
        setDirectUsername('');
        setDirectPassword('');
        setDirectLicense('');
        setDirectCost(0);
        setDirectValidUntil('');
        setTotalAmount('');
        setOrderStatus('paid');
        // Reload data
        await loadAllData();
      }
    } catch (err: any) {
      alert('Lỗi tạo đơn hàng: ' + (err.response?.data?.message || err.message));
    }
  };

  // Xóa/Hủy đơn hàng
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này? Tài khoản liên quan (nếu có) sẽ được hoàn trả về kho.')) return;

    try {
      const res = await api.delete(`/orders/${orderId}`);
      if (res.data.success) {
        await loadAllData();
      }
    } catch (err) {
      alert('Không thể xóa đơn hàng.');
    }
  };

  // Gửi Email nhắc gia hạn & Hóa đơn bàn giao
  const handleSendEmailReminder = async (orderId: string, forceSend = false) => {
    try {
      setIsSendingEmailId(orderId);
      
      const baseUrl = `/orders/${orderId}/send-reminder`;
      const url = forceSend ? baseUrl : `${baseUrl}?preview=true`;
      
      const res = await api.post<{ 
        success: boolean; 
        mode: 'smtp' | 'simulation' | 'preview'; 
        message: string; 
        previewHtml?: string; 
        recipient?: string; 
        subject?: string;
      }>(url);
      
      if (res.data.success) {
        if (res.data.mode === 'preview') {
          // SMTP cấu hình thành công -> Mở modal xem trước trước khi bấm gửi thực tế
          setActivePreviewOrderId(orderId);
          setEmailPreview({
            recipient: res.data.recipient || '',
            subject: res.data.subject || '',
            previewHtml: res.data.previewHtml || '',
            isSimulation: false
          });
          setShowEmailPreviewModal(true);
        } else if (res.data.mode === 'simulation' && res.data.previewHtml) {
          // Simulation mode / SMTP chưa cấu hình
          setActivePreviewOrderId(orderId);
          setEmailPreview({
            recipient: res.data.recipient || '',
            subject: res.data.subject || '',
            previewHtml: res.data.previewHtml || '',
            isSimulation: true
          });
          setShowEmailPreviewModal(true);
        } else {
          // SMTP mode gửi thực tế thành công
          alert(res.data.message);
          setShowEmailPreviewModal(false);
          setEmailPreview(null);
          setActivePreviewOrderId(null);
        }
      }
    } catch (err: any) {
      alert('Lỗi gửi email: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSendingEmailId(null);
    }
  };

  // Tính toán thống kê nhanh
  const stats = {
    totalRevenue: orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total_amount, 0),
    totalOrders: orders.length,
    pendingPayments: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.total_amount, 0),
    accountsSold: orders.reduce((sum, o) => sum + (o.accounts?.length || 0), 0)
  };

  return (
    <div>
      {/* Tiêu đề Apple Style */}
      <div className="customer-detail-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="gradient-title">
          Quản lý Bán Hàng & Đơn Hàng
        </h1>
        <p>Bàn giao proxy, tài khoản MMO và quản lý doanh thu tức thì</p>
      </div>

      {/* Bảng Widgets Thống kê Apple Glassmorphism */}
      <div className="stats-grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FBFBFD, #F5F5F7)' }}>
          <div className="stat-card-icon icon-new" style={{ backgroundColor: '#E8F5E9', color: '#4CAF50' }}><FiCreditCard /></div>
          <div className="stat-card-info">
            <h3>Doanh Thu Đã Nhận</h3>
            <p style={{ color: '#2E7D32', fontWeight: 700 }}>{stats.totalRevenue.toLocaleString('vi-VN')} đ</p>
          </div>
        </div>
        <div className="stat-card widget">
          <div className="stat-card-icon icon-total" style={{ backgroundColor: '#E3F2FD', color: '#1E88E5' }}><FiShoppingCart /></div>
          <div className="stat-card-info">
            <h3>Tổng Số Đơn Bán</h3>
            <p>{stats.totalOrders} đơn</p>
          </div>
        </div>
        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FFFDE8, #FFF9C4)' }}>
          <div className="stat-card-icon icon-source" style={{ backgroundColor: '#FFFDE7', color: '#FBC02D' }}><FiClock /></div>
          <div className="stat-card-info">
            <h3>Dư Nợ Chưa Thu</h3>
            <p style={{ color: '#F57F17', fontWeight: 700 }}>{stats.pendingPayments.toLocaleString('vi-VN')} đ</p>
          </div>
        </div>
        <div className="stat-card widget">
          <div className="stat-card-icon icon-source" style={{ backgroundColor: '#EDE7F6', color: '#5E35B1' }}><FiPackage /></div>
          <div className="stat-card-info">
            <h3>Tài Khoản Đã Bán</h3>
            <p>{stats.accountsSold} tài nguyên</p>
          </div>
        </div>
      </div>

      {/* Thanh công cụ và nút Thêm Đơn Hàng */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-dark)' }}>
          Lịch sử Bàn giao Đơn hàng
        </h2>
        <button className="login-button" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setIsModalOpen(true)}>
          <FiPlusCircle /> Tạo Đơn Hàng Mới
        </button>
      </div>

      {/* Bảng đơn hàng */}
      {loading ? (
        <p>Đang tải lịch sử bán hàng...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div className="table-container widget" style={{ boxShadow: 'var(--shadow)', transition: 'none' }}>
          <table className="styled-table">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Khách Hàng</th>
                <th>Tài Nguyên Bàn Giao</th>
                <th>Số tiền</th>
                <th>Thanh Toán</th>
                <th>Ngày Bàn Giao</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map(order => (
                  <tr key={order._id}>
                    <td>
                      <button 
                        type="button"
                        onClick={() => setViewingOrder(order)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          padding: 0, 
                          color: '#0071E3', 
                          fontFamily: 'monospace', 
                          fontWeight: 600, 
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                        title="Click để xem chi tiết hóa đơn & phân tích lợi nhuận"
                      >
                        #{order._id.substring(order._id.length - 6).toUpperCase()}
                      </button>
                    </td>
                    <td>
                      {order.customer_id ? (
                        <div>
                          <Link to={`/customers/${order.customer_id._id}`} className="customer-link" style={{ fontWeight: 600 }}>
                            {order.customer_id.name}
                          </Link>
                          {order.customer_id.status && (
                            <span 
                              className={`status-badge ${order.customer_id.status.toLowerCase() === 'vip' ? 'status-vip' : order.customer_id.status.toLowerCase() === 'tiềm năng' ? 'status-tiem-nang' : 'status-binh-thuong'}`}
                              style={{ marginLeft: '6px', fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}
                            >
                              {order.customer_id.status}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Khách đã bị xóa</span>
                      )}
                    </td>
                    <td>
                      {order.accounts && order.accounts.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {order.accounts.map((acc, index) => (
                            <div key={index} style={{ fontSize: '0.875rem' }}>
                              <strong style={{ color: '#0071E3' }}>{acc.product_type}</strong>
                              {acc.account_details?.username && (
                                <span style={{ color: 'var(--text-light)', marginLeft: '6px', fontSize: '0.8rem' }}>
                                  ({acc.account_details.username})
                                </span>
                              )}
                              {acc.account_details?.license_key && (
                                <span style={{ color: 'var(--text-light)', marginLeft: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                  ({acc.account_details.license_key.substring(0, 10)}...)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>Không có chi tiết tài khoản</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: '#1D1D1F' }}>
                      {order.total_amount.toLocaleString('vi-VN')} đ
                    </td>
                    <td>
                      {order.status === 'paid' ? (
                        <span className="status-badge status-tiem-nang" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FiCheckCircle /> Đã Thu
                        </span>
                      ) : (
                        <span className="status-badge status-canh-bao" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FiClock /> Dư Nợ
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                        <FiCalendar style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleSendEmailReminder(order._id)} 
                        disabled={isSendingEmailId === order._id}
                        title="Gửi Email Nhắc Nhở & Hóa Đơn" 
                        style={{ border: 'none', background: 'none', color: '#0071E3', cursor: 'pointer', fontSize: '1.05rem', padding: '4px', marginRight: '8px' }}
                      >
                        {isSendingEmailId === order._id ? '...' : <FiMail />}
                      </button>
                      <button 
                        onClick={() => handleDeleteOrder(order._id)} 
                        title="Hủy Đơn & Hoàn Kho" 
                        style={{ border: 'none', background: 'none', color: '#FF3B30', cursor: 'pointer', fontSize: '1.05rem', padding: '4px' }}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-light)' }}>
                    Chưa có đơn hàng bán ra nào được tạo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL TẠO ĐƠN HÀNG MỚI (STYLE APPLE) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '95vw' }}>
            <div className="modal-header">
              <h2><FiShoppingCart style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Tạo Đơn Bàn Giao Tài Nguyên</h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close-btn">&times;</button>
            </div>
            
            <form onSubmit={handleOrderSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '5px' }}>
                
                {/* 1. CHỌN KHÁCH HÀNG (INTEGRATION) */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label htmlFor="customer-search" style={{ margin: 0 }}>Chọn khách hàng mua (Tìm tên / SĐT)</label>
                    <button 
                      type="button" 
                      style={{ border: 'none', background: 'none', color: '#0071E3', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      onClick={() => setShowQuickCustomerForm(!showQuickCustomerForm)}
                    >
                      <FiPlus /> Tạo Nhanh Khách Hàng
                    </button>
                  </div>

                  {/* Form tạo nhanh inline */}
                  {showQuickCustomerForm && (
                    <div style={{ border: '1px solid rgba(0, 113, 227, 0.2)', backgroundColor: '#F5F5F7', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-dark)' }}>Tạo Nhanh Khách Hàng Mới</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <input 
                          type="text" 
                          placeholder="Họ và Tên" 
                          value={quickCustomerName} 
                          onChange={e => setQuickCustomerName(e.target.value)} 
                          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #D2D2D7' }}
                        />
                        <input 
                          type="text" 
                          placeholder="Số Điện Thoại" 
                          value={quickCustomerPhone} 
                          onChange={e => setQuickCustomerPhone(e.target.value)} 
                          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #D2D2D7' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-cancel" style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }} onClick={() => setShowQuickCustomerForm(false)}>Hủy</button>
                        <button type="button" className="btn-save" style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem', width: 'auto' }} onClick={handleQuickCustomerSubmit}>Lưu Khách</button>
                      </div>
                    </div>
                  )}

                  {/* Ô tìm kiếm thông minh */}
                  <div style={{ position: 'relative' }}>
                    <FiSearch style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-light)' }} />
                    <input 
                      type="text" 
                      id="customer-search"
                      placeholder="Gõ tên hoặc số điện thoại để lọc..." 
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      style={{ paddingLeft: '35px' }}
                    />
                  </div>

                  {/* Dropdown tìm kiếm thông minh phong cách Apple */}
                  {showCustomerDropdown && customerSearchQuery.trim() !== '' && (
                    <div className="widget" style={{ position: 'absolute', width: '100%', zIndex: 100, border: '1px solid var(--border-color)', top: '100%', left: 0, padding: '0.5rem 0', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', maxHeight: '180px', overflowY: 'auto' }}>
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(cust => (
                          <div 
                            key={cust._id}
                            style={{ padding: '0.6rem 1.25rem', cursor: 'pointer', hover: { backgroundColor: '#F5F5F7' }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onClick={() => {
                              setSelectedCustomerId(cust._id);
                              setCustomerSearchQuery(cust.name);
                              setShowCustomerDropdown(false);
                            }}
                            className="nav-item"
                          >
                            <span style={{ fontWeight: 600 }}>{cust.name}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                              {cust.phone || cust.email || 'Không có liên hệ'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '0.6rem 1.25rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                          Không tìm thấy khách hàng nào.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. CHỌN CHẾ ĐỘ CUNG CẤP TÀI NGUYÊN */}
                <div className="form-group">
                  <label>Chọn chế độ cung cấp tài nguyên</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.4rem' }}>
                    <button 
                      type="button" 
                      className={`tab-nav button ${sellMode === 'direct' ? 'active' : ''}`}
                      style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid ' + (sellMode === 'direct' ? '#0071E3' : '#D2D2D7'), backgroundColor: sellMode === 'direct' ? '#F2F8FF' : '#FFFFFF', color: sellMode === 'direct' ? '#0071E3' : 'var(--text-color)', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setSellMode('direct')}
                    >
                      Nhập Tài khoản / Cấp Proxy trực tiếp
                    </button>
                    <button 
                      type="button" 
                      className={`tab-nav button ${sellMode === 'inventory' ? 'active' : ''}`}
                      style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid ' + (sellMode === 'inventory' ? '#0071E3' : '#D2D2D7'), backgroundColor: sellMode === 'inventory' ? '#F2F8FF' : '#FFFFFF', color: sellMode === 'inventory' ? '#0071E3' : 'var(--text-color)', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setSellMode('inventory')}
                    >
                      Bán Tài khoản có sẵn trong kho ({stockAccounts.length})
                    </button>
                  </div>
                </div>

                {/* A. FORM NHẬP TRỰC TIẾP */}
                {sellMode === 'direct' && (
                  <div style={{ border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px', backgroundColor: '#FAFBFD', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FiLock /> Chi Tiết Tài Nguyên MMO
                      </h3>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={isDirectUpgrade} 
                          onChange={e => {
                            setIsDirectUpgrade(e.target.checked);
                            if (e.target.checked) {
                              setDirectPassword('');
                            }
                          }}
                          style={{ width: 'auto', cursor: 'pointer', margin: 0 }}
                        />
                        Nâng cấp trực tiếp trên tài khoản khách (Không cấp ID/Pass mới)
                      </label>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="prod-type">Loại Sản phẩm / dịch vụ</label>
                        <select id="prod-type" value={directProductType} onChange={e => setDirectProductType(e.target.value)} style={{ padding: '0.6rem 0.75rem' }}>
                          <option value="Proxy IPv4 US">Proxy IPv4 US</option>
                          <option value="Proxy IPv6 Sỉ">Proxy IPv6 Sỉ</option>
                          <option value="Tài khoản Facebook clone">Tài khoản Facebook Clone</option>
                          <option value="VPS Windows Server">VPS Windows Server</option>
                          <option value="License Key Tool MMO">License Key Tool MMO</option>
                          <option value="Khác">Khác / Dịch vụ tùy chỉnh</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="prod-license">License Key / Dòng bàn giao</label>
                        <input type="text" id="prod-license" placeholder="Ví dụ: LCSF-1293-8472-XDFE" value={directLicense} onChange={e => setDirectLicense(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="prod-user">{isDirectUpgrade ? 'Email / Tài khoản của khách hàng cần nâng cấp' : 'Tên Đăng Nhập / Host'}</label>
                        <input type="text" id="prod-user" placeholder={isDirectUpgrade ? 'Nhập Email của khách hàng' : 'Ví dụ: proxy_user hoặc 127.0.0.1'} value={directUsername} onChange={e => setDirectUsername(e.target.value)} />
                      </div>
                      {isDirectUpgrade ? (
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0.75rem 1rem', backgroundColor: '#FFF9E6', border: '1px solid #FFE0B2', borderRadius: '10px', color: '#D84315', fontSize: '0.85rem' }}>
                          ℹ️ Đang bật gán bản quyền trực tiếp. Khách hàng sẽ sử dụng tài khoản hiện tại của họ để đăng nhập. Không cấp mật khẩu mới.
                        </div>
                      ) : (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="prod-pass">Mật Khẩu / Port</label>
                          <input type="text" id="prod-pass" placeholder="Ví dụ: proxy_pass hoặc 8080" value={directPassword} onChange={e => setDirectPassword(e.target.value)} />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="prod-cost">Giá vốn từ nhà cung cấp (đ)</label>
                        <input type="number" id="prod-cost" value={directCost} onChange={e => setDirectCost(Number(e.target.value))} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="prod-valid">Hạn Sử Dụng (Valid until)</label>
                        <input type="date" id="prod-valid" value={directValidUntil} onChange={e => setDirectValidUntil(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* B. HỘP CHỌN TỪ KHO */}
                {sellMode === 'inventory' && (
                  <div style={{ border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px', backgroundColor: '#FAFBFD', marginBottom: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                      Chọn từ Kho Tài khoản sẵn có
                    </h3>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      Chọn các tài khoản trống để gán bán cho khách hàng.
                    </p>
                    
                    {stockAccounts.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {stockAccounts.map(acc => (
                          <label 
                            key={acc._id}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#FFFFFF', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #E5E5EA', cursor: 'pointer', fontSize: '0.9rem' }}
                          >
                            <input 
                              type="checkbox" 
                              checked={selectedInventoryAccountIds.includes(acc._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInventoryAccountIds([...selectedInventoryAccountIds, acc._id]);
                                } else {
                                  setSelectedInventoryAccountIds(selectedInventoryAccountIds.filter(id => id !== acc._id));
                                }
                              }}
                              style={{ width: 'auto', cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                              {acc.resource_type === 'slot' ? (
                                <span style={{ backgroundColor: '#FAF5FE', color: '#7B1FA2', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>
                                  👥 Slot ({acc.used_slots}/{acc.total_slots})
                                </span>
                              ) : acc.resource_type === 'key' ? (
                                <span style={{ backgroundColor: '#EBF9EB', color: '#2E7D32', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>
                                  🎟️ Key
                                </span>
                              ) : (
                                <span style={{ backgroundColor: '#E1F5FE', color: '#0288D1', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>
                                  🔑 ID:Pass
                                </span>
                              )}
                              <strong style={{ color: '#0071E3' }}>{acc.product_type}</strong>
                              {acc.account_details?.username && <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>({acc.account_details.username})</span>}
                              {acc.account_details?.license_key && <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', fontFamily: 'monospace' }}>({acc.account_details.license_key.substring(0, 15)}...)</span>}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                              Vốn: {acc.cost.toLocaleString('vi-VN')} đ
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '1rem', backgroundColor: '#FFEBEB', color: '#FF3B30', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                        Không còn tài khoản trống nào khả dụng trong kho! Hãy dùng chế độ gán bán trực tiếp.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. THÔNG TIN GIÁ BÁN & THANH TOÁN */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="total-amount">Giá bán thực thu (Tổng tiền đ)</label>
                    <input 
                      type="number" 
                      id="total-amount" 
                      placeholder="Ví dụ: 150000" 
                      value={totalAmount} 
                      onChange={e => setTotalAmount(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="order-status">Trạng thái thanh toán</label>
                    <select id="order-status" value={orderStatus} onChange={e => setOrderStatus(e.target.value as any)}>
                      <option value="paid">Đã Thu Tiền (paid)</option>
                      <option value="pending">Dư Nợ / Thu Sau (pending)</option>
                    </select>
                  </div>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
                <button type="submit" className="btn-save">Hoàn tất & Bàn Giao</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM TRƯỚC EMAIL & XÁC NHẬN GỬI */}
      {showEmailPreviewModal && emailPreview && (
        <div className="modal-overlay" onClick={() => { setShowEmailPreviewModal(false); setActivePreviewOrderId(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '880px', maxWidth: '95vw' }}>
            <div className="modal-header">
              <h2><FiMail style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {emailPreview?.isSimulation ? 'Bản Xem Trước Hóa Đơn Email (Giả lập gửi)' : 'Xem Trước & Xác Nhận Gửi Hóa Đơn'}</h2>
              <button onClick={() => { setShowEmailPreviewModal(false); setActivePreviewOrderId(null); }} className="modal-close-btn">&times;</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', backgroundColor: '#F5F5F7', padding: '1.5rem' }}>
              <div style={{ 
                backgroundColor: emailPreview?.isSimulation ? '#FFEBEB' : '#EBF9EB', 
                border: `1px solid ${emailPreview?.isSimulation ? '#FFD2D2' : '#C8E6C9'}`, 
                padding: '0.75rem 1rem', 
                borderRadius: '10px', 
                color: emailPreview?.isSimulation ? '#D32F2F' : '#2E7D32', 
                fontSize: '0.85rem', 
                marginBottom: '1rem', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FiInfo /> 
                {emailPreview?.isSimulation 
                  ? 'Hệ thống đang chạy ở chế độ GIẢ LẬP (Chưa cấu hình SMTP trong phần Cài đặt). Dưới đây là email hóa đơn thực tế sẽ được gửi tới khách hàng.' 
                  : 'Hệ thống đã kết nối SMTP. Vui lòng kiểm tra kỹ nội dung hóa đơn và tài nguyên bàn giao trước khi xác nhận gửi email thực tế.'}
              </div>

              <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <div><strong>Người nhận (To):</strong> {emailPreview?.recipient}</div>
                <div style={{ marginTop: '4px' }}><strong>Tiêu đề (Subject):</strong> {emailPreview?.subject}</div>
              </div>

              {/* Nhúng mã HTML hóa đơn */}
              <div 
                style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', backgroundColor: '#FFF' }}
                dangerouslySetInnerHTML={{ __html: emailPreview?.previewHtml || '' }}
              />
            </div>
            
            <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
              {emailPreview?.isSimulation ? (
                <>
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    style={{ backgroundColor: '#8E8E93', color: '#FFFFFF', cursor: 'pointer', marginRight: 'auto' }}
                    onClick={() => {
                      if (emailPreview?.previewHtml) {
                        navigator.clipboard.writeText(emailPreview?.previewHtml);
                        alert('Đã copy mã nguồn HTML Email vào Clipboard để gửi thủ công!');
                      }
                    }}
                  >
                    Copy Mã nguồn HTML
                  </button>
                  <button type="button" className="btn-save" onClick={() => { setShowEmailPreviewModal(false); setActivePreviewOrderId(null); }}>Đóng Bản Xem Trước</button>
                </>
              ) : (
                <>
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    onClick={() => { setShowEmailPreviewModal(false); setActivePreviewOrderId(null); }}
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="button" 
                    className="btn-save" 
                    style={{ backgroundColor: '#0071E3' }}
                    onClick={() => activePreviewOrderId && handleSendEmailReminder(activePreviewOrderId, true)}
                    disabled={isSendingEmailId === activePreviewOrderId}
                  >
                    {isSendingEmailId === activePreviewOrderId ? 'Đang gửi email thực tế...' : 'Xác Nhận Gửi Email'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT ĐƠN HÀNG (APPLE RECEIPT STYLE) */}
      {viewingOrder && (
        <div className="modal-overlay" onClick={() => {
          setViewingOrder(null);
          window.history.pushState({}, '', window.location.pathname);
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '95vw' }}>
            <div className="modal-header" style={{ borderBottom: '1px dashed var(--border-color)', paddingBottom: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CHI TIẾT HÓA ĐƠN GIAO DỊCH</span>
                <h2 style={{ margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiPackage style={{ color: '#0071E3' }} /> #{viewingOrder._id.substring(viewingOrder._id.length - 6).toUpperCase()}
                </h2>
              </div>
              <button onClick={() => {
                setViewingOrder(null);
                window.history.pushState({}, '', window.location.pathname);
              }} className="modal-close-btn">&times;</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1.5rem 0' }}>
              {/* Thông tin khách hàng */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#FAFBFD', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-dark)', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FiUser style={{ color: '#30D158' }} /> Thông Tin Khách Hàng
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <div>Tên khách hàng: <strong>{viewingOrder.customer_id?.name || 'Khách hàng lẻ'}</strong></div>
                    <div>Số điện thoại: <strong>{viewingOrder.customer_id?.phone || 'N/A'}</strong></div>
                    <div style={{ gridColumn: 'span 2' }}>Email: <strong>{viewingOrder.customer_id?.email || 'N/A'}</strong></div>
                    <div>Nguồn khách: <span className="source-badge source-khac" style={{ minWidth: 'auto', padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>{viewingOrder.customer_id?.source || 'N/A'}</span></div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#FAFBFD', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>NGÀY TẠO ĐƠN</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '4px 0 8px 0', color: 'var(--text-dark)' }}>
                    {new Date(viewingOrder.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                  <div>Trạng thái: <span className={`badge badge-${viewingOrder.status === 'paid' ? 'success' : 'pending'}`} style={{ fontSize: '0.8rem' }}>{viewingOrder.status === 'paid' ? 'Đã Thanh Toán' : 'Chờ Thanh Toán'}</span></div>
                </div>
              </div>

              {/* Chi tiết tài nguyên giao nhận */}
              <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-dark)', fontSize: '0.95rem', fontWeight: 600 }}>Danh Sách Tài Nguyên MMO Bàn Giao</h4>
              <div className="table-container" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                <table className="styled-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Sản phẩm / Dịch vụ</th>
                      <th>Chi tiết Đăng Nhập & Bàn Giao</th>
                      <th style={{ textAlign: 'right' }}>Giá Vốn gốc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingOrder.accounts && viewingOrder.accounts.length > 0 ? (
                      viewingOrder.accounts.map((acc: any, idx: number) => {
                        const details = acc.account_details || {};
                        const isClientUpgrade = !details.password_acc || details.password_acc === '';
                        return (
                          <tr key={acc._id || idx}>
                            <td>
                              <strong style={{ color: 'var(--primary-color)' }}>{acc.product_type}</strong>
                              {acc.valid_until && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                                  Hạn dùng: {new Date(acc.valid_until).toLocaleDateString('vi-VN')}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.85rem' }}>
                                {details.username && (
                                  <div>Username: <strong>{details.username}</strong></div>
                                )}
                                {!isClientUpgrade && details.password_acc && (
                                  <div>Password: <code>{details.password_acc}</code></div>
                                )}
                                {details.license_key && (
                                  <div>Key: <code>{details.license_key}</code></div>
                                )}
                                {isClientUpgrade && (
                                  <span style={{ color: '#D84315', fontWeight: 600, fontSize: '0.75rem', marginTop: '2px' }}>
                                    ⚡ Nâng cấp trực tiếp trên TK khách
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-light)' }}>
                              {(acc.cost || 0).toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic' }}>Không có chi tiết tài khoản</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Phân tích Doanh Thu & Lợi Nhuận (Premium Widget) */}
              <div style={{ backgroundColor: '#F5F5F7', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-dark)', fontSize: '0.95rem', fontWeight: 600 }}>Phân Tích Lợi Nhuận Đơn Hàng</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                  <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600 }}>TỔNG DOANH THU</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: '#0071E3' }}>
                      {viewingOrder.total_amount.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600 }}>TỔNG GIÁ VỐN</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: '#8E8E93' }}>
                      {(viewingOrder.accounts?.reduce((acc: number, item: any) => acc + (item.cost || 0), 0) || 0).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600 }}>LỢI NHUẬN RÒNG</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: '#30D158' }}>
                      {(viewingOrder.total_amount - (viewingOrder.accounts?.reduce((acc: number, item: any) => acc + (item.cost || 0), 0) || 0)).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600 }}>TỶ SUẤT LỢI NHUẬN</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: '#BF5AF2' }}>
                      {viewingOrder.total_amount > 0 ? (
                        ((viewingOrder.total_amount - (viewingOrder.accounts?.reduce((acc: number, item: any) => acc + (item.cost || 0), 0) || 0)) / viewingOrder.total_amount * 100).toFixed(1)
                      ) : '0'} %
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn-cancel" 
                style={{ backgroundColor: '#F5F5F7', color: 'var(--text-dark)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                onClick={() => {
                  setViewingOrder(null);
                  window.history.pushState({}, '', window.location.pathname);
                }}
              >
                Đóng
              </button>
              <button 
                type="button" 
                className="btn-save" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                onClick={() => {
                  setViewingOrder(null);
                  handleSendEmailReminder(viewingOrder._id);
                }}
              >
                <FiMail /> Gửi Hóa Đơn / Nhắc Nợ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BanHang;