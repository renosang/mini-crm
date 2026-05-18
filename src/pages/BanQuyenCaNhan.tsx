import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiKey, FiPlus, FiTrash2, FiEdit3, FiSearch, FiCalendar, 
  FiCheckCircle, FiAlertTriangle, FiXCircle, FiLock, FiPlusCircle, 
  FiBriefcase, FiGrid, FiPackage 
} from 'react-icons/fi';

interface IPersonalLicense {
  _id: string;
  name: string;
  category: string;
  account_details?: {
    username?: string;
    password_acc?: string;
    license_key?: string;
    pin?: string;
  };
  cost: number;
  valid_until?: string;
  supplier?: string;
  status: 'active' | 'expired' | 'suspended';
  notes?: string;
}

const BanQuyenCaNhan: React.FC = () => {
  const [licenses, setLicenses] = useState<IPersonalLicense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // States cho Modal thêm/sửa
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form inputs
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Premium Account');
  const [username, setUsername] = useState<string>('');
  const [passwordAcc, setPasswordAcc] = useState<string>('');
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'expired' | 'suspended'>('active');
  const [notes, setNotes] = useState<string>('');

  // Tìm kiếm & Lọc
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: IPersonalLicense[] }>('/personal-licenses');
      if (res.data.success) {
        setLicenses(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu bản quyền cá nhân.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setCategory('Premium Account');
    setUsername('');
    setPasswordAcc('');
    setLicenseKey('');
    setPin('');
    setCost('');
    setValidUntil('');
    setSupplier('');
    setStatus('active');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: IPersonalLicense) => {
    setEditingId(item._id);
    setName(item.name);
    setCategory(item.category);
    setUsername(item.account_details?.username || '');
    setPasswordAcc(item.account_details?.password_acc || '');
    setLicenseKey(item.account_details?.license_key || '');
    setPin(item.account_details?.pin || '');
    setCost(item.cost.toString());
    setValidUntil(item.valid_until ? item.valid_until.substring(0, 10) : '');
    setSupplier(item.supplier || '');
    setStatus(item.status);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng điền tên bản quyền/dịch vụ.');

    const body = {
      name,
      category,
      account_details: {
        username,
        password_acc: passwordAcc,
        license_key: licenseKey,
        pin
      },
      cost: Number(cost || 0),
      valid_until: validUntil || null,
      supplier,
      status,
      notes
    };

    try {
      if (editingId) {
        const res = await api.put<{ success: boolean }>(`/personal-licenses/${editingId}`, body);
        if (res.data.success) alert('Cập nhật bản quyền cá nhân thành công!');
      } else {
        const res = await api.post<{ success: boolean }>('/personal-licenses', body);
        if (res.data.success) alert('Thêm mới bản quyền cá nhân thành công!');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert('Không thể lưu thông tin bản quyền cá nhân.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản quyền cá nhân này khỏi kho thống kê?')) return;
    try {
      const res = await api.delete(`/personal-licenses/${id}`);
      if (res.data.success) {
        await loadData();
      }
    } catch (err) {
      alert('Lỗi khi xóa.');
    }
  };

  // Tính toán nhanh
  const activeCount = licenses.filter(l => l.status === 'active').length;
  const expiredCount = licenses.filter(l => l.status === 'expired').length;
  const totalCost = licenses.reduce((sum, l) => sum + l.cost, 0);

  // Lọc
  const filteredLicenses = licenses.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.account_details?.username && l.account_details.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.account_details?.license_key && l.account_details.license_key.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesCategory = selectedCategoryFilter === 'all' || l.category === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* Tiêu đề Apple Style */}
      <div className="customer-detail-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="gradient-title">
          Thống kê Bản Quyền & Key Cá Nhân
        </h1>
        <p>Kho lưu trữ tài khoản, công cụ SEO, WordPress và Premium cá nhân của Admin (không bán)</p>
      </div>

      {/* Widgets thống kê */}
      <div className="stats-grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FBFBFD, #F5F5F7)' }}>
          <div className="stat-card-icon icon-total" style={{ backgroundColor: '#E3F2FD', color: '#1E88E5' }}><FiGrid /></div>
          <div className="stat-card-info">
            <h3>Tổng Tài Nguyên</h3>
            <p>{licenses.length} tài nguyên</p>
          </div>
        </div>
        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #EBF9EB, #D1F2D1)' }}>
          <div className="stat-card-icon icon-new" style={{ backgroundColor: '#E8F5E9', color: '#4CAF50' }}><FiCheckCircle /></div>
          <div className="stat-card-info">
            <h3>Đang Hoạt Động</h3>
            <p style={{ color: '#2E7D32', fontWeight: 700 }}>{activeCount} tài nguyên</p>
          </div>
        </div>
        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FFF5F5, #FFD2D2)' }}>
          <div className="stat-card-icon icon-source" style={{ backgroundColor: '#FFEBEE', color: '#FF3B30' }}><FiAlertTriangle /></div>
          <div className="stat-card-info">
            <h3>Hết Hạn / Tạm Dừng</h3>
            <p style={{ color: '#C62828', fontWeight: 700 }}>{expiredCount + licenses.filter(l => l.status === 'suspended').length} tài nguyên</p>
          </div>
        </div>
        <div className="stat-card widget">
          <div className="stat-card-icon icon-source" style={{ backgroundColor: '#EDE7F6', color: '#5E35B1' }}><FiBriefcase /></div>
          <div className="stat-card-info">
            <h3>Tổng Phí Duy Trì</h3>
            <p style={{ fontWeight: 700 }}>{totalCost.toLocaleString('vi-VN')} đ</p>
          </div>
        </div>
      </div>

      {/* Thanh bộ lọc & Tìm kiếm */}
      <div className="widget" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '1rem 1.25rem' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-light)' }} />
          <input 
            type="text" 
            placeholder="Tìm tên, tài khoản hoặc key..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '35px', marginBottom: 0 }}
          />
        </div>
        <div>
          <select 
            value={selectedCategoryFilter} 
            onChange={e => setSelectedCategoryFilter(e.target.value)}
            style={{ padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '180px' }}
          >
            <option value="all">Tất cả Phân Loại</option>
            <option value="Premium Account">Tài khoản Premium (Google, Spotify...)</option>
            <option value="WordPress Plugin/Theme">WordPress Plugin/Theme Key</option>
            <option value="SEO Tool">SEO & MMO Tool</option>
            <option value="VPS/Server">VPS / Máy chủ cá nhân</option>
            <option value="Khác">Khác / Dịch vụ khác</option>
          </select>
        </div>
        <button 
          className="login-button" 
          style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem' }} 
          onClick={openAddModal}
        >
          <FiPlusCircle /> Thêm Bản Quyền
        </button>
      </div>

      {/* Bảng danh sách bản quyền cá nhân */}
      {loading ? (
        <p>Đang tải tài sản cá nhân...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div className="table-container widget">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Tên Dịch Vụ / Tài Nguyên</th>
                <th>Phân Loại</th>
                <th>Thông Tin Tài Khoản / Key</th>
                <th>Chi Phí</th>
                <th>Hạn Sử Dụng</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredLicenses.length > 0 ? (
                filteredLicenses.map(item => (
                  <tr key={item._id}>
                    <td>
                      <strong style={{ color: 'var(--text-dark)', fontSize: '0.95rem' }}>{item.name}</strong>
                      {item.supplier && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                          NCC: {item.supplier}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="status-badge status-binh-thuong" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                        {item.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                        {item.account_details?.username && (
                          <div><span style={{ color: 'var(--text-light)' }}>User:</span> <strong>{item.account_details.username}</strong></div>
                        )}
                        {item.account_details?.password_acc && (
                          <div><span style={{ color: 'var(--text-light)' }}>Pass:</span> <code>{item.account_details.password_acc}</code></div>
                        )}
                        {item.account_details?.license_key && (
                          <div style={{ wordBreak: 'break-all' }}><span style={{ color: 'var(--text-light)' }}>Key:</span> <code style={{ backgroundColor: '#F5F5F7', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>{item.account_details.license_key}</code></div>
                        )}
                        {item.account_details?.pin && (
                          <div><span style={{ color: 'var(--text-light)' }}>PIN:</span> <code>{item.account_details.pin}</code></div>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                      {item.cost.toLocaleString('vi-VN')} đ
                    </td>
                    <td>
                      {item.valid_until ? (
                        <div style={{ fontSize: '0.85rem' }}>
                          <FiCalendar style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {new Date(item.valid_until).toLocaleDateString('vi-VN')}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Không thời hạn</span>
                      )}
                    </td>
                    <td>
                      {item.status === 'active' ? (
                        <span className="status-badge status-tiem-nang" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FiCheckCircle /> Đang dùng
                        </span>
                      ) : item.status === 'expired' ? (
                        <span className="status-badge status-canh-bao" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FiXCircle /> Hết Hạn
                        </span>
                      ) : (
                        <span className="status-badge status-binh-thuong" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#E5E5EA', color: '#8E8E93' }}>
                          <FiLock /> Tạm Dừng
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEditModal(item)} style={{ border: 'none', background: 'none', color: '#0071E3', cursor: 'pointer', fontSize: '1rem', padding: '4px' }} title="Sửa">
                          <FiEdit3 />
                        </button>
                        <button onClick={() => handleDelete(item._id)} style={{ border: 'none', background: 'none', color: '#FF3B30', cursor: 'pointer', fontSize: '1rem', padding: '4px' }} title="Xóa">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-light)' }}>
                    Chưa có tài khoản / key bản quyền cá nhân nào được lưu trữ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL THÊM / SỬA BẢN QUYỀN CÁ NHÂN (STYLE APPLE) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '820px', maxWidth: '95vw' }}>
            <div className="modal-header">
              <h2><FiKey style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {editingId ? 'Sửa Bản Quyền Cá Nhân' : 'Thêm Bản Quyền Cá Nhân'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close-btn">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="lic-name">Tên Dịch vụ / Tài nguyên</label>
                    <input 
                      type="text" 
                      id="lic-name" 
                      placeholder="Ví dụ: Youtube Premium cá nhân" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lic-cat">Phân Loại</label>
                    <select id="lic-cat" value={category} onChange={e => setCategory(e.target.value)}>
                      <option value="Premium Account">Tài khoản Premium (Google, Youtube...)</option>
                      <option value="WordPress Plugin/Theme">WordPress Plugin/Theme Key</option>
                      <option value="SEO Tool">SEO & MMO Tool</option>
                      <option value="VPS/Server">VPS / Máy chủ cá nhân</option>
                      <option value="Khác">Khác / Dịch vụ khác</option>
                    </select>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px', backgroundColor: '#FAFBFD', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FiLock /> Chi Tiết Đăng Nhập / License
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="lic-user">Tài Khoản / Host</label>
                      <input type="text" id="lic-user" placeholder="Email hoặc URL" value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="lic-pass">Mật Khẩu / Port</label>
                      <input type="text" id="lic-pass" value={passwordAcc} onChange={e => setPasswordAcc(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="lic-key">License Key / Dòng Bàn Giao</label>
                      <input type="text" id="lic-key" placeholder="Key kích hoạt hoặc token" value={licenseKey} onChange={e => setLicenseKey(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="lic-pin">PIN Profile / Ghi chú phụ</label>
                      <input type="text" id="lic-pin" placeholder="PIN hoặc mã bảo vệ" value={pin} onChange={e => setPin(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="lic-cost">Phí Gia Hạn / Giá Vốn (đ)</label>
                    <input type="number" id="lic-cost" placeholder="Ví dụ: 59000" value={cost} onChange={e => setCost(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lic-valid">Hạn Sử Dụng</label>
                    <input type="date" id="lic-valid" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="lic-supplier">Nhà Cung Cấp</label>
                    <input type="text" id="lic-supplier" placeholder="Ví dụ: Divi, Webshare, Admin VIP..." value={supplier} onChange={e => setSupplier(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lic-status">Trạng Thái Bản Quyền</label>
                    <select id="lic-status" value={status} onChange={e => setStatus(e.target.value as any)}>
                      <option value="active">Đang Sử Dụng (Active)</option>
                      <option value="expired">Đã Hết Hạn (Expired)</option>
                      <option value="suspended">Tạm Dừng / Khóa (Suspended)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="lic-notes">Ghi Chú Sử Dụng Cá Nhân</label>
                  <textarea 
                    id="lic-notes" 
                    rows={3} 
                    placeholder="Ghi chú mục đích sử dụng cá nhân, thông tin lưu ý..." 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
                <button type="submit" className="btn-save">Lưu Bản Quyền</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BanQuyenCaNhan;
