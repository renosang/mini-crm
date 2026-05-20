import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  FiClock, FiAlertTriangle, FiCheckCircle, FiUsers, 
  FiCalendar, FiMail, FiRefreshCw, FiSearch, FiSliders,
  FiSend, FiMessageCircle, FiFacebook, FiInfo, FiExternalLink
} from 'react-icons/fi';

interface ICustomer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  facebook?: string;
  telegram?: string;
  zalo?: string;
  status: string;
}

interface IAccount {
  _id: string;
  product_type: string;
  resource_type?: 'id_pass' | 'key' | 'slot';
  account_details?: {
    username?: string;
    password_acc?: string;
    license_key?: string;
    pin?: string;
  };
  cost: number;
  status: 'available' | 'sold' | 'expired' | 'banned';
  valid_until?: string;
  customer_id?: ICustomer | null;
  total_slots?: number;
  used_slots?: number;
  slots_assigned?: Array<{
    customer_id?: ICustomer;
    assigned_email?: string;
    assigned_at?: string;
  }>;
}

interface IOrder {
  _id: string;
  customer_id?: ICustomer;
  accounts?: IAccount[];
  total_amount: number;
  status: string;
  order_date: string;
}

interface IFlattenedSub {
  id: string; // ID của Account
  accountObj: IAccount;
  customer: ICustomer;
  productType: string;
  resourceType: 'id_pass' | 'key' | 'slot';
  detailsText: string;
  cost: number;
  validUntil?: string;
  slotEmail?: string;
  parentAccountId: string;
}

