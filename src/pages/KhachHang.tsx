import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // <-- THÊM IMPORT NÀY
import api from '../services/api';
import { FiEdit, FiTrash2, FiUserPlus, FiUsers, FiUserCheck, FiTarget, FiFacebook, FiSend, FiMessageCircle, FiLock } from 'react-icons/fi';

// === Định nghĩa kiểu dữ liệu ===
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
  createdAt: string;
}

type CustomerFormData = Omit<ICustomer, '_id' | 'createdAt'>;
const customerSources = ["Facebook", "Zalo", "Telegram", "Giới thiệu", "Khác"];
const customerStatuses = ["Bình thường", "VIP", "Tiềm năng", "Cảnh báo"];

interface ICustomerStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  sourceBreakdown: { _id: string; count: number }[];
}

// === Component hiển thị Tag Nguồn ===
const SourceBadge: React.FC<{ source?: string }> = ({ source }) => {
  if (!source) return null;
  let className = "source-badge ";
  switch (source.toLowerCase()) {
    case "facebook": className += "source-facebook"; break;
    case "zalo": className += "source-zalo"; break;
    case "telegram": className += "source-telegram"; break;
    case "giới thiệu": className += "source-gioi-thieu"; break;
    default: className += "source-khac";
  }
  return <span className={className}>{source}</span>;
};

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

