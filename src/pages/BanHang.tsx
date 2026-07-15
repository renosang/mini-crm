import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  FiShoppingCart, FiPlus, FiTrash2, FiUser, FiCreditCard,
  FiPackage, FiSearch, FiCalendar, FiCheckCircle, FiClock,
  FiXCircle, FiPlusCircle, FiMail, FiInfo, FiTag, FiShoppingBag
} from 'react-icons/fi';
import { useNotification } from '../contexts/NotificationContext.tsx';

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
  product_id?: any;
  account_details?: {
    username?: string;
    password_acc?: string;
    license_key?: string;
    pin?: string;
  };
  cost: number;
  status: string;
  resource_type?: string;
  used_slots?: number;
  total_slots?: number;
}

interface IProduct {
  _id: string;
  name: string;
  productType?: string;
  packages: Array<{
    _id: string;
    name: string;
    price: number;
    durationDays: number;
  }>;
}

interface IOrder {
  _id: string;
  customer_id: ICustomer | null;
  accounts: IAccount[];
  items?: Array<{
    product_id: any;
    package_id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  product_name?: string;
  quantity?: number;
  cost_price?: number;
  selling_price?: number;
  expiry_date?: string | null;
  recurring_invoice?: {
    enabled: boolean;
    interval_months: number;
    custom_interval: string;
  };
  discount_code?: string;
  discount_reason?: string;
  discount_amount?: number;
  total_amount: number;
  payment_method?: string;
  customer_note?: string;
  internal_note?: string;
  status: 'paid' | 'pending' | 'cancelled';
  createdAt: string;
}

// === COMPONENT TRANG BÁN HÀNG ===
const BanHang: React.FC = () => {
  const { showNotification } = useNotification();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
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

  // === NEW: Fields cho modal đơn giản ===
  const [productName, setProductName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [recurringEnabled, setRecurringEnabled] = useState<boolean>(false);
  const [recurringInterval, setRecurringInterval] = useState<string>('1');
  const [recurringCustom, setRecurringCustom] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [customerNote, setCustomerNote] = useState<string>('');
  const [internalNote, setInternalNote] = useState<string>('');

  const [orderStatus, setOrderStatus] = useState<'paid' | 'pending'>('paid');

  // States gửi Email nhắc nợ / gia hạn
  const [isSendingEmailId, setIsSendingEmailId] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<{ recipient: string, subject: string, previewHtml: string, isSimulation?: boolean } | null>(null);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState<boolean>(false);
  const [activePreviewOrderId, setActivePreviewOrderId] = useState<string | null>(null);

  // Load tất cả dữ liệu
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [resOrders, resCustomers, resProducts] = await Promise.all([
        api.get<{ success: boolean, data: IOrder[] }>('/orders'),
        api.get<{ success: boolean, data: ICustomer[] }>('/customers'),
        api.get<{ success: boolean, data: IProduct[] }>('/products')
      ]);

      if (resOrders.data.success) setOrders(resOrders.data.data);
      if (resCustomers.data.success) setCustomers(resCustomers.data.data);
      if (resProducts.data.success) setProducts(resProducts.data.data);
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

  // Tự động mở modal nếu được chuyển hướng từ trang khác với state openCreateModal
  useEffect(() => {
    if (location.state && (location.state as any).openCreateModal) {
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
      showNotification('Không thể tạo nhanh khách hàng.', 'error');
    }
  };

  // Tính tổng tiền
  const getFinalTotal = () => {
    const sell = Number(sellingPrice) || 0;
    const qty = quantity || 1;
    const disc = Number(discountAmount) || 0;
    return Math.max(0, sell * qty - disc);
  };

  // Reset form
  const resetForm = () => {
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setProductName('');
    setQuantity(1);
    setCostPrice('');
    setSellingPrice('');
    setExpiryDate('');
    setRecurringEnabled(false);
    setRecurringInterval('1');
    setRecurringCustom('');
    setDiscountAmount('');
    setPaymentMethod('');
    setCustomerNote('');
    setInternalNote('');
    setOrderStatus('paid');
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      showNotification('Vui lòng chọn khách hàng.', 'warning');
      return;
    }

    if (!productName.trim()) {
      showNotification('Vui lòng nhập tên sản phẩm.', 'warning');
      return;
    }

    if (!sellingPrice || Number(sellingPrice) <= 0) {
      showNotification('Vui lòng nhập giá bán hợp lệ.', 'warning');
      return;
    }

    try {
      const reqBody: any = {
        customer_id: selectedCustomerId,
        status: orderStatus,
        product_name: productName,
        quantity: quantity,
        cost_price: Number(costPrice) || 0,
        selling_price: Number(sellingPrice),
        expiry_date: expiryDate || null,
        recurring_invoice: {
          enabled: recurringEnabled,
          interval_months: recurringCustom ? 0 : Number(recurringInterval),
          custom_interval: recurringCustom || '',
        },
        discount_amount: Number(discountAmount) || 0,
        payment_method: paymentMethod,
        customer_note: customerNote,
        internal_note: internalNote,
        total_amount: getFinalTotal(),
      };

      const res = await api.post<{ success: boolean }>('/orders', reqBody);
      if (res.data.success) {
        setIsModalOpen(false);
        resetForm();
        await loadAllData();
      }
    } catch (err: any) {
      showNotification('Lỗi tạo đơn hàng: ' + (err.response?.data?.message || err.message), 'error');
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
      showNotification('Không thể xóa đơn hàng.', 'error');
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
          setActivePreviewOrderId(orderId);
          setEmailPreview({
            recipient: res.data.recipient || '',
            subject: res.data.subject || '',
            previewHtml: res.data.previewHtml || '',
            isSimulation: false
          });
          setShowEmailPreviewModal(true);
        } else if (res.data.mode === 'simulation' && res.data.previewHtml) {
          setActivePreviewOrderId(orderId);
          setEmailPreview({
            recipient: res.data.recipient || '',
            subject: res.data.subject || '',
            previewHtml: res.data.previewHtml || '',
            isSimulation: true
          });
          setShowEmailPreviewModal(true);
        } else {
          showNotification(res.data.message, 'success');
          setShowEmailPreviewModal(false);
          setEmailPreview(null);
          setActivePreviewOrderId(null);
        }
      }
    } catch (err: any) {
      showNotification('Lỗi gửi email: ' + (err.response?.data?.message || err.message), 'error');
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

  // Helper: hiển thị tên sản phẩm trong bảng
  const getOrderProductDisplay = (order: IOrder) => {
    if (order.product_name) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {order.product_name} <span style={{ color: '#8E8E93' }}>x{order.quantity || 1}</span>
          </span>
          {order.discount_amount && order.discount_amount > 0 ? (
            <span style={{ color: 'var(--primary-color)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <FiTag size={12} /> Giảm giá: -{order.discount_amount.toLocaleString('vi-VN')} đ
            </span>
          ) : null}
        </div>
      );
    }

    if (order.items && order.items.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {order.items.map((it, idx) => (
            <span key={idx} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {it.name} <span style={{ color: '#8E8E93' }}>x{it.quantity}</span>
            </span>
          ))}
          {order.discount_amount && order.discount_amount > 0 ? (
            <span style={{ color: 'var(--primary-color)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <FiTag size={12} /> Giảm giá: -{order.discount_amount.toLocaleString('vi-VN')} đ
              {order.discount_reason && ` (${order.discount_reason})`}
            </span>
          ) : null}
        </div>
      );
    }

    return (
      <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>
        Đơn nhập tay trực tiếp
        {order.discount_amount && order.discount_amount > 0 ? ` (Giảm -${order.discount_amount.toLocaleString('vi-VN')}đ)` : ''}
      </span>
    );
  };

  // Helper: payment method label
  const paymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'bank_transfer': return 'Chuyển khoản';
      case 'cash': return 'Tiền mặt';
      default: return '';
    }
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
        <div className="stat-card widget stat-card-green">
          <div className="stat-card-icon"><FiCreditCard /></div>
          <div className="stat-card-info">
            <h3>Doanh Thu Đã Nhận</h3>
            <p className="stat-card-value">{stats.totalRevenue.toLocaleString('vi-VN')} đ</p>
          </div>
        </div>
        <div className="stat-card widget stat-card-blue">
          <div className="stat-card-icon"><FiShoppingCart /></div>
          <div className="stat-card-info">
            <h3>Tổng Số Đơn Bán</h3>
            <p className="stat-card-value">{stats.totalOrders} đơn</p>
          </div>
        </div>
        <div className="stat-card widget stat-card-orange">
          <div className="stat-card-icon"><FiClock /></div>
          <div className="stat-card-info">
            <h3>Dư Nợ Chưa Thu</h3>
            <p className="stat-card-value">{stats.pendingPayments.toLocaleString('vi-VN')} đ</p>
          </div>
        </div>
        <div className="stat-card widget stat-card-purple">
          <div className="stat-card-icon"><FiPackage /></div>
          <div className="stat-card-info">
            <h3>Tài Khoản Đã Bán</h3>
            <p className="stat-card-value">{stats.accountsSold} tài nguyên</p>
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
                <th className="nowrap">Mã Đơn</th>
                <th className="nowrap">Khách Hàng</th>
                <th className="nowrap">Chi tiết Gói đã mua</th>
                <th className="nowrap">Hình thức TT</th>
                <th className="nowrap">Số tiền</th>
                <th className="nowrap">Thanh Toán</th>
                <th className="nowrap">Ngày Bàn Giao</th>
                <th className="nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map(order => (
                  <tr key={order._id}>
                    <td className="nowrap">
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
                        title="Xem hóa đơn đơn hàng"
                      >
                        #{order._id.substring(order._id.length - 6).toUpperCase()}
                      </button>
                    </td>
                    <td className="nowrap">
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
                    <td className="nowrap">
                      {getOrderProductDisplay(order)}
                    </td>
                    <td className="nowrap">
                      {paymentMethodLabel(order.payment_method) || (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                    <td className="nowrap" style={{ fontWeight: 700, color: '#1D1D1F' }}>
                      {order.total_amount.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="nowrap">
                      {order.status === 'paid' ? (
                        <span className="payment-status-paid">
                          <FiCheckCircle /> Đã Thu
                        </span>
                      ) : (
                        <span className="payment-status-pending">
                          <FiClock /> Dư Nợ
                        </span>
                      )}
                    </td>
                    <td className="nowrap">
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                        <FiCalendar style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="nowrap">
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
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-light)' }}>
                    Chưa có đơn hàng bán ra nào được tạo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL TẠO ĐƠN HÀNG MỚI — TRỰC QUAN & CHUYÊN NGHIỆP */}
      {/* ================================================================ */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '960px', maxWidth: '97vw' }}>
            <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid #EEEEEF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #0071E3, #005BB5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiShoppingCart style={{ color: '#FFF', fontSize: '1.1rem' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Tạo Đơn Hàng Mới</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-light)' }}>Điền thông tin đơn hàng bên dưới</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="modal-close-btn">&times;</button>
            </div>

            <form onSubmit={handleOrderSubmit}>
              <div className="modal-body" style={{ maxHeight: '62vh', overflowY: 'auto', padding: '1.5rem 0', display: 'flex', gap: '1.5rem' }}>

                {/* ==== CỘT TRÁI: THÔNG TIN SẢN PHẨM ==== */}
                <div style={{ flex: 1, minWidth: 0 }}>

                  {/* ── Card: Khách hàng ── */}
                  <div style={{ background: '#F8F9FC', borderRadius: 14, padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid #EEEEEF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: '#30D158', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiUser style={{ color: '#FFF', fontSize: '0.75rem' }} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Khách hàng</span>
                      <button type="button" onClick={() => setShowQuickCustomerForm(!showQuickCustomerForm)}
                        style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#0071E3', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <FiPlus size={14} /> Tạo nhanh
                      </button>
                    </div>
                    {showQuickCustomerForm && (
                      <div style={{ background: '#FFF', padding: '0.85rem', borderRadius: 10, border: '1px solid #D2D2D7', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                        <input type="text" placeholder="Họ và Tên" value={quickCustomerName} onChange={e => setQuickCustomerName(e.target.value)}
                          style={{ flex: 1, padding: '0.45rem 0.65rem', borderRadius: 7, border: '1px solid #D2D2D7', fontSize: '0.85rem' }} />
                        <input type="text" placeholder="SĐT" value={quickCustomerPhone} onChange={e => setQuickCustomerPhone(e.target.value)}
                          style={{ flex: 1, padding: '0.45rem 0.65rem', borderRadius: 7, border: '1px solid #D2D2D7', fontSize: '0.85rem' }} />
                        <button type="button" className="btn-save" onClick={handleQuickCustomerSubmit}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', width: 'auto', whiteSpace: 'nowrap' }}>Lưu</button>
                      </div>
                    )}
                    <div style={{ position: 'relative' }}>
                      <FiSearch style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-light)' }} />
                      <input type="text" id="customer-search" placeholder="Tìm tên hoặc SĐT..."
                        value={customerSearchQuery}
                        onChange={(e) => { setCustomerSearchQuery(e.target.value); setShowCustomerDropdown(true); }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        style={{ paddingLeft: 35, padding: '0.55rem 0.75rem 0.55rem 35px', borderRadius: 9, border: '1px solid #D2D2D7', width: '100%', fontSize: '0.88rem' }} />
                      {showCustomerDropdown && customerSearchQuery.trim() !== '' && (
                        <div style={{ position: 'absolute', width: '100%', zIndex: 100, border: '1px solid #DDD', top: '100%', left: 0, background: '#FFF', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.12)', maxHeight: 170, overflowY: 'auto' }}>
                          {filteredCustomers.length > 0 ? filteredCustomers.map(cust => (
                            <div key={cust._id} onClick={() => { setSelectedCustomerId(cust._id); setCustomerSearchQuery(cust.name); setShowCustomerDropdown(false); }}
                              style={{ padding: '0.55rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F5F5F7' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{cust.name}</span>
                              <span style={{ fontSize: '0.78rem', color: '#8E8E93' }}>{cust.phone || cust.email || '—'}</span>
                            </div>
                          )) : (
                            <div style={{ padding: '0.75rem 1rem', color: '#8E8E93', fontSize: '0.85rem', fontStyle: 'italic' }}>Không tìm thấy</div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedCustomerId && (
                      <div style={{ marginTop: '0.65rem', padding: '0.45rem 0.85rem', background: 'linear-gradient(135deg, #EBF5FF, #D6EAFF)', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, color: '#0071E3', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiUser size={14} /> {customers.find(c => c._id === selectedCustomerId)?.name || 'Đã chọn'}
                      </div>
                    )}
                  </div>

                  {/* ── Card: Sản phẩm ── */}
                  <div style={{ background: '#F8F9FC', borderRadius: 14, padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid #EEEEEF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: '#0071E3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiShoppingBag style={{ color: '#FFF', fontSize: '0.75rem' }} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Sản phẩm</span>
                    </div>
                    <input type="text" id="product-name" placeholder="Nhập tên sản phẩm..."
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      style={{ padding: '0.6rem 0.85rem', borderRadius: 9, border: '1px solid #D2D2D7', width: '100%', fontSize: '0.9rem', marginBottom: '0.85rem' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6E6E73', display: 'block', marginBottom: 4 }}>Số lượng</label>
                        <div style={{ display: 'flex', alignItems: 'center', borderRadius: 9, border: '1px solid #D2D2D7', background: '#FFF', overflow: 'hidden' }}>
                          <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            style={{ border: 'none', background: 'none', padding: '0.5rem 0.65rem', cursor: 'pointer', color: '#8E8E93', fontSize: '1rem', fontWeight: 600 }}>−</button>
                          <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', minWidth: 40 }}>{quantity}</span>
                          <button type="button" onClick={() => setQuantity(quantity + 1)}
                            style={{ border: 'none', background: 'none', padding: '0.5rem 0.65rem', cursor: 'pointer', color: '#0071E3', fontSize: '1rem', fontWeight: 600 }}>+</button>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6E6E73', display: 'block', marginBottom: 4 }}>Giá gốc</label>
                        <div style={{ position: 'relative' }}>
                          <input type="number" id="cost-price" placeholder="0" value={costPrice} onChange={e => setCostPrice(e.target.value)} min={0}
                            style={{ padding: '0.6rem 0.75rem 0.6rem 1.8rem', borderRadius: 9, border: '1px solid #D2D2D7', width: '100%', fontSize: '0.88rem' }} />
                          <span style={{ position: 'absolute', left: 10, top: 10, fontSize: '0.78rem', color: '#8E8E93', fontWeight: 600 }}>đ</span>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6E6E73', display: 'block', marginBottom: 4 }}>Giá bán <span style={{ color: '#FF3B30' }}>*</span></label>
                        <div style={{ position: 'relative' }}>
                          <input type="number" id="selling-price" placeholder="0" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} min={0} required
                            style={{ padding: '0.6rem 0.75rem 0.6rem 1.8rem', borderRadius: 9, border: '1px solid #D2D2D7', width: '100%', fontSize: '0.88rem', background: '#FFFEF5' }} />
                          <span style={{ position: 'absolute', left: 10, top: 10, fontSize: '0.78rem', color: '#8E8E93', fontWeight: 600 }}>đ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Card: Hạn sử dụng & Định kỳ ── */}
                  <div style={{ background: '#F8F9FC', borderRadius: 14, padding: '1.25rem', border: '1px solid #EEEEEF', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: '#FF9500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiCalendar style={{ color: '#FFF', fontSize: '0.75rem' }} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Thời hạn & Định kỳ</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6E6E73', display: 'block', marginBottom: 4 }}>Hạn sử dụng</label>
                        <input type="date" id="expiry-date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                          style={{ padding: '0.55rem 0.75rem', borderRadius: 9, border: '1px solid #D2D2D7', width: '100%', fontSize: '0.88rem' }} />
                      </div>
                      <div style={{ flex: 2, minWidth: 200 }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6E6E73', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 4 }}>
                          <input type="checkbox" checked={recurringEnabled} onChange={e => setRecurringEnabled(e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0071E3' }} />
                          Gửi hóa đơn định kỳ
                        </label>
                        {recurringEnabled && (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select value={recurringCustom ? 'custom' : recurringInterval}
                              onChange={e => { const v = e.target.value; if (v === 'custom') { setRecurringCustom(''); setRecurringInterval('custom'); } else { setRecurringCustom(''); setRecurringInterval(v); } }}
                              style={{ padding: '0.5rem 0.65rem', borderRadius: 9, border: '1px solid #D2D2D7', fontSize: '0.85rem', minWidth: 110 }}>
                              <option value="1">1 tháng</option>
                              <option value="2">2 tháng</option>
                              <option value="3">3 tháng</option>
                              <option value="6">6 tháng</option>
                              <option value="12">12 tháng</option>
                              <option value="custom">Tùy chỉnh...</option>
                            </select>
                            {recurringInterval === 'custom' && (
                              <input type="text" placeholder="Ví dụ: 2 tuần..." value={recurringCustom} onChange={e => setRecurringCustom(e.target.value)}
                                style={{ padding: '0.5rem 0.65rem', borderRadius: 9, border: '1px solid #D2D2D7', flex: 1, fontSize: '0.85rem' }} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==== CỘT PHẢI: THANH TOÁN & GHI CHÚ ==== */}
                <div style={{ width: 340, minWidth: 280, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* ── Tóm tắt đơn hàng ── */}
                  <div style={{ background: 'linear-gradient(135deg, #1D1D1F 0%, #2C2C2E 100%)', borderRadius: 16, padding: '1.35rem 1.25rem', color: '#FFF', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                      <FiCreditCard style={{ fontSize: '1rem' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Tóm tắt đơn hàng</span>
                    </div>

                    {/* Tạm tính rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.88rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#AEAEB2' }}>
                        <span>{productName || 'Sản phẩm'} x{quantity}</span>
                        <span style={{ color: '#C7C7CC' }}>{((Number(sellingPrice) || 0) * quantity).toLocaleString('vi-VN')} đ</span>
                      </div>
                      {Number(costPrice) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8E8E93' }}>
                          <span>Giá vốn</span>
                          <span>{(Number(costPrice) * quantity).toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      {Number(discountAmount) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FF6B6B' }}>
                          <span>Giảm giá</span>
                          <span>−{Number(discountAmount).toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '0.25rem 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.2rem' }}>
                        <span>Tổng cộng</span>
                        <span>{getFinalTotal().toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Giảm giá + Thanh toán + Trạng thái ── */}
                  <div style={{ background: '#F8F9FC', borderRadius: 14, padding: '1.25rem', border: '1px solid #EEEEEF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: '#5856D6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiTag style={{ color: '#FFF', fontSize: '0.75rem' }} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Thanh toán</span>
                    </div>
                    <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                      <span style={{ position: 'absolute', left: 10, top: 10, fontSize: '0.78rem', color: '#8E8E93', fontWeight: 600 }}>đ</span>
                      <input type="number" id="discount-amount" placeholder="Giảm giá" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} min={0}
                        style={{ padding: '0.55rem 0.75rem 0.55rem 1.6rem', borderRadius: 9, border: '1px solid #D2D2D7', width: '100%', fontSize: '0.88rem', marginBottom: '0.65rem' }} />
                    </div>
                    <select id="payment-method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                      style={{ padding: '0.55rem 0.75rem', borderRadius: 9, border: '1px solid #D2D2D7', width: '100%', fontSize: '0.88rem', marginBottom: '0.65rem', background: '#FFF' }}>
                      <option value="">Chọn hình thức thanh toán</option>
                      <option value="bank_transfer">🏦 Chuyển khoản ngân hàng</option>
                      <option value="cash">💵 Tiền mặt</option>
                    </select>
                    <select id="order-status-field" value={orderStatus} onChange={e => setOrderStatus(e.target.value as any)}
                      style={{ padding: '0.55rem 0.75rem', borderRadius: 9, border: '1px solid #D2D2D7', width: '100%', fontSize: '0.88rem', background: orderStatus === 'paid' ? '#EBF9EB' : '#FFF8E7' }}>
                      <option value="paid">✅ Đã thu tiền — Cấp phát ngay</option>
                      <option value="pending">⏳ Dư nợ / Thu sau</option>
                    </select>
                  </div>

                  {/* ── Ghi chú ── */}
                  <div style={{ background: '#F8F9FC', borderRadius: 14, padding: '1.25rem', border: '1px solid #EEEEEF', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: '#8E8E93', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiInfo style={{ color: '#FFF', fontSize: '0.75rem' }} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Ghi chú</span>
                    </div>
                    <textarea id="customer-note" rows={2} placeholder="Note hiển thị với khách hàng..." value={customerNote} onChange={e => setCustomerNote(e.target.value)}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: 9, border: '1px solid #D2D2D7', width: '100%', fontSize: '0.85rem', resize: 'vertical', marginBottom: '0.6rem' }} />
                    <textarea id="internal-note" rows={2} placeholder="Note nội bộ (không hiển thị)..." value={internalNote} onChange={e => setInternalNote(e.target.value)}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: 9, border: '1px solid #D2D2D7', width: '100%', fontSize: '0.85rem', resize: 'vertical', background: '#FFFEF5' }} />
                  </div>
                </div>

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #EEEEEF', paddingTop: '1rem' }}>
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
                <button type="submit" className="btn-save" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}>
                  <FiCheckCircle /> Hoàn tất & Tạo Đơn
                </button>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#FAFBFD', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-dark)', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FiUser style={{ color: '#30D158' }} /> Thông Tin Khách Hàng
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '2px' }}>Tên khách hàng</div>
                      <strong style={{ color: 'var(--text-dark)' }}>{viewingOrder.customer_id?.name || 'Khách hàng lẻ'}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '2px' }}>Số điện thoại</div>
                      <strong style={{ color: 'var(--text-dark)' }}>{viewingOrder.customer_id?.phone || 'N/A'}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '2px' }}>Email</div>
                      <strong style={{ color: 'var(--text-dark)', wordBreak: 'break-all' }}>{viewingOrder.customer_id?.email || 'N/A'}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '2px' }}>Nguồn khách</div>
                      <span className="source-badge source-khac" style={{ minWidth: 'auto', padding: '0.1rem 0.5rem', fontSize: '0.75rem', display: 'inline-block' }}>{viewingOrder.customer_id?.source || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#FAFBFD', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>NGÀY TẠO ĐƠN</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '4px 0 8px 0', color: 'var(--text-dark)' }}>
                    {new Date(viewingOrder.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Trạng thái:
                    <span className={`badge badge-${viewingOrder.status === 'paid' ? 'success' : 'pending'}`} style={{ fontSize: '0.8rem' }}>
                      {viewingOrder.status === 'paid' ? 'Đã Thanh Toán' : 'Chờ Thanh Toán'}
                    </span>
                  </div>
                  {viewingOrder.payment_method && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dark)', marginTop: '6px' }}>
                      Hình thức: <strong>{paymentMethodLabel(viewingOrder.payment_method)}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Chi tiết đơn hàng (sản phẩm tùy chỉnh) */}
              {viewingOrder.product_name && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-dark)', fontSize: '0.95rem', fontWeight: 600 }}>Chi Tiết Sản Phẩm</h4>
                  <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                    <table className="styled-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>Số lượng</th>
                          <th>Giá gốc</th>
                          <th>Giá bán</th>
                          <th style={{ textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong style={{ color: 'var(--text-dark)' }}>{viewingOrder.product_name}</strong></td>
                          <td>{viewingOrder.quantity || 1}</td>
                          <td>{(viewingOrder.cost_price || 0).toLocaleString('vi-VN')} đ</td>
                          <td>{(viewingOrder.selling_price || 0).toLocaleString('vi-VN')} đ</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-color)' }}>
                            {((viewingOrder.selling_price || 0) * (viewingOrder.quantity || 1)).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Chi tiết đơn hàng (Items cũ) */}
              {!viewingOrder.product_name && viewingOrder.items && viewingOrder.items.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-dark)', fontSize: '0.95rem', fontWeight: 600 }}>Chi Tiết Gói Dịch Vụ MMO đã chọn mua</h4>
                  <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                    <table className="styled-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Mặt hàng</th>
                          <th>Giá gói</th>
                          <th>Số lượng</th>
                          <th style={{ textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewingOrder.items || []).map((it: any, idx: number) => (
                          <tr key={idx}>
                            <td><strong style={{ color: 'var(--text-dark)' }}>{it.name}</strong></td>
                            <td>{it.price.toLocaleString('vi-VN')} đ</td>
                            <td>{it.quantity}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-color)' }}>
                              {(it.price * it.quantity).toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Thông tin bổ sung từ modal đơn giản */}
              {viewingOrder.product_name && (
                <div style={{ backgroundColor: '#FAFBFD', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                  {viewingOrder.expiry_date && (
                    <div>
                      <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '2px' }}>Hạn sử dụng</div>
                      <strong>{new Date(viewingOrder.expiry_date).toLocaleDateString('vi-VN')}</strong>
                    </div>
                  )}
                  {viewingOrder.recurring_invoice?.enabled && (
                    <div>
                      <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '2px' }}>Hóa đơn định kỳ</div>
                      <strong>
                        {viewingOrder.recurring_invoice.custom_interval
                          ? viewingOrder.recurring_invoice.custom_interval
                          : `Mỗi ${viewingOrder.recurring_invoice.interval_months} tháng`}
                      </strong>
                    </div>
                  )}
                  {viewingOrder.customer_note && (
                    <div>
                      <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '2px' }}>Note khách hàng</div>
                      <span style={{ color: 'var(--text-dark)', fontStyle: 'italic' }}>{viewingOrder.customer_note}</span>
                    </div>
                  )}
                  {viewingOrder.internal_note && (
                    <div>
                      <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '2px' }}>Note nội bộ</div>
                      <span style={{ color: '#D84315' }}>{viewingOrder.internal_note}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Chi tiết tài nguyên giao nhận */}
              <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-dark)', fontSize: '0.95rem', fontWeight: 600 }}>Danh Sách Tài Nguyên MMO Bàn Giao (Hệ thống cấp phát)</h4>
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
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#1D1D1F', fontSize: '0.95rem' }}>
                              {(acc.cost || 0).toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic' }}>Chờ thanh toán thành công để cấp phát tài nguyên tự động.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Phân tích Doanh Thu & Lợi Nhuận (Premium Widget) */}
              <div style={{ backgroundColor: '#FAFBFD', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-dark)', fontSize: '0.95rem', fontWeight: 600 }}>Phân Tích Chi Tiết Thanh Toán & Lợi Nhuận</h4>

                {/* Coupon or manual discount breakdown */}
                {(viewingOrder.discount_code || (viewingOrder.discount_amount && viewingOrder.discount_amount > 0)) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px dashed #DDD', paddingBottom: '0.75rem' }}>
                    {viewingOrder.discount_code && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Mã giảm giá đã áp dụng:</span>
                        <strong style={{ color: 'var(--primary-color)' }}>{viewingOrder.discount_code}</strong>
                      </div>
                    )}
                    {viewingOrder.discount_reason && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Lý do giảm giá:</span>
                        <strong style={{ color: '#555' }}>{viewingOrder.discount_reason}</strong>
                      </div>
                    )}
                    {viewingOrder.discount_amount && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D32F2F' }}>
                        <span>Tổng tiền được giảm:</span>
                        <strong>-{viewingOrder.discount_amount.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                  <div className="profit-card-blue" style={{ padding: '0.75rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>TỔNG DOANH THU</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                      {viewingOrder.total_amount.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div className="profit-card-gray" style={{ padding: '0.75rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>TỔNG GIÁ VỐN</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                      {(viewingOrder.accounts?.reduce((acc: number, item: any) => acc + (item.cost || 0), 0) || 0).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div className="profit-card-green" style={{ padding: '0.75rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>LỢI NHUẬN RÒNG</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                      {(viewingOrder.total_amount - (viewingOrder.accounts?.reduce((acc: number, item: any) => acc + (item.cost || 0), 0) || 0)).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div className="profit-card-purple" style={{ padding: '0.75rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>TỶ SUẤT LỢI NHUẬN</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
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