const QuanLyGiaHan: React.FC = () => {
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('all'); // all, expired, soon, safe
  const [typeFilter, setTypeFilter] = useState<string>('all'); // all, id_pass, key, slot

  // Renewal Modal state
  const [selectedSub, setSelectedSub] = useState<IFlattenedSub | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState<boolean>(false);
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');
  const [renewStep, setRenewStep] = useState<'form' | 'confirm'>('form');
  const [renewalFee, setRenewalFee] = useState<number>(0);
  const [renewalNotes, setRenewalNotes] = useState<string>('');
  const [isRenewing, setIsRenewing] = useState<boolean>(false);
  
  // Email Preview Modal state
  const [previewEmailData, setPreviewEmailData] = useState<{
    recipient: string;
    subject: string;
    html: string;
    isSimulation?: boolean;
  } | null>(null);
  const [activePreviewSub, setActivePreviewSub] = useState<IFlattenedSub | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch both accounts and orders in parallel
      const [accountsRes, ordersRes] = await Promise.all([
        api.get<{ success: boolean; data: IAccount[] }>('/accounts'),
        api.get<{ success: boolean; data: IOrder[] }>('/orders')
      ]);

      if (accountsRes.data.success) {
        setAccounts(accountsRes.data.data);
      }
      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu gia hạn từ hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Biến đổi và "phẳng hóa" danh sách thuê bao gia hạn để quản lý trực quan
  const subscriptions: IFlattenedSub[] = [];

  accounts.forEach(acc => {
    // 1. Phân loại ID:Pass hoặc Key kích hoạt có gán khách hàng trực tiếp
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
      // 2. Phân loại Family/Team Slot (Có gán nhiều slot riêng lẻ)
      if (acc.slots_assigned && acc.slots_assigned.length > 0) {
        acc.slots_assigned.forEach(slot => {
          if (slot.customer_id) {
            subscriptions.push({
              id: `${acc._id}-${slot.customer_id._id}-${slot.assigned_email}`,
              accountObj: acc,
              customer: slot.customer_id,
              productType: `${acc.product_type} (Slot)`,
              resourceType: 'slot',
              detailsText: `Host: ${acc.account_details?.username || 'n/a'} | Slot: ${slot.assigned_email || 'n/a'}`,
              cost: Math.round(acc.cost / (acc.total_slots || 5)), // Giá tương đối chia theo số slot
              validUntil: acc.valid_until,
              slotEmail: slot.assigned_email,
              parentAccountId: acc._id
            });
          }
        });
      }
    }
  });

  // Tính toán thời gian hết hạn & phân bổ lớp CSS/Badges
  const getDaysRemaining = (validUntil?: string) => {
    if (!validUntil) return { days: Infinity, text: 'Không thời hạn', color: '#34C759', bg: '#EBF9EB', label: 'safe' };
    
    const expiry = new Date(validUntil);
    const today = new Date();
    // Đặt giờ về 0 để so sánh chính xác ngày
    expiry.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { days: diffDays, text: `Quá hạn ${Math.abs(diffDays)} ngày`, color: '#FF3B30', bg: '#FFEBEA', label: 'expired' };
    } else if (diffDays === 0) {
      return { days: 0, text: 'Hết hạn hôm nay', color: '#FF9500', bg: '#FFF3E0', label: 'today' };
    } else if (diffDays <= 7) {
      return { days: diffDays, text: `Còn ${diffDays} ngày`, color: '#FF9500', bg: '#FFF3E0', label: 'soon' };
    } else {
      return { days: diffDays, text: `Còn ${diffDays} ngày`, color: '#34C759', bg: '#EBF9EB', label: 'safe' };
    }
  };

  // Áp dụng tìm kiếm & bộ lọc
  const filteredSubs = subscriptions.filter(sub => {
    // 1. Bộ lọc tìm kiếm từ khóa
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      sub.customer.name.toLowerCase().includes(searchLower) ||
      (sub.customer.email && sub.customer.email.toLowerCase().includes(searchLower)) ||
      (sub.customer.telegram && sub.customer.telegram.toLowerCase().includes(searchLower)) ||
      (sub.customer.zalo && sub.customer.zalo.toLowerCase().includes(searchLower)) ||
      sub.productType.toLowerCase().includes(searchLower) ||
      sub.detailsText.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // 2. Bộ lọc thời hạn
    const expiryInfo = getDaysRemaining(sub.validUntil);
    if (timeFilter === 'expired' && expiryInfo.label !== 'expired') return false;
    if (timeFilter === 'soon' && expiryInfo.label !== 'soon' && expiryInfo.label !== 'today') return false;
    if (timeFilter === 'safe' && expiryInfo.label !== 'safe') return false;

    // 3. Bộ lọc phân loại tài nguyên
    if (typeFilter !== 'all' && sub.resourceType !== typeFilter) return false;

    return true;
  });

  // Tính toán số liệu thống kê cho Metrics Widget
  const stats = (() => {
    let expiredCount = 0;
    let soonCount = 0;
    let safeCount = 0;
    
    subscriptions.forEach(sub => {
      const exp = getDaysRemaining(sub.validUntil);
      if (exp.label === 'expired') expiredCount++;
      else if (exp.label === 'soon' || exp.label === 'today') soonCount++;
      else safeCount++;
    });

    return {
      expired: expiredCount,
      soon: soonCount,
      safe: safeCount,
      total: subscriptions.length
    };
  })();

  // Kích hoạt Modal Gia Hạn
  const openRenewModal = (sub: IFlattenedSub) => {
    setSelectedSub(sub);
    setNewExpiryDate(sub.validUntil ? sub.validUntil.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setRenewalFee(sub.cost || 0);
    setRenewalNotes('');
    setRenewStep('form');
    setIsRenewModalOpen(true);
  };

  // Các presets gia hạn nhanh của Apple UX
  const applyPreset = (months: number) => {
    if (!selectedSub) return;
    const baseDate = selectedSub.validUntil ? new Date(selectedSub.validUntil) : new Date();
    // Nếu tài nguyên đã hết hạn, tính từ hôm nay. Nếu còn hạn, cộng dồn tiếp.
    const startFrom = baseDate.getTime() > Date.now() ? baseDate : new Date();
    
    startFrom.setMonth(startFrom.getMonth() + months);
    setNewExpiryDate(startFrom.toISOString().substring(0, 10));
  };

  // Xác nhận gia hạn (POST lên DB)
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    if (renewStep === 'form') {
      setRenewStep('confirm');
      return;
    }

    try {
      setIsRenewing(true);
      const res = await api.post<{
        success: boolean;
        message: string;
        data: {
          account: any;
          order: any;
          emailResult: {
            mode: 'smtp' | 'simulation' | 'preview';
            previewHtml?: string;
            recipient?: string;
            subject?: string;
          };
        };
      }>(`/accounts/${selectedSub.parentAccountId}/renew`, {
        newExpiryDate,
        renewalFee,
        notes: renewalNotes
      });

      if (res.data.success) {
        setIsRenewModalOpen(false);
        setSelectedSub(null);
        await loadData();

        // Check if email result is a simulation / preview to display the mail
        const emailRes = res.data.data.emailResult;
        if (emailRes && (emailRes.mode === 'simulation' || emailRes.mode === 'preview')) {
          setActivePreviewSub(selectedSub);
          setPreviewEmailData({
            recipient: emailRes.recipient || selectedSub.customer.email || 'khachhang@gmail.com',
            subject: emailRes.subject || 'Thông báo gia hạn',
            html: emailRes.previewHtml || '',
            isSimulation: emailRes.mode === 'simulation'
          });
        } else {
          alert(`Gia hạn gói dịch vụ thành công đến ngày ${new Date(newExpiryDate).toLocaleDateString('vi-VN')} và đã gửi email hóa đơn!`);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Không thể cập nhật gia hạn dịch vụ.');
    } finally {
      setIsRenewing(false);
    }
  };

  // Kích hoạt Gửi email nhắc gia hạn tự động qua API
  const handleSendReminder = async (sub: IFlattenedSub, forceSend = false) => {
    // 1. Tìm đơn hàng tương ứng của tài khoản này
    const matchedOrder = orders.find(o => o.accounts?.some(acc => acc._id === sub.parentAccountId));
    
    try {
      setSendingEmailId(sub.id);
      
      let baseUrl = '';
      if (matchedOrder) {
        // Có đơn hàng -> gửi theo đơn hàng
        baseUrl = `/orders/send-reminder?id=${matchedOrder._id}`;
      } else {
        // Không có đơn hàng gốc -> gửi trực tiếp theo tài khoản & khách hàng
        baseUrl = `/orders/send-reminder?account_id=${sub.parentAccountId}&customer_id=${sub.customer._id}`;
      }

      // NẾU CHƯA FORCE SEND: gọi API ở chế độ xem trước (preview=true)
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
          // SMTP cấu hình thành công -> Mở modal xem trước trước khi bấm gửi thực tế
          setActivePreviewSub(sub);
          setPreviewEmailData({
            recipient: res.data.recipient || sub.customer.email || 'khachhang@gmail.com',
            subject: res.data.subject || 'Thông báo gia hạn',
            html: res.data.previewHtml || '',
            isSimulation: false
          });
        } else if (res.data.mode === 'simulation' && res.data.previewHtml) {
          // SMTP chưa cấu hình -> Mở modal xem trước hóa đơn phong cách Apple cực kỳ chuyên nghiệp
          setActivePreviewSub(sub);
          setPreviewEmailData({
            recipient: res.data.recipient || sub.customer.email || 'khachhang@gmail.com',
            subject: res.data.subject || 'Thông báo gia hạn',
            html: res.data.previewHtml,
            isSimulation: true
          });
        } else {
          // Đã gửi email thực tế thành công!
          alert(res.data.message);
          setPreviewEmailData(null);
          setActivePreviewSub(null);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Gửi email nhắc nhở thất bại. Có lỗi xảy ra.');
    } finally {
      setSendingEmailId(null);
    }
  };

  return (
    <div style={{ padding: '0 0.5rem' }}>
      
      {/* Tiêu đề Apple Style */}
      <div className="customer-detail-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="gradient-title">Quản Lý Gia Hạn Bản Quyền</h1>
        <p>Theo dõi hạn dùng dịch vụ, gửi nhắc nhở email hóa đơn và thực hiện gia hạn nhanh chóng cho khách hàng</p>
      </div>

      {/* Grid 4 Widgets Thống kê Apple pastel rực rỡ */}
      <div className="stats-grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FFEBEA, #FFCDCC)' }}>
          <div className="stat-card-icon icon-total" style={{ backgroundColor: '#FF3B30', color: '#FFF' }}><FiAlertTriangle /></div>
          <div className="stat-card-info">
            <h3 style={{ color: '#FF3B30' }}>Đã Hết Hạn</h3>
            <p style={{ fontWeight: 700, fontSize: '1.4rem', color: '#8A0000' }}>{stats.expired} gói</p>
          </div>
        </div>

        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)' }}>
          <div className="stat-card-icon icon-new" style={{ backgroundColor: '#FF9500', color: '#FFF' }}><FiClock /></div>
          <div className="stat-card-info">
            <h3 style={{ color: '#E65100' }}>Cần Gia Hạn Gấp (≤7 ngày)</h3>
            <p style={{ fontWeight: 700, fontSize: '1.4rem', color: '#E65100' }}>{stats.soon} gói</p>
          </div>
        </div>

        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #EBF9EB, #C8E6C9)' }}>
          <div className="stat-card-icon icon-source" style={{ backgroundColor: '#34C759', color: '#FFF' }}><FiCheckCircle /></div>
          <div className="stat-card-info">
            <h3 style={{ color: '#2E7D32' }}>Đang Hoạt Động</h3>
            <p style={{ fontWeight: 700, fontSize: '1.4rem', color: '#1B5E20' }}>{stats.safe} gói</p>
          </div>
        </div>

        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #F2F7FD, #D0E1FD)' }}>
          <div className="stat-card-icon icon-revenue" style={{ backgroundColor: '#0071E3', color: '#FFF' }}><FiUsers /></div>
          <div className="stat-card-info">
            <h3 style={{ color: '#0B3C5D' }}>Tổng Số Thuê Bao</h3>
            <p style={{ fontWeight: 700, fontSize: '1.4rem', color: '#0D3C5C' }}>{stats.total} gói</p>
          </div>
        </div>
      </div>

      {/* Thanh Tìm kiếm và Lọc thông minh */}
      <div className="search-filter-card" style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-color)' }}>
        
        {/* Hàng 1: Ô Tìm kiếm 100% rộng */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '1rem' }}>
          <FiSearch style={{ position: 'absolute', left: '16px', top: '13px', color: 'var(--text-light)', fontSize: '1.1rem' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm nhanh theo tên khách hàng, email, sản phẩm, username..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              height: '44px', 
              padding: '0 1rem 0 2.8rem', 
              borderRadius: '22px', 
              border: '1px solid var(--border-color)', 
              outline: 'none', 
              fontSize: '0.925rem',
              backgroundColor: '#F5F5F7',
              transition: 'all 0.3s'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '16px', top: '12px', background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-light)' }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Hàng 2: Bộ lọc linh hoạt */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dark)', fontWeight: 600, fontSize: '0.85rem' }}>
            <FiSliders /> Bộ Lọc:
          </div>

          <select 
            value={timeFilter} 
            onChange={e => setTimeFilter(e.target.value)}
            style={{ padding: '0 1rem', borderRadius: '20px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '160px', height: '36px', fontSize: '0.85rem' }}
          >
            <option value="all">Tất cả Hạn Dùng</option>
            <option value="expired">🚨 Đã Hết Hạn</option>
            <option value="soon">⏳ Cần Gia Hạn Gấp (≤7 ngày)</option>
            <option value="safe">✅ Đang Hoạt Động</option>
          </select>

          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: '0 1rem', borderRadius: '20px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '160px', height: '36px', fontSize: '0.85rem' }}
          >
            <option value="all">Tất cả Phân Loại</option>
            <option value="id_pass">🔑 Tài Khoản (ID:Pass)</option>
            <option value="key">🎟️ Key Kích Hoạt</option>
            <option value="slot">👥 Gán Slot Family/Team</option>
          </select>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginLeft: 'auto' }}>
            Tìm thấy <strong>{filteredSubs.length}</strong> thuê bao phù hợp
          </span>
        </div>
      </div>

      {/* Bảng Thuê bao gia hạn */}
      <div className="table-card widget" style={{ overflowX: 'auto', padding: '0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
            <FiRefreshCw className="spin-animation" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }} />
            <p>Đang tải dữ liệu gia hạn bản quyền...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#FF3B30' }}>
            <FiAlertTriangle style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
            <p>{error}</p>
          </div>
        ) : filteredSubs.length > 0 ? (
          <table className="styled-table">
            <thead>
              <tr>
                <th>Khách Hàng</th>
                <th>Sản Phẩm & Dịch Vụ</th>
                <th>Chi Tiết Tài Nguyên</th>
                <th>Thời Hạn Còn Lại</th>
                <th>Hạn Sử Dụng</th>
                <th>MMO Social Chat</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.map(sub => {
                const expiry = getDaysRemaining(sub.validUntil);
                return (
                  <tr key={sub.id} style={{ borderLeft: `4px solid ${expiry.color}` }}>
                    
                    {/* 1. Khách Hàng */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Link 
                          to={`/customers/${sub.customer._id}`} 
                          style={{ fontWeight: 700, color: '#0071E3', textDecoration: 'none' }}
                          title="Xem chi tiết hồ sơ khách hàng"
                        >
                          {sub.customer.name}
                        </Link>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{sub.customer.email || 'Không có email'}</span>
                      </div>
                    </td>

                    {/* 2. Sản phẩm */}
                    <td>
                      <span className="product-badge" style={{ 
                        backgroundColor: sub.resourceType === 'slot' ? '#FAF5FE' : sub.resourceType === 'key' ? '#F4FBF6' : '#F2F7FD',
                        color: sub.resourceType === 'slot' ? '#AF52DE' : sub.resourceType === 'key' ? '#34C759' : '#0071E3',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'inline-block',
                        marginBottom: '4px'
                      }}>
                        {sub.productType}
                      </span>
                    </td>

                    {/* 3. Chi tiết tài nguyên */}
                    <td>
                      <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#1D1D1F' }}>
                        {sub.detailsText}
                      </code>
                    </td>

                    {/* 4. Thời hạn còn lại */}
                    <td>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem', 
                        fontWeight: 600, 
                        color: expiry.color, 
                        backgroundColor: expiry.bg,
                        display: 'inline-block'
                      }}>
                        {expiry.text}
                      </span>
                    </td>

                    {/* 5. Hạn sử dụng */}
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiCalendar />
                        {sub.validUntil ? new Date(sub.validUntil).toLocaleDateString('vi-VN') : 'Không thời hạn'}
                      </div>
                    </td>

                    {/* 6. Social MMO Chat Link */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {sub.customer.facebook ? (
                          <a 
                            href={sub.customer.facebook.startsWith('http') ? sub.customer.facebook : `https://facebook.com/${sub.customer.facebook}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#E7F3FF', color: '#1877F2' }}
                            title="Chat Facebook Messenger"
                          >
                            <FiFacebook size={14} />
                          </a>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F5F5F7', color: '#C7C7CC', cursor: 'not-allowed' }}><FiFacebook size={14} /></span>
                        )}

                        {sub.customer.telegram ? (
                          <a 
                            href={sub.customer.telegram.startsWith('http') ? sub.customer.telegram : `https://t.me/${sub.customer.telegram.replace('@', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#E1F5FE', color: '#03A9F4' }}
                            title="Chat Telegram"
                          >
                            <FiSend size={12} />
                          </a>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F5F5F7', color: '#C7C7CC', cursor: 'not-allowed' }}><FiSend size={12} /></span>
                        )}

                        {sub.customer.zalo ? (
                          <a 
                            href={sub.customer.zalo.startsWith('http') ? sub.customer.zalo : `https://zalo.me/${sub.customer.zalo}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#E8F5E9', color: '#4CAF50' }}
                            title="Chat Zalo"
                          >
                            <FiMessageCircle size={14} />
                          </a>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F5F5F7', color: '#C7C7CC', cursor: 'not-allowed' }}><FiMessageCircle size={14} /></span>
                        )}
                      </div>
                    </td>

                    {/* 7. Thao tác */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn-renew-action" 
                          onClick={() => openRenewModal(sub)} 
                          title="Gia hạn gói dịch vụ này"
                        >
                          <FiRefreshCw size={12} /> Gia hạn
                        </button>
                        
                        <button 
                          className="btn-remind-action" 
                          onClick={() => handleSendReminder(sub)} 
                          title="Gửi email nhắc nhở hóa đơn"
                          disabled={sendingEmailId === sub.id}
                        >
                          <FiMail size={12} /> {sendingEmailId === sub.id ? 'Đang gửi...' : 'Nhắc nợ'}
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-light)' }}>
            <FiCheckCircle style={{ fontSize: '2.5rem', color: '#34C759', marginBottom: '0.75rem' }} />
            <h3 style={{ color: '#1D1D1F', marginBottom: '0.25rem' }}>An Toàn Tuyệt Đối!</h3>
            <p>Không có thuê bao nào hết hạn hoặc cần gia hạn theo tiêu chí tìm kiếm hiện tại.</p>
          </div>
        )}
      </div>

      {/* MODAL GIA HẠN THUÊ BAO (APPLE UX DESIGN) */}
      {isRenewModalOpen && selectedSub && (
        <div className="modal-overlay" onClick={() => { setIsRenewModalOpen(false); setSelectedSub(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '520px', padding: '1.75rem' }}>
            <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
              <h2>🔄 Gia Hạn Bản Quyền</h2>
              <button className="close-button" onClick={() => { setIsRenewModalOpen(false); setSelectedSub(null); }}>&times;</button>
            </div>
            
            <form onSubmit={handleRenewSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Panel tóm tắt thuê bao */}
                <div style={{ backgroundColor: '#F5F5F7', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-light)' }}>Khách hàng:</span>
                    <strong>{selectedSub.customer.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-light)' }}>Sản phẩm:</span>
                    <strong>{selectedSub.productType}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-light)' }}>Chi tiết tài khoản:</span>
                    <code>{selectedSub.detailsText}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E5EA', paddingTop: '6px', marginTop: '6px' }}>
                    <span style={{ color: 'var(--text-light)' }}>Hạn dùng hiện tại:</span>
                    <strong style={{ color: '#FF3B30' }}>
                      {selectedSub.validUntil ? new Date(selectedSub.validUntil).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                    </strong>
                  </div>
                </div>

                {renewStep === 'form' ? (
                  <>
                    {/* Các Preset gia hạn nhanh Apple Style */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ marginBottom: '0.5rem', display: 'block' }}>Gia Hạn Nhanh (Preset):</label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button 
                          type="button" 
                          onClick={() => applyPreset(1)}
                          style={{ flex: 1, height: '36px', borderRadius: '18px', border: '1px solid #E5E5EA', backgroundColor: '#FFF', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          +1 Tháng
                        </button>
                        <button 
                          type="button" 
                          onClick={() => applyPreset(3)}
                          style={{ flex: 1, height: '36px', borderRadius: '18px', border: '1px solid #E5E5EA', backgroundColor: '#FFF', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          +3 Tháng
                        </button>
                        <button 
                          type="button" 
                          onClick={() => applyPreset(6)}
                          style={{ flex: 1, height: '36px', borderRadius: '18px', border: '1px solid #E5E5EA', backgroundColor: '#FFF', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          +6 Tháng
                        </button>
                        <button 
                          type="button" 
                          onClick={() => applyPreset(12)}
                          style={{ flex: 1, height: '36px', borderRadius: '18px', border: '1px solid #E5E5EA', backgroundColor: '#FFF', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          +1 Năm
                        </button>
                      </div>
                    </div>

                    {/* Lựa chọn ngày tùy biến */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="new-expiry">Hạn Sử Dụng Mới:</label>
                      <input 
                        type="date" 
                        id="new-expiry"
                        value={newExpiryDate}
                        onChange={e => setNewExpiryDate(e.target.value)}
                        required
                        style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', fontSize: '0.9rem', outline: 'none' }}
                      />
                      <small style={{ color: 'var(--text-light)', marginTop: '4px', display: 'block', fontSize: '0.75rem' }}>
                        * Hệ thống sẽ tự động chuyển trạng thái tài nguyên thành <strong>Đang Hoạt Động (Sold)</strong> khi gia hạn ngày trong tương lai.
                      </small>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Bước 2: Xác nhận & thiết lập hóa đơn */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '3px solid #34C759', paddingLeft: '12px' }}>
                      <h4 style={{ margin: 0, color: '#1D1D1F', fontSize: '0.95rem' }}>Xác Nhận Thay Đổi Hạn Sử Dụng:</h4>
                      <div style={{ fontSize: '0.9rem', color: '#1D1D1F' }}>
                        {selectedSub.validUntil ? new Date(selectedSub.validUntil).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                        &nbsp;&rarr;&nbsp;
                        <strong style={{ color: '#34C759', fontSize: '1rem' }}>
                          {new Date(newExpiryDate).toLocaleDateString('vi-VN')}
                        </strong>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="renewal-fee">Chi Phí Gia Hạn (VNĐ):</label>
                      <input 
                        type="number" 
                        id="renewal-fee"
                        value={renewalFee}
                        onChange={e => setRenewalFee(Number(e.target.value))}
                        required
                        min="0"
                        style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="renewal-notes">Ghi Chú Đơn Hàng / Gia Hạn (Không bắt buộc):</label>
                      <input 
                        type="text" 
                        id="renewal-notes"
                        placeholder="Ví dụ: Khách gia hạn qua Zalo, ck Sacombank..."
                        value={renewalNotes}
                        onChange={e => setRenewalNotes(e.target.value)}
                        style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 10px', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: '#F0F9F1', border: '1px solid #C2E7C6', color: '#2E7D32', fontSize: '0.8rem', lineHeight: '1.4' }}>
                      <strong>Hệ thống sẽ thực hiện:</strong>
                      <ol style={{ margin: '4px 0 0 0', paddingLeft: '1.25rem' }}>
                        <li>Cập nhật ngày sử dụng mới cho tài khoản MMO này.</li>
                        <li>Tạo 1 đơn hàng gia hạn trị giá <strong>{renewalFee.toLocaleString('vi-VN')} đ</strong> ở trạng thái <em>Đã thanh toán (paid)</em>.</li>
                        <li>Tự động gửi email <strong>xác nhận thanh toán</strong> kèm hóa đơn PDF cập nhật hạn sử dụng mới đến khách hàng.</li>
                      </ol>
                    </div>
                  </>
                )}

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #E5E5EA', padding: '1rem 0 0 0', marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                {renewStep === 'form' ? (
                  <>
                    <button 
                      type="button" 
                      className="btn-cancel" 
                      onClick={() => { setIsRenewModalOpen(false); setSelectedSub(null); }}
                      style={{ flex: 1, height: '44px', fontWeight: 600 }}
                    >
                      Hủy bỏ
                    </button>
                    <button 
                      type="submit" 
                      className="btn-save"
                      style={{ flex: 1, height: '44px', fontWeight: 600, backgroundColor: '#0071E3' }}
                    >
                      Tiếp tục (Xác nhận)
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button" 
                      className="btn-cancel" 
                      onClick={() => setRenewStep('form')}
                      style={{ flex: 1, height: '44px', fontWeight: 600 }}
                    >
                      Quay lại
                    </button>
                    <button 
                      type="submit" 
                      className="btn-save"
                      disabled={isRenewing}
                      style={{ flex: 1, height: '44px', fontWeight: 600, backgroundColor: '#34C759' }}
                    >
                      {isRenewing ? 'Đang gửi & xử lý...' : 'Xác Nhận & Gửi Hóa Đơn'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM TRƯỚC HÓA ĐƠN GỬI EMAIL */}
      {previewEmailData && (
        <div className="modal-overlay" onClick={() => { setPreviewEmailData(null); setActivePreviewSub(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '680px', padding: '1.75rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', flexShrink: 0 }}>
              <h2>{previewEmailData?.isSimulation ? '✉️ Xem Trước Hóa Đơn Gia Hạn (Giả lập gửi Email)' : '✉️ Xem Trước & Xác Nhận Gửi Hóa Đơn'}</h2>
              <button className="close-button" onClick={() => { setPreviewEmailData(null); setActivePreviewSub(null); }}>&times;</button>
            </div>
            
            <div style={{ backgroundColor: '#F5F5F7', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem', flexShrink: 0 }}>
              <div><span style={{ color: 'var(--text-light)' }}>Người nhận:</span> <strong>{previewEmailData?.recipient}</strong></div>
              <div><span style={{ color: 'var(--text-light)' }}>Tiêu đề:</span> <strong>{previewEmailData?.subject}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: previewEmailData?.isSimulation ? '#FF9500' : '#0071E3', fontWeight: 600, fontSize: '0.8rem', marginTop: '4px' }}>
                <FiInfo /> {previewEmailData?.isSimulation 
                  ? 'Chưa cấu hình SMTP trong phần Cài đặt - Hệ thống đang chạy chế độ giả lập xem trước.' 
                  : 'Hệ thống đã kết nối SMTP. Vui lòng rà soát kỹ thông tin trước khi xác nhận gửi email thực tế.'}
              </div>
            </div>

            {/* Khung Iframe hiển thị HTML hóa đơn */}
            <div style={{ flex: 1, minHeight: '350px', border: '1px solid #E5E5EA', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FFF', display: 'flex', flexDirection: 'column' }}>
              <iframe 
                title="Preview Email Billing"
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
};

export default QuanLyGiaHan;
