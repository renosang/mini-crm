import React, { useState, useEffect } from 'react';
import { 
  FiSend, FiSearch, FiMessageCircle, FiFacebook, FiGrid, FiClock,
  FiUser, FiMail, FiPhone, FiCompass, FiLayers, FiCheckCircle,
  FiLink2, FiAlertCircle, FiSettings, FiPlusCircle, FiDollarSign, FiCalendar
} from 'react-icons/fi';
import api from '../services/api';

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
  cost: number;
  status: string;
  valid_until?: string;
}

interface IMessage {
  id: string;
  sender: 'customer' | 'admin';
  text: string;
  time: string;
}

interface IChatThread {
  id: string;
  senderName: string;
  senderAvatar: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  channel: 'zalo' | 'telegram' | 'facebook';
  senderSocialId: string;
  customerProfile: ICustomer | null;
  messages: IMessage[];
}

const OmnichannelInbox: React.FC = () => {
  const [threads, setThreads] = useState<IChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [activeCustomerAccounts, setActiveCustomerAccounts] = useState<IAccount[]>([]);
  const [loadingContext, setLoadingContext] = useState<boolean>(false);
  
  // States cho ô tìm kiếm và lọc
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'zalo' | 'telegram' | 'facebook'>('all');
  
  // State soạn thảo tin nhắn
  const [newMessageText, setNewMessageText] = useState<string>('');
  
  // State liên kết khách hàng thủ công
  const [linkSearchQuery, setLinkSearchQuery] = useState<string>('');
  const [showLinkDropdown, setShowLinkDropdown] = useState<boolean>(false);

  // Load danh sách khách hàng từ DB
  const loadCustomers = async () => {
    try {
      const res = await api.get<{ success: boolean; data: ICustomer[] }>('/customers');
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error('Không thể nạp danh sách khách hàng:', err);
    }
  };

  // Nạp dữ liệu giả lập ban đầu cho các cuộc hội thoại
  const loadMockThreads = (customerList: ICustomer[]) => {
    const matchedCustomerA = customerList.find(c => c.phone === '0912345678') || null;
    const matchedCustomerB = customerList.find(c => c.name.includes('Nguyễn Văn A')) || null;

    const mockData: IChatThread[] = [
      {
        id: '1',
        senderName: matchedCustomerB ? matchedCustomerB.name : 'Nguyễn Văn A',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        lastMessage: 'Cho mình gia hạn thêm 5 gói Spotify với nhé admin ơi!',
        time: '3 phút trước',
        unreadCount: 2,
        channel: 'zalo',
        senderSocialId: 'zalo_user_9912',
        customerProfile: matchedCustomerB,
        messages: [
          { id: '1-1', sender: 'customer', text: 'Chào shop, mình muốn hỏi về gói Proxy US', time: '10:00 AM' },
          { id: '1-2', sender: 'admin', text: 'Dạ shop chào bạn ạ, bạn cần thuê Proxy US số lượng bao nhiêu ạ?', time: '10:02 AM' },
          { id: '1-3', sender: 'customer', text: 'Cho mình gia hạn thêm 5 gói Spotify với nhé admin ơi!', time: '10:05 AM' }
        ]
      },
      {
        id: '2',
        senderName: 'Michael MMO Trader',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
        lastMessage: 'Key ChatGPT Plus dùng cực kỳ mượt nha bạn!',
        time: '45 phút trước',
        unreadCount: 0,
        channel: 'telegram',
        senderSocialId: 'tg_michael_992',
        customerProfile: null, // Chưa liên kết khách hàng trong hệ thống CRM
        messages: [
          { id: '2-1', sender: 'customer', text: 'Hi, I saw your key on Telegram store', time: '09:12 AM' },
          { id: '2-2', sender: 'admin', text: 'Welcome! How can we help you today?', time: '09:15 AM' },
          { id: '2-3', sender: 'customer', text: 'Key ChatGPT Plus dùng cực kỳ mượt nha bạn!', time: '09:20 AM' }
        ]
      },
      {
        id: '3',
        senderName: matchedCustomerA ? matchedCustomerA.name : 'Trần Thị B',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
        lastMessage: 'Mình đã gửi ảnh bill chuyển khoản qua email rồi nhé',
        time: '2 giờ trước',
        unreadCount: 0,
        channel: 'facebook',
        senderSocialId: 'fb_user_8874',
        customerProfile: matchedCustomerA,
        messages: [
          { id: '3-1', sender: 'customer', text: 'Shop ơi check giúp mình đơn hàng mới tạo', time: '07:30 AM' },
          { id: '3-2', sender: 'admin', text: 'Dạ bạn gửi giúp shop ảnh bill chuyển khoản ạ', time: '07:32 AM' },
          { id: '3-3', sender: 'customer', text: 'Mình đã gửi ảnh bill chuyển khoản qua email rồi nhé', time: '07:35 AM' }
        ]
      }
    ];

    setThreads(mockData);
    if (mockData.length > 0) {
      setActiveThreadId(mockData[0].id);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadCustomers();
    };
    init();
  }, []);

  useEffect(() => {
    if (customers.length > 0) {
      loadMockThreads(customers);
    }
  }, [customers]);

  // Load các gói dịch vụ của khách hàng đang được xem
  const activeThread = threads.find(t => t.id === activeThreadId);

  useEffect(() => {
    const fetchCustomerAccounts = async () => {
      if (!activeThread?.customerProfile) {
        setActiveCustomerAccounts([]);
        return;
      }
      try {
        setLoadingContext(true);
        const res = await api.get<{ success: boolean; data: IAccount[] }>('/accounts');
        if (res.data.success) {
          // Lọc ra các tài khoản thuộc sở hữu của khách hàng này
          const matchedAccs = res.data.data.filter(acc => 
            acc.status === 'sold' && 
            acc.valid_until &&
            (acc as any).customer_id?._id === activeThread.customerProfile?._id
          );
          setActiveCustomerAccounts(matchedAccs);
        }
      } catch (err) {
        console.error('Lỗi nạp context tài khoản khách hàng:', err);
      } finally {
        setLoadingContext(false);
      }
    };

    fetchCustomerAccounts();
  }, [activeThreadId, activeThread?.customerProfile]);

  // Gửi tin nhắn mô phỏng
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeThreadId) return;

    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          lastMessage: newMessageText,
          time: 'Vừa xong',
          messages: [
            ...t.messages,
            {
              id: `${t.id}-${Date.now()}`,
              sender: 'admin' as const,
              text: newMessageText,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      }
      return t;
    });

    setThreads(updatedThreads);
    setNewMessageText('');
  };

  // Thao tác liên kết hội thoại với Khách hàng CRM
  const handleLinkCustomer = (cust: ICustomer) => {
    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          senderName: cust.name,
          customerProfile: cust
        };
      }
      return t;
    });
    setThreads(updatedThreads);
    setShowLinkDropdown(false);
    setLinkSearchQuery('');
  };

  // Hủy liên kết
  const handleUnlinkCustomer = () => {
    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          customerProfile: null
        };
      }
      return t;
    });
    setThreads(updatedThreads);
  };

  // Lọc danh sách chat
  const filteredThreads = threads.filter(t => {
    const matchesChannel = channelFilter === 'all' || t.channel === channelFilter;
    const matchesSearch = t.senderName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  // Lọc dropdown tìm khách hàng để link
  const filteredLinkCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(linkSearchQuery))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
      
      {/* Tiêu đề */}
      <div className="customer-detail-header" style={{ marginBottom: '1.25rem', flexShrink: 0 }}>
        <h1 className="gradient-title">Omni-channel Message Center</h1>
        <p>Hợp nhất kênh chat Zalo OA, Telegram Bot và Facebook Messenger tập trung hỗ trợ khách hàng tức thì</p>
      </div>

      {/* Main 3-Column Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 350px', gap: '1.25rem', flex: 1, minHeight: 0 }}>
        
        {/* === CỘT 1: DANH SÁCH CUỘC TRÒ CHUYỆN === */}
        <div className="widget" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', overflow: 'hidden' }}>
          {/* Hộp tìm kiếm */}
          <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-light)' }} />
            <input 
              type="text" 
              placeholder="Tìm hội thoại..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', borderRadius: '19px', fontSize: '0.875rem', marginBottom: 0, width: '100%' }}
            />
          </div>

          {/* Kênh lọc nhanh */}
          <div className="segmented-control" style={{ marginBottom: '1rem', padding: '1px' }}>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'zalo', label: 'Zalo' },
              { id: 'telegram', label: 'Tele' },
              { id: 'facebook', label: 'FB' }
            ].map(ch => (
              <button 
                key={ch.id} 
                className={`segment-button ${channelFilter === ch.id ? 'active' : ''}`}
                onClick={() => setChannelFilter(ch.id as any)}
                style={{ padding: '0.4rem', fontSize: '0.78rem' }}
              >
                {ch.label}
              </button>
            ))}
          </div>

          {/* List Threads */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredThreads.length > 0 ? (
              filteredThreads.map(th => {
                const isActive = th.id === activeThreadId;
                const channelIcon = th.channel === 'zalo' 
                  ? <FiMessageCircle style={{ color: '#0071E3' }} /> 
                  : th.channel === 'telegram' 
                    ? <FiSend style={{ color: '#03A9F4' }} /> 
                    : <FiFacebook style={{ color: '#1877F2' }} />;
                
                return (
                  <div 
                    key={th.id}
                    onClick={() => setActiveThreadId(th.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'rgba(0, 113, 227, 0.08)' : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(0, 113, 227, 0.15)' : 'transparent'}`,
                      transition: 'all 0.2s ease',
                      hover: { backgroundColor: '#F5F5F7' }
                    }}
                    className="thread-item-card"
                  >
                    {/* Avatar with Channel Overlay Badge */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img 
                        src={th.senderAvatar} 
                        alt={th.senderName} 
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ 
                        position: 'absolute', 
                        right: '-4px', 
                        bottom: '-4px', 
                        backgroundColor: '#FFF', 
                        borderRadius: '50%', 
                        width: '18px', 
                        height: '18px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                      }}>
                        {channelIcon}
                      </div>
                    </div>

                    {/* Meta info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-dark)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {th.senderName}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>{th.time}</span>
                      </div>
                      <p style={{ 
                        fontSize: '0.78rem', 
                        color: th.unreadCount > 0 ? 'var(--text-dark)' : 'var(--text-light)', 
                        fontWeight: th.unreadCount > 0 ? 600 : 400,
                        margin: 0,
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}>
                        {th.lastMessage}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {th.unreadCount > 0 && (
                      <span style={{ backgroundColor: '#FF3B30', color: '#FFF', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700 }}>
                        {th.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '2rem' }}>Không có cuộc chat nào</p>
            )}
          </div>
        </div>

        {/* === CỘT 2: KHUNG TRÒ CHUYỆN CHÍNH === */}
        <div className="widget" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {activeThread ? (
            <>
              {/* Header Khung Chat */}
              <div style={{ 
                padding: '1rem 1.25rem', 
                borderBottom: '1px solid var(--border-color)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src={activeThread.senderAvatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{activeThread.senderName}</h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
                      Kênh: <strong style={{ textTransform: 'uppercase' }}>{activeThread.channel}</strong> · ID: {activeThread.senderSocialId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lịch sử tin nhắn */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#F8F9FA' }}>
                {activeThread.messages.map(msg => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div 
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                        width: '100%'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '70%', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '16px',
                          borderTopLeftRadius: isAdmin ? '16px' : '4px',
                          borderTopRightRadius: isAdmin ? '4px' : '16px',
                          backgroundColor: isAdmin ? '#0071E3' : '#FFFFFF',
                          color: isAdmin ? '#FFFFFF' : 'var(--text-dark)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          fontSize: '0.875rem',
                          lineHeight: '1.4'
                        }}>
                          {msg.text}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '4px' }}>{msg.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ô soạn thảo và gửi */}
              <form 
                onSubmit={handleSendMessage}
                style={{ 
                  padding: '1rem 1.25rem', 
                  borderTop: '1px solid var(--border-color)', 
                  display: 'flex', 
                  gap: '0.75rem',
                  alignItems: 'center',
                  flexShrink: 0
                }}
              >
                <input 
                  type="text" 
                  placeholder="Nhập nội dung phản hồi khách hàng..." 
                  value={newMessageText}
                  onChange={e => setNewMessageText(e.target.value)}
                  style={{ flex: 1, height: '42px', borderRadius: '21px', border: '1px solid var(--border-color)', padding: '0 1.25rem', fontSize: '0.9rem', marginBottom: 0 }}
                />
                <button 
                  type="submit"
                  style={{
                    backgroundColor: '#0071E3',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 113, 227, 0.25)',
                    flexShrink: 0
                  }}
                  title="Gửi phản hồi"
                >
                  <FiSend />
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-light)' }}>
              <FiMessageCircle size={48} style={{ marginBottom: '1rem', color: '#D2D2D7' }} />
              <p>Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu chat</p>
            </div>
          )}
        </div>

        {/* === CỘT 3: HỒ SƠ KHÁCH HÀNG CRM (CONTEXT PANEL) === */}
        <div className="widget" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', overflowY: 'auto' }}>
          {activeThread ? (
            activeThread.customerProfile ? (
              // Trường hợp đã liên kết khách hàng
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Header Profile */}
                <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    backgroundColor: 'rgba(0,113,227,0.1)', 
                    color: '#0071E3', 
                    fontSize: '1.8rem', 
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.75rem'
                  }}>
                    {activeThread.customerProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-dark)' }}>
                    {activeThread.customerProfile.name}
                  </h3>
                  <span className={`status-badge ${activeThread.customerProfile.status?.toLowerCase() === 'vip' ? 'status-vip' : 'status-binh-thuong'}`} style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem' }}>
                    👑 {activeThread.customerProfile.status || 'Thành viên'}
                  </span>
                </div>

                {/* Chi tiết liên lạc */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>THÔNG TIN HỒ SƠ</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiPhone style={{ color: 'var(--text-light)' }} /> 
                    <strong>SĐT:</strong> {activeThread.customerProfile.phone || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', wordBreak: 'break-all' }}>
                    <FiMail style={{ color: 'var(--text-light)' }} /> 
                    <strong>Email:</strong> {activeThread.customerProfile.email || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiCompass style={{ color: 'var(--text-light)' }} /> 
                    <strong>Nguồn:</strong> {activeThread.customerProfile.source || 'N/A'}
                  </div>
                </div>

                {/* Các gói dịch vụ đang sử dụng */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>
                    DỊCH VỤ ĐANG THUÊ ({activeCustomerAccounts.length})
                  </h4>
                  {loadingContext ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Đang đối soát kho...</span>
                  ) : activeCustomerAccounts.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                      {activeCustomerAccounts.map(acc => (
                        <div 
                          key={acc._id}
                          style={{
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: '#FAFBFD',
                            fontSize: '0.8rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>
                            <span>{acc.product_type}</span>
                            <span style={{ color: '#34C759' }}>Active</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-light)', fontSize: '0.75rem' }}>
                            <span>Hạn: {acc.valid_until ? new Date(acc.valid_until).toLocaleDateString('vi-VN') : '—'}</span>
                            <span>{acc.cost.toLocaleString('vi-VN')} đ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic' }}>Chưa đăng ký thuê bao dịch vụ nào.</span>
                  )}
                </div>

                {/* Button Hủy liên kết hồ sơ */}
                <button 
                  onClick={handleUnlinkCustomer}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #FF3B30',
                    backgroundColor: 'transparent',
                    color: '#FF3B30',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <FiLink2 /> Gỡ liên kết tài khoản CRM
                </button>

              </div>
            ) : (
              // Trường hợp chưa liên kết khách hàng trong CRM (Anonymous profile)
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  backgroundColor: '#FFF3E0', 
                  color: '#FF9500', 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem'
                }}>
                  <FiAlertCircle />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-dark)' }}>Chưa liên kết CRM</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: '1.4', margin: 0 }}>
                    Hội thoại này được tạo từ người dùng vãng lai chưa có trong cơ sở dữ liệu khách hàng CRM của bạn.
                  </p>
                </div>

                {/* Ô tìm kiếm liên kết khách hàng */}
                <div style={{ width: '100%', position: 'relative', marginTop: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', display: 'block', textAlign: 'left', marginBottom: '4px' }}>
                    Tìm khách hàng để liên kết:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FiSearch style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-light)' }} />
                    <input 
                      type="text" 
                      placeholder="Tìm tên hoặc SĐT khách..." 
                      value={linkSearchQuery}
                      onChange={e => {
                        setLinkSearchQuery(e.target.value);
                        setShowLinkDropdown(true);
                      }}
                      onFocus={() => setShowLinkDropdown(true)}
                      style={{ paddingLeft: '32px', height: '34px', borderRadius: '8px', fontSize: '0.8rem', width: '100%', marginBottom: 0 }}
                    />
                  </div>

                  {/* Dropdown List kết quả tìm kiếm */}
                  {showLinkDropdown && linkSearchQuery.trim() !== '' && (
                    <div className="widget" style={{ 
                      position: 'absolute', 
                      width: '100%', 
                      zIndex: 100, 
                      border: '1px solid var(--border-color)', 
                      top: '100%', 
                      left: 0, 
                      padding: '4px 0', 
                      boxShadow: '0 6px 20px rgba(0,0,0,0.1)', 
                      maxHeight: '160px', 
                      overflowY: 'auto',
                      backgroundColor: '#FFFFFF'
                    }}>
                      {filteredLinkCustomers.length > 0 ? (
                        filteredLinkCustomers.map(cust => (
                          <div 
                            key={cust._id}
                            style={{ 
                              padding: '0.5rem 0.75rem', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              fontSize: '0.8rem',
                              borderBottom: '1px solid #F5F5F7'
                            }}
                            onClick={() => handleLinkCustomer(cust)}
                            className="nav-item"
                          >
                            <span style={{ fontWeight: 600 }}>{cust.name}</span>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>{cust.phone || 'N/A'}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '0.5rem 0.75rem', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                          Không tìm thấy khách hàng.
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)', fontSize: '0.85rem' }}>
              Không có cuộc trò chuyện hoạt động
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default OmnichannelInbox;
