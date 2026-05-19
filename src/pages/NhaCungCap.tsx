import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiBriefcase, FiPlus, FiTrash2, FiSearch, FiEdit, FiMail, FiPhone, FiSend,
  FiCheckCircle, FiXCircle, FiPlusCircle, FiCheck, FiInfo, FiAlertTriangle
} from 'react-icons/fi';

interface ISupplier {
  _id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  telegram?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

const NhaCungCap: React.FC = () => {
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // States for Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<ISupplier | null>(null);

  // States for Delete Confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [telegram, setTelegram] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get<{ success: boolean; data: ISupplier[] }>('/suppliers');
      if (res.data.success) {
        setSuppliers(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi tải danh sách nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleEditClick = (sup: ISupplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setContactName(sup.contact_name || '');
    setEmail(sup.email || '');
    setPhone(sup.phone || '');
    setTelegram(sup.telegram || '');
    setNotes(sup.notes || '');
    setStatus(sup.status);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setTelegram('');
    setNotes('');
    setStatus('active');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng nhập tên nhà cung cấp.');

    const body = {
      name: name.trim(),
      contact_name: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      telegram: telegram.trim(),
      notes: notes.trim(),
      status
    };

    try {
      if (editingSupplier) {
        const res = await api.put<{ success: boolean }>(`/suppliers/${editingSupplier._id}`, body);
        if (res.data.success) {
          alert('Cập nhật nhà cung cấp thành công!');
          handleCloseModal();
          await loadSuppliers();
        }
      } else {
        const res = await api.post<{ success: boolean }>('/suppliers', body);
        if (res.data.success) {
          alert('Thêm nhà cung cấp mới thành công!');
          handleCloseModal();
          await loadSuppliers();
        }
      }
    } catch (err) {
      alert('Không thể lưu thông tin nhà cung cấp.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/suppliers/${id}`);
      if (res.data.success) {
        alert('Xóa nhà cung cấp thành công!');
        setDeleteConfirmId(null);
        await loadSuppliers();
      }
    } catch (err) {
      alert('Không thể xóa nhà cung cấp.');
    }
  };

  const formatTelegram = (handle: string) => {
    if (!handle) return '';
    const clean = handle.replace('@', '').trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    return `https://t.me/${clean}`;
  };

  // Stats
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
  const inactiveSuppliers = suppliers.filter(s => s.status === 'inactive').length;

  // Filtered List
  const filteredSuppliers = suppliers.filter(sup => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      sup.name.toLowerCase().includes(q) ||
      (sup.contact_name && sup.contact_name.toLowerCase().includes(q)) ||
      (sup.phone && sup.phone.includes(q)) ||
      (sup.telegram && sup.telegram.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || sup.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="customer-detail-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="gradient-title">Quản lý Nhà Cung Cấp</h1>
        <p>Theo dõi danh bạ đối tác cung cấp, Telegram liên lạc và lưu vết tài nguyên MMO nhập vào hệ thống</p>
      </div>

      {/* Stats Widgets */}
      <div className="stats-grid-3" style={{ marginBottom: '2rem' }}>
        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FBFBFD, #F5F5F7)' }}>
          <div className="stat-card-icon" style={{ backgroundColor: '#E3F2FD', color: '#0071E3' }}><FiBriefcase /></div>
          <div className="stat-card-info">
            <h3>Tổng Nhà Cung Cấp</h3>
            <p style={{ fontWeight: 700 }}>{totalSuppliers} đối tác</p>
          </div>
        </div>

        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #EBF9EB, #D1F2D1)' }}>
          <div className="stat-card-icon" style={{ backgroundColor: '#E8F5E9', color: '#34C759' }}><FiCheckCircle /></div>
          <div className="stat-card-info">
            <h3>Đang Hoạt Động</h3>
            <p style={{ color: '#2E7D32', fontWeight: 700 }}>{activeSuppliers} đang cấp hàng</p>
          </div>
        </div>

        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FFEBEA, #FFCDCC)' }}>
          <div className="stat-card-icon" style={{ backgroundColor: '#FFEBEA', color: '#FF3B30' }}><FiXCircle /></div>
          <div className="stat-card-info">
            <h3>Tạm Ngừng Giao Dịch</h3>
            <p style={{ color: '#C62828', fontWeight: 700 }}>{inactiveSuppliers} đối tác</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="widget" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', padding: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <FiSearch style={{ position: 'absolute', left: '16px', top: '13px', color: 'var(--text-light)' }} />
          <input 
            type="text" 
            placeholder="Tìm nhà cung cấp theo tên, người đại diện, Telegram..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '44px', borderRadius: '30px', border: '1px solid var(--border-color)', height: '40px', width: '100%', marginBottom: 0 }}
          />
        </div>

        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0 1rem', borderRadius: '20px', border: '1px solid var(--border-color)', outline: 'none', height: '40px', minWidth: '150px', fontSize: '0.85rem' }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm dừng</option>
        </select>

        <button 
          className="login-button" 
          style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 1.25rem', borderRadius: '20px', fontSize: '0.85rem' }}
          onClick={() => setIsModalOpen(true)}
        >
          <FiPlusCircle /> Thêm Nhà Cung Cấp
        </button>
      </div>

      {/* List Table */}
      {loading ? (
        <p>Đang tải danh sách nhà cung cấp...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div className="table-container widget">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Tên Đối Tác</th>
                <th>Người Đại Diện</th>
                <th>Thông Tin Liên Hệ</th>
                <th>Telegram</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map(item => (
                  <tr key={item._id}>
                    <td>
                      <strong style={{ color: '#1D1D1F', fontSize: '0.95rem' }}>{item.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                        {item.notes || 'Không có ghi chú thêm'}
                      </div>
                    </td>
                    <td>
                      <strong>{item.contact_name || 'N/A'}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.825rem' }}>
                        {item.phone && (
                          <div><FiPhone style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {item.phone}</div>
                        )}
                        {item.email && (
                          <div style={{ color: 'var(--text-light)' }}><FiMail style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {item.email}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      {item.telegram ? (
                        <a 
                          href={formatTelegram(item.telegram)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#E1F5FE',
                            color: '#0288D1',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem'
                          }}
                        >
                          <FiSend /> @{item.telegram.replace('@', '')}
                        </a>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-light)', fontSize: '0.8rem' }}>Chưa cập nhật</span>
                      )}
                    </td>
                    <td>
                      <span className="product-badge" style={{ 
                        backgroundColor: item.status === 'active' ? '#EBF9EB' : '#FFEBEA',
                        color: item.status === 'active' ? '#34C759' : '#FF3B30',
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontWeight: 700
                      }}>
                        {item.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button 
                          className="btn-edit-sm" 
                          onClick={() => handleEditClick(item)} 
                          title="Chỉnh sửa"
                        >
                          <FiEdit size={14} />
                        </button>
                        <button 
                          className="btn-delete-sm" 
                          onClick={() => setDeleteConfirmId(item._id)} 
                          title="Xóa đối tác"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                    Chưa có thông tin nhà cung cấp nào được nhập.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '650px' }}>
            <div className="modal-header">
              <h2>{editingSupplier ? 'Sửa Thông Tin Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}</h2>
              <button onClick={handleCloseModal} className="modal-close-btn">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="sup-name">Tên Nhà Cung Cấp *</label>
                  <input 
                    type="text" 
                    id="sup-name" 
                    placeholder="Ví dụ: Shop Key MMO Pro, Cung Cấp Gmail Sỉ..." 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="sup-contact">Người Đại Diện</label>
                    <input 
                      type="text" 
                      id="sup-contact" 
                      placeholder="Tên người liên hệ" 
                      value={contactName} 
                      onChange={e => setContactName(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="sup-telegram">Telegram Handle (Không bắt buộc)</label>
                    <input 
                      type="text" 
                      id="sup-telegram" 
                      placeholder="Ví dụ: @shopkeymmo" 
                      value={telegram} 
                      onChange={e => setTelegram(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="sup-phone">Số Điện Thoại</label>
                    <input 
                      type="text" 
                      id="sup-phone" 
                      placeholder="Nhập số điện thoại liên lạc" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="sup-email">Địa Chỉ Email</label>
                    <input 
                      type="email" 
                      id="sup-email" 
                      placeholder="email@example.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="sup-notes">Ghi Chú Chi Tiết</label>
                  <textarea 
                    id="sup-notes" 
                    rows={3} 
                    placeholder="Nhập thông tin ghi chú về dòng hàng cung cấp, chính sách bảo hành..." 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sup-status">Trạng Thái Vận Hành</label>
                  <select id="sup-status" value={status} onChange={e => setStatus(e.target.value as 'active' | 'inactive')}>
                    <option value="active">Đang hoạt động (Đang lấy hàng)</option>
                    <option value="inactive">Tạm dừng giao dịch</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-cancel" onClick={handleCloseModal} style={{ height: '38px', padding: '0 1.25rem' }}>Hủy Bỏ</button>
                <button type="submit" className="btn-save" style={{ height: '38px', padding: '0 1.5rem', backgroundColor: '#0071E3' }}>
                  {editingSupplier ? 'Cập Nhật' : 'Thêm Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Custom Confirm Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px', textAlign: 'center', padding: '2rem' }}>
            <FiAlertTriangle style={{ color: '#FF3B30', fontSize: '3rem', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Xác Nhận Xóa Đối Tác?</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Hành động này không thể phục hồi. Tất cả liên hệ và ghi chú của nhà cung cấp này sẽ bị xóa khỏi danh bạ đối tác!
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-cancel" style={{ flex: 1, height: '40px' }} onClick={() => setDeleteConfirmId(null)}>Hủy bỏ</button>
              <button 
                className="btn-save" 
                style={{ flex: 1, height: '40px', backgroundColor: '#FF3B30' }} 
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default NhaCungCap;