// === Component Trang Khách Hàng ===
const KhachHang: React.FC = () => {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stats, setStats] = useState<ICustomerStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<ICustomer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    source: '',
    facebook: '',
    telegram: '',
    zalo: '',
    status: 'Bình thường',
    notes: '',
    privateNotes: '',
  });

  // --- Hàm tải dữ liệu ---
  const fetchCustomers = async () => {
    try {
      const { data } = await api.get<{ success: boolean, data: ICustomer[] }>('/customers');
      if (data.success) setCustomers(data.data);
    } catch (err) {
      console.error("Lỗi tải khách hàng:", err);
      setError('Không thể tải danh sách khách hàng.');
    }
  };

  const fetchCustomerStats = async () => {
    try {
      const { data } = await api.get<{ success: boolean, data: ICustomerStats }>('/customers/stats');
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error("Lỗi tải thống kê:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCustomers(), fetchCustomerStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Logic lọc tìm kiếm
  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    if (term === '') return true;
    return (
      customer.name.toLowerCase().includes(term) ||
      (customer.email && customer.email.toLowerCase().includes(term)) ||
      (customer.phone && customer.phone.toLowerCase().includes(term)) ||
      (customer.source && customer.source.toLowerCase().includes(term)) ||
      (customer.telegram && customer.telegram.toLowerCase().includes(term)) ||
      (customer.zalo && customer.zalo.toLowerCase().includes(term)) ||
      (customer.status && customer.status.toLowerCase().includes(term))
    );
  });
  
  // --- Các hàm xử lý Modal ---
  const openModal = (customer: ICustomer | null = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        source: customer.source || '',
        facebook: customer.facebook || '',
        telegram: customer.telegram || '',
        zalo: customer.zalo || '',
        status: customer.status || 'Bình thường',
        notes: customer.notes || '',
        privateNotes: customer.privateNotes || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        source: '',
        facebook: '',
        telegram: '',
        zalo: '',
        status: 'Bình thường',
        notes: '',
        privateNotes: '',
      });
    }
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Vui lòng nhập Tên khách hàng.');
      return;
    }
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      fetchCustomers();
      fetchCustomerStats();
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Thao tác thất bại. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      try {
        await api.delete(`/customers/${id}`);
        fetchCustomers();
        fetchCustomerStats();
      } catch (err) {
        console.error(err);
        alert('Xóa thất bại. Vui lòng thử lại.');
      }
    }
  };

  // Hàm render top 3 nguồn khách hàng
  const renderSourceStats = () => {
    if (!stats || !stats.sourceBreakdown.length) {
      return <span>Chưa có dữ liệu</span>;
    }
    return stats.sourceBreakdown.slice(0, 3).map((source, index) => (
      <div key={index}>{source._id}: <strong>{source.count}</strong></div>
    ));
  };

  return (
    <div>
      {/* Tiêu đề và Nút Thêm Mới */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="gradient-title">Khách Hàng</h1>
          <p>Quản lý thông tin khách hàng của bạn.</p>
        </div>
        <button className="login-button" style={{ width: 'auto' }} onClick={() => openModal(null)}>
          <FiUserPlus style={{ marginRight: '8px', verticalAlign: 'middle' }}/>
          Thêm Khách Hàng
        </button>
      </div>

      {/* Ba Thẻ Thống Kê */}
      <div className="stats-grid-3">
        <div className="stat-card widget">
          <div className="stat-card-icon icon-total"><FiUsers /></div>
          <div className="stat-card-info">
            <h3>Tổng Khách Hàng</h3>
            <p>{stats ? stats.totalCustomers : '...'}</p>
          </div>
        </div>
        <div className="stat-card widget">
          <div className="stat-card-icon icon-new"><FiUserCheck /></div>
          <div className="stat-card-info">
            <h3>Khách Hàng Mới (Tháng)</h3>
            <p>{stats ? stats.newCustomersThisMonth : '...'}</p>
          </div>
        </div>
        <div className="stat-card widget">
          <div className="stat-card-icon icon-source"><FiTarget /></div>
          <div className="stat-card-info">
            <h3>Top Nguồn KH</h3>
            <div className="source-list">{stats ? renderSourceStats() : '...'}</div>
          </div>
        </div>
      </div>

      {/* Thanh Tìm kiếm */}
      <div className="table-toolbar">
        <input
          type="text"
          placeholder="Tìm kiếm theo Tên, Email, SĐT, Nguồn, Telegram, Trạng thái..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Bảng Dữ Liệu */}
      {loading && <p>Đang tải dữ liệu...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!loading && !error && (
        <div className="table-container widget" style={{transition: 'none', boxShadow: 'var(--shadow)'}}>
          <table className="styled-table">
            <thead>
              <tr>
                <th>Họ và Tên</th>
                <th>Liên hệ</th>
                <th>Mạng xã hội MMO</th>
                <th>Trạng thái</th>
                <th>Nguồn</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => (
                  <tr key={customer._id}>
                    <td>
                      <Link to={`/customers/${customer._id}`} className="customer-link" style={{ fontWeight: 600 }}>
                        {customer.name}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.925rem' }}>{customer.email || '—'}</div>
                      <div style={{ color: 'var(--text-light)', fontSize: '0.825rem', marginTop: '2px' }}>{customer.phone || '—'}</div>
                    </td>
                    <td className="mmo-social-links">
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
                    </td>
                    <td><StatusBadge status={customer.status} /></td>
                    <td><SourceBadge source={customer.source} /></td>
                    <td className="action-buttons">
                      <button onClick={() => openModal(customer)} title="Sửa">
                        <FiEdit />
                      </button>
                      <button onClick={() => handleDelete(customer._id)} title="Xóa" className="delete">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    Không tìm thấy khách hàng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL (POPUP) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCustomer ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}</h2>
              <button onClick={closeModal} className="modal-close-btn">&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '5px' }}>
                <div className="form-group">
                  <label htmlFor="name">Họ và Tên (Bắt buộc)</label>
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleFormChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Số Điện Thoại</label>
                  <input type="text" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} />
                </div>
                
                {/* Các trường MMO mới */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="facebook">Facebook Link / UID</label>
                    <input type="text" id="facebook" name="facebook" placeholder="Ví dụ: facebook.com/user" value={formData.facebook} onChange={handleFormChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="telegram">Telegram Username</label>
                    <input type="text" id="telegram" name="telegram" placeholder="Ví dụ: @username" value={formData.telegram} onChange={handleFormChange} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="zalo">Zalo SĐT / Link</label>
                    <input type="text" id="zalo" name="zalo" placeholder="Ví dụ: 096xxx hoặc link" value={formData.zalo} onChange={handleFormChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="status">Trạng thái MMO</label>
                    <select id="status" name="status" value={formData.status} onChange={handleFormChange}>
                      {customerStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="source">Nguồn khách hàng</label>
                  <select id="source" name="source" value={formData.source} onChange={handleFormChange}>
                    <option value="">-- Chọn nguồn --</option>
                    {customerSources.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Ghi chú công việc</label>
                  <textarea id="notes" name="notes" rows={2} placeholder="Các ghi chú công việc thông thường..." value={formData.notes} onChange={handleFormChange} />
                </div>

                <div className="form-group">
                  <label htmlFor="privateNotes" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B27B00' }}>
                    <FiLock style={{ verticalAlign: 'middle' }} /> Ghi chú bảo mật / cá nhân (Proxy, Accounts, Ví...)
                  </label>
                  <textarea 
                    id="privateNotes" 
                    name="privateNotes" 
                    rows={3} 
                    placeholder="Ví dụ: Proxy 45.12.33.1:8000, tài khoản cấp: admin/123456, ví thanh toán của khách..." 
                    value={formData.privateNotes} 
                    onChange={handleFormChange} 
                    style={{ border: '1px solid rgba(243, 164, 26, 0.3)', backgroundColor: '#FFFDF9' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn-save">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default KhachHang;