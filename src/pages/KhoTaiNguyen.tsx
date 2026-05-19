import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiBox, FiPlus, FiTrash2, FiSearch, FiCalendar, FiCheckCircle, 
  FiXCircle, FiLock, FiPlusCircle, FiList, FiTrendingUp, 
  FiLayers, FiDollarSign, FiKey, FiAward, FiUsers, FiTag, FiCopy, FiCheck, FiEdit,
  FiEye, FiEyeOff, FiSend, FiGrid, FiInfo
} from 'react-icons/fi';

interface IAccount {
  _id: string;
  product_type: string;
  resource_type?: 'id_pass' | 'key' | 'slot';
  total_slots?: number;
  used_slots?: number;
  slots_assigned?: Array<{
    customer_id?: {
      _id: string;
      name: string;
    };
    assigned_email?: string;
    assigned_at?: string;
  }>;
  account_details?: {
    username?: string;
    password_acc?: string;
    license_key?: string;
    pin?: string;
  };
  cost: number;
  status: 'available' | 'sold' | 'expired' | 'banned';
  valid_until?: string;
  supplier?: {
    _id: string;
    name: string;
    telegram?: string;
  } | null;
  createdAt: string;
}

interface ISupplier {
  _id: string;
  name: string;
  telegram?: string;
}

const KhoTaiNguyen: React.FC = () => {
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // States cho Modal thêm/sửa kho mới
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<IAccount | null>(null);

  // Tab của Modal: 'single' (thêm 1 cái) hoặc 'bulk' (nhập hàng loạt)
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  
  // Dữ liệu nhập hàng loạt
  const [bulkText, setBulkText] = useState<string>('');

  // Trạng thái hiển thị mật khẩu riêng lẻ theo dòng
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Trạng thái hiển thị mật khẩu trong Modal biểu mẫu
  const [showPasswordInModal, setShowPasswordInModal] = useState<boolean>(false);

  // Trạng thái xác nhận xóa (Custom Apple Modal confirm)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [productType, setProductType] = useState<string>('Google One 2TB');
  const [customProductType, setCustomProductType] = useState<string>('');
  
  // Phân loại tài nguyên dạng MMO
  const [resourceType, setResourceType] = useState<'id_pass' | 'key' | 'slot'>('id_pass');
  const [totalSlots, setTotalSlots] = useState<string>('5');
  
  // Chi tiết tài nguyên thêm mới
  const [username, setUsername] = useState<string>('');
  const [passwordAcc, setPasswordAcc] = useState<string>('');
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  // Tìm kiếm & Lọc thông minh
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  // Trạng thái copy
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, suppliersRes] = await Promise.all([
        api.get<{ success: boolean; data: IAccount[] }>('/accounts'),
        api.get<{ success: boolean; data: ISupplier[] }>('/suppliers')
      ]);

      if (accountsRes.data.success) {
        setAccounts(accountsRes.data.data);
      }
      if (suppliersRes.data.success) {
        setSuppliers(suppliersRes.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi tải danh sách kho tài nguyên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Kích hoạt chỉnh sửa tài nguyên
  const handleEditClick = (acc: IAccount) => {
    setEditingAccount(acc);
    setActiveTab('single'); // Khi sửa chỉ cho phép sửa đơn
    
    // Nạp toàn bộ dữ liệu vào Form
    const productOptions = ['Google One 2TB', 'Youtube Premium', 'Spotify Premium', 'Canva Premium', 'Microsoft 365', 'Elsa Speak', 'Duolingo Super', 'WordPress Theme/Plugin Key'];
    if (productOptions.includes(acc.product_type)) {
      setProductType(acc.product_type);
      setCustomProductType('');
    } else {
      setProductType('Khác');
      setCustomProductType(acc.product_type);
    }
    
    setResourceType(acc.resource_type || 'id_pass');
    setTotalSlots(String(acc.total_slots || 5));
    setUsername(acc.account_details?.username || '');
    setPasswordAcc(acc.account_details?.password_acc || '');
    licenseKey || setLicenseKey(acc.account_details?.license_key || '');
    setPin(acc.account_details?.pin || '');
    setCost(String(acc.cost || 0));
    setValidUntil(acc.valid_until ? acc.valid_until.substring(0, 10) : '');
    setSelectedSupplier(acc.supplier ? (typeof acc.supplier === 'object' ? acc.supplier._id : acc.supplier) : '');
    
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setActiveTab('single');
    setBulkText('');
    
    // Reset Form
    setUsername('');
    setPasswordAcc('');
    setLicenseKey('');
    setPin('');
    setCost('');
    setValidUntil('');
    setResourceType('id_pass');
    setTotalSlots('5');
    setProductType('Google One 2TB');
    setCustomProductType('');
    setSelectedSupplier('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalProductType = productType === 'Khác' ? customProductType.trim() : productType;
    if (!finalProductType) return alert('Vui lòng nhập loại tài sản/bản quyền.');

    // CHỨC NĂNG 1: NHẬP HÀNG LOẠT (BULK IMPORT)
    if (!editingAccount && activeTab === 'bulk') {
      if (!bulkText.trim()) return alert('Vui lòng nhập danh sách tài nguyên.');
      
      const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
      const parsedAccounts: any[] = [];
      
      for (const line of lines) {
        if (resourceType === 'key') {
          parsedAccounts.push({
            product_type: finalProductType,
            resource_type: 'key',
            total_slots: 1,
            account_details: {
              license_key: line,
            },
            cost: Number(cost || 0),
            valid_until: validUntil || null,
            supplier: selectedSupplier || null,
            status: 'available',
            used_slots: 0
          });
        } else if (resourceType === 'id_pass') {
          // Phân tách bằng dấu gạch đứng '|'
          const parts = line.split('|').map(p => p.trim());
          if (parts.length < 2) {
            return alert(`Dòng tài khoản không hợp lệ (thiếu mật khẩu): "${line}". Định dạng chuẩn: user|pass hoặc user|pass|pin`);
          }
          parsedAccounts.push({
            product_type: finalProductType,
            resource_type: 'id_pass',
            total_slots: 1,
            account_details: {
              username: parts[0],
              password_acc: parts[1],
              pin: parts[2] || '',
            },
            cost: Number(cost || 0),
            valid_until: validUntil || null,
            supplier: selectedSupplier || null,
            status: 'available',
            used_slots: 0
          });
        } else {
          return alert('Hệ thống chỉ hỗ trợ nhập hàng loạt dạng Tài khoản hoặc Key kích hoạt.');
        }
      }

      try {
        const res = await api.post<{ success: boolean }>('/accounts', parsedAccounts);
        if (res.data.success) {
          alert(`Nhập kho thành công ${parsedAccounts.length} sản phẩm hàng loạt!`);
          handleCloseModal();
          await loadData();
        }
      } catch (err) {
        alert('Không thể nhập hàng loạt tài nguyên. Vui lòng kiểm tra lại dữ liệu.');
      }
      return;
    }

    // CHỨC NĂNG 2: NHẬP ĐƠN / CẬP NHẬT Từng tài nguyên
    const body = {
      product_type: finalProductType,
      resource_type: resourceType,
      total_slots: resourceType === 'slot' ? Number(totalSlots || 1) : 1,
      account_details: {
        username: resourceType !== 'key' ? username : '',
        password_acc: resourceType === 'id_pass' ? passwordAcc : '',
        license_key: resourceType === 'key' ? licenseKey : '',
        pin: resourceType === 'id_pass' ? pin : ''
      },
      cost: Number(cost || 0),
      valid_until: validUntil || null,
      supplier: selectedSupplier || null
    };

    try {
      if (editingAccount) {
        // Cập nhật tài nguyên (PUT)
        const res = await api.put<{ success: boolean }>(`/accounts/${editingAccount._id}`, body);
        if (res.data.success) {
          alert('Cập nhật tài nguyên thành công!');
          handleCloseModal();
          await loadData();
        }
      } else {
        // Thêm tài nguyên mới (POST)
        const res = await api.post<{ success: boolean }>('/accounts', { ...body, status: 'available', used_slots: 0 });
        if (res.data.success) {
          alert('Nhập kho tài nguyên thành công!');
          handleCloseModal();
          await loadData();
        }
      }
    } catch (err) {
      alert('Không thể lưu thông tin tài nguyên.');
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/accounts/${id}`);
      if (res.data.success) {
        alert('Xóa tài nguyên khỏi kho thành công!');
        setDeleteConfirmId(null);
        await loadData();
      }
    } catch (err) {
      alert('Không thể xóa tài nguyên.');
    }
  };

  // Tính toán số liệu kho
  const totalInStock = accounts.filter(a => a.status === 'available').length;
  const totalSold = accounts.filter(a => a.status === 'sold').length;
  const totalValue = accounts.reduce((sum, a) => sum + (a.status === 'available' ? a.cost : 0), 0);

  // Danh sách các loại sản phẩm duy nhất trong kho để hiển thị trong bộ lọc
  const uniqueProducts = Array.from(new Set(accounts.map(a => a.product_type)));

  // Lọc kho nâng cao
  const filteredAccounts = accounts.filter(acc => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      acc.product_type.toLowerCase().includes(searchLower) ||
      (acc.account_details?.username && acc.account_details.username.toLowerCase().includes(searchLower)) ||
      (acc.account_details?.license_key && acc.account_details.license_key.toLowerCase().includes(searchLower)) ||
      (acc.slots_assigned && acc.slots_assigned.some(s => 
        (s.assigned_email && s.assigned_email.toLowerCase().includes(searchLower)) || 
        (s.customer_id?.name && s.customer_id.name.toLowerCase().includes(searchLower))
      ));
      
    const matchesStatus = statusFilter === 'all' || acc.status === statusFilter;
    const matchesProduct = productFilter === 'all' || acc.product_type === productFilter;
    const matchesResourceType = resourceTypeFilter === 'all' || acc.resource_type === resourceTypeFilter;
    
    const accSupplierId = acc.supplier ? (typeof acc.supplier === 'object' ? acc.supplier._id : acc.supplier) : '';
    const matchesSupplier = supplierFilter === 'all' || accSupplierId === supplierFilter;

    return matchesSearch && matchesStatus && matchesProduct && matchesResourceType && matchesSupplier;
  });

  return (
    <div>
      {/* Tiêu đề Apple Style Tối Giản */}
      <div className="customer-detail-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="gradient-title">
          Quản lý Kho Tài Nguyên
        </h1>
        <p>Theo dõi số lượng hàng có sẵn, phân loại dạng Key, Account hoặc Family/Team slot gán bản quyền</p>
      </div>

      {/* Widgets thống kê kho */}
      <div className="stats-grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FBFBFD, #F5F5F7)' }}>
          <div className="stat-card-icon icon-total" style={{ backgroundColor: '#E3F2FD', color: '#1E88E5' }}><FiLayers /></div>
          <div className="stat-card-info">
            <h3>Tổng Tài Nguyên Nhập Kho</h3>
            <p>{accounts.length} sản phẩm</p>
          </div>
        </div>
        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #EBF9EB, #D1F2D1)' }}>
          <div className="stat-card-icon icon-new" style={{ backgroundColor: '#E8F5E9', color: '#4CAF50' }}><FiCheckCircle /></div>
          <div className="stat-card-info">
            <h3>Hàng Có Sẵn</h3>
            <p style={{ color: '#2E7D32', fontWeight: 700 }}>{totalInStock} sản phẩm</p>
          </div>
        </div>
        <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FFFDE8, #FFF9C4)' }}>
          <div className="stat-card-icon icon-source" style={{ backgroundColor: '#FFFDE7', color: '#FBC02D' }}><FiTrendingUp /></div>
          <div className="stat-card-info">
            <h3>Đã Bàn Giao</h3>
            <p style={{ color: '#D27B00', fontWeight: 700 }}>{totalSold} sản phẩm</p>
          </div>
        </div>
        <div className="stat-card widget">
          <div className="stat-card-icon icon-source" style={{ backgroundColor: '#EDE7F6', color: '#5E35B1' }}><FiDollarSign /></div>
          <div className="stat-card-info">
            <h3>Giá trị vốn tồn kho</h3>
            <p style={{ fontWeight: 700 }}>{totalValue.toLocaleString('vi-VN')} đ</p>
          </div>
        </div>
      </div>

      {/* BỘ LỌC THÔNG MINH PHONG CÁCH APPLE */}
      <div className="widget" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', padding: '1.25rem' }}>
        
        {/* Hàng 1: Search Bar Chiều Rộng 100% cực kỳ thoáng đãng */}
        <div style={{ position: 'relative', width: '100%' }}>
          <FiSearch style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-light)', fontSize: '1.05rem' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm nhanh theo tên sản phẩm, tài khoản đăng nhập, license key hoặc tên khách hàng gán slot..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ 
              paddingLeft: '44px', 
              paddingRight: '44px',
              marginBottom: 0, 
              borderRadius: '30px', 
              border: '1px solid var(--border-color)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
              fontSize: '0.95rem',
              height: '46px',
              width: '100%'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ 
                position: 'absolute', 
                right: '18px', 
                top: '11px', 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-light)', 
                fontSize: '1.2rem', 
                cursor: 'pointer',
                padding: 0
              }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Hàng 2: Bộ chọn lọc dropdown & Nút thêm mới */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          
          {/* Bộ lọc nhanh Segmented Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Dạng tài nguyên:</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: '🗂️ Tất cả', color: '#0071E3' },
                { id: 'id_pass', label: '🔑 Tài khoản (ID:Pass)', color: '#0071E3' },
                { id: 'key', label: '🎟️ Key kích hoạt', color: '#34C759' },
                { id: 'slot', label: '👥 Gán Family/Team Slot', color: '#AF52DE' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setResourceTypeFilter(t.id)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '15px',
                    fontSize: '0.78rem',
                    fontWeight: resourceTypeFilter === t.id ? 600 : 400,
                    border: '1px solid ' + (resourceTypeFilter === t.id ? t.color : '#E5E5EA'),
                    backgroundColor: resourceTypeFilter === t.id ? t.color + '12' : '#FFF',
                    color: resourceTypeFilter === t.id ? t.color : 'var(--text-light)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cụm Dropdown Lọc bổ trợ & Nút tạo mới */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            
            {/* Lọc theo Nhà Cung Cấp */}
            <select 
              value={supplierFilter} 
              onChange={e => setSupplierFilter(e.target.value)}
              style={{ padding: '0 1rem', borderRadius: '20px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '150px', height: '40px', fontSize: '0.85rem' }}
            >
              <option value="all">Tất cả nhà cung cấp</option>
              {suppliers.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>

            <select 
              value={productFilter} 
              onChange={e => setProductFilter(e.target.value)}
              style={{ padding: '0 1rem', borderRadius: '20px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '150px', height: '40px', fontSize: '0.85rem' }}
            >
              <option value="all">Tất cả sản phẩm</option>
              {uniqueProducts.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '0 1rem', borderRadius: '20px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '130px', height: '40px', fontSize: '0.85rem' }}
            >
              <option value="all">Tất cả Trạng Thái</option>
              <option value="available">Còn trống</option>
              <option value="sold">Đã bàn giao</option>
            </select>

            <button 
              className="login-button" 
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', borderRadius: '20px', height: '40px', fontSize: '0.85rem' }} 
              onClick={() => setIsModalOpen(true)}
            >
              <FiPlusCircle /> Nhập Hàng Mới
            </button>
          </div>
        </div>
      </div>

      {/* Bảng danh sách kho tài nguyên */}
      {loading ? (
        <p>Đang tải danh sách kho...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div className="table-container widget">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Tên Bản Quyền</th>
                <th>Phân Loại</th>
                <th>Thông Tin Chi Tiết</th>
                <th>Giá Vốn</th>
                <th>Hạn Sử Dụng</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map(item => (
                  <tr key={item._id}>
                    <td>
                      <strong style={{ color: '#1D1D1F', fontSize: '0.95rem' }}>{item.product_type}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
                        Nhập: {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                      
                      {/* HIỂN THỊ ĐỐI TÁC CUNG CẤP VÀ TELEGRAM NỔI BẬT */}
                      {item.supplier && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', marginTop: '4px' }}>
                          <span style={{ color: 'var(--text-light)' }}>Nguồn:</span>
                          <span style={{ fontWeight: 600, color: '#0071E3' }}>{item.supplier.name}</span>
                          {item.supplier.telegram && (
                            <a 
                              href={item.supplier.telegram.startsWith('http') ? item.supplier.telegram : `https://t.me/${item.supplier.telegram.replace('@', '')}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', color: '#0288D1', textDecoration: 'none', marginLeft: '2px' }}
                              title="Chat Telegram nhanh với nhà cung cấp"
                            >
                              <FiSend size={10} />
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {item.resource_type === 'key' ? (
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#EBF9EB', color: '#2E7D32', fontWeight: 600 }}>
                          🎟️ Key kích hoạt
                        </span>
                      ) : item.resource_type === 'slot' ? (
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#FAF5FE', color: '#7B1FA2', fontWeight: 600 }}>
                          👥 Gán Slot
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#E1F5FE', color: '#0288D1', fontWeight: 600 }}>
                          🔑 ID:Pass
                        </span>
                      )}
                    </td>
                    <td>
                      {/* HIỂN THỊ THÔNG TIN CHI TIẾT THEO LOẠI TÀI NGUYÊN */}
                      {item.resource_type === 'key' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <code style={{ 
                            backgroundColor: '#F5F5F7', 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            fontFamily: 'monospace', 
                            fontWeight: 600,
                            color: '#1D1D1F',
                            fontSize: '0.85rem'
                          }}>
                            {item.account_details?.license_key || '(Trống Key)'}
                          </code>
                          {item.account_details?.license_key && (
                            <button 
                              onClick={() => handleCopy(item.account_details!.license_key!, item._id)}
                              style={{ background: 'none', border: 'none', color: '#0071E3', cursor: 'pointer', display: 'inline-flex', padding: 0 }}
                              title="Sao chép Key"
                            >
                              {copiedId === item._id ? <FiCheck style={{ color: '#34C759' }} /> : <FiCopy />}
                            </button>
                          )}
                        </div>
                      ) : item.resource_type === 'slot' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '400px' }}>
                          {item.account_details?.username && (
                            <div style={{ fontSize: '0.85rem' }}>
                              <span style={{ color: 'var(--text-light)' }}>Host Acc:</span> <strong>{item.account_details.username}</strong>
                            </div>
                          )}
                          
                          {/* Apple Sleek Progress Bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            <div style={{ flex: 1, backgroundColor: '#E5E5EA', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ 
                                width: `${Math.min(100, ((item.used_slots || 0) / (item.total_slots || 1)) * 100)}%`, 
                                backgroundColor: '#AF52DE', 
                                height: '100%', 
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                              }}></div>
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7B1FA2' }}>
                              {item.used_slots}/{item.total_slots} slot đã gán
                            </span>
                          </div>

                          {/* List of assigned slots details */}
                          {item.slots_assigned && item.slots_assigned.length > 0 ? (
                            <div style={{ marginTop: '4px', backgroundColor: '#FAF9FC', padding: '6px 10px', borderRadius: '8px', border: '1px solid #F0EDF5' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.72rem', color: '#7B1FA2', marginBottom: '2px' }}>Khách hàng đã gán slot:</div>
                              <ul style={{ margin: 0, paddingLeft: '12px', fontSize: '0.75rem', color: '#1D1D1F', lineHeight: '1.4' }}>
                                {item.slots_assigned.map((slot: any, idx: number) => (
                                  <li key={idx}>
                                    <strong>{slot.customer_id?.name || 'Khách hàng'}</strong> ({slot.assigned_email || 'n/a'})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-light)', fontSize: '0.75rem', fontStyle: 'italic' }}>Chưa có slot nào được gán (Đầy đủ {item.total_slots} slot trống)</span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                          {item.account_details?.username && (
                            <div><span style={{ color: 'var(--text-light)' }}>User:</span> <strong>{item.account_details.username}</strong></div>
                          )}
                          {item.account_details?.password_acc && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--text-light)' }}>Pass:</span> 
                              <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {visiblePasswords[item._id] ? item.account_details.password_acc : '••••••••'}
                              </code>
                              <button
                                onClick={() => togglePasswordVisibility(item._id)}
                                style={{ background: 'none', border: 'none', color: '#0071E3', cursor: 'pointer', display: 'inline-flex', padding: 0 }}
                                title={visiblePasswords[item._id] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                              >
                                {visiblePasswords[item._id] ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                              </button>
                            </div>
                          )}
                          {item.account_details?.pin && (
                            <div><span style={{ color: 'var(--text-light)' }}>PIN:</span> <code>{item.account_details.pin}</code></div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: '#1D1D1F' }}>
                      {item.cost.toLocaleString('vi-VN')} đ
                    </td>
                    <td>
                      {item.valid_until ? (
                        <div style={{ fontSize: '0.85rem', color: '#1D1D1F' }}>
                          <FiCalendar style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {new Date(item.valid_until).toLocaleDateString('vi-VN')}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>Không thời hạn</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          className="btn-edit-sm" 
                          onClick={() => handleEditClick(item)} 
                          title="Chỉnh sửa tài nguyên"
                        >
                          <FiEdit size={14} />
                        </button>
                        <button 
                          className="btn-delete-sm" 
                          onClick={() => setDeleteConfirmId(item._id)} 
                          title="Xóa khỏi kho"
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
                    Không tìm thấy tài nguyên nào phù hợp với bộ lọc của bạn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL NHẬP/SỬA HÀNG (STYLE APPLE) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '95vw' }}>
            <div className="modal-header">
              <h2>{editingAccount ? 'Chỉnh Sửa Tài Nguyên Kho' : 'Nhập Thêm Hàng Vào Kho'}</h2>
              <button onClick={handleCloseModal} className="modal-close-btn">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                
                {/* SWITCH TABS (CHỈ KHI THÊM MỚI TÀI NGUYÊN) */}
                {!editingAccount && (
                  <div style={{ 
                    display: 'flex', 
                    backgroundColor: '#F2F2F7', 
                    padding: '4px', 
                    borderRadius: '10px', 
                    marginBottom: '1.25rem' 
                  }}>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('single'); setResourceType('id_pass'); }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: activeTab === 'single' ? 600 : 400,
                        backgroundColor: activeTab === 'single' ? '#FFF' : 'transparent',
                        color: activeTab === 'single' ? '#1D1D1F' : 'var(--text-light)',
                        boxShadow: activeTab === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FiBox /> Nhập Từng Sản Phẩm
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('bulk'); setResourceType('id_pass'); }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: activeTab === 'bulk' ? 600 : 400,
                        backgroundColor: activeTab === 'bulk' ? '#FFF' : 'transparent',
                        color: activeTab === 'bulk' ? '#1D1D1F' : 'var(--text-light)',
                        boxShadow: activeTab === 'bulk' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FiGrid /> Nhập Hàng Loạt (Bulk MMO Importer)
                    </button>
                  </div>
                )}

                {/* 1. Chọn loại sản phẩm */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="prod-type">Chọn Loại Sản Phẩm</label>
                    <select id="prod-type" value={productType} onChange={e => setProductType(e.target.value)}>
                      <option value="Google One 2TB">Google One 2TB</option>
                      <option value="Youtube Premium">Youtube Premium</option>
                      <option value="Spotify Premium">Spotify Premium</option>
                      <option value="Canva Premium">Canva Premium</option>
                      <option value="Microsoft 365">Microsoft 365</option>
                      <option value="Elsa Speak">Elsa Speak</option>
                      <option value="Duolingo Super">Duolingo Super</option>
                      <option value="WordPress Theme/Plugin Key">WordPress Theme/Plugin Key</option>
                      <option value="Khác">Khác / Nhập tay tự do</option>
                    </select>
                  </div>
                  {productType === 'Khác' && (
                    <div className="form-group">
                      <label htmlFor="custom-prod">Nhập Tên Sản Phẩm Mới</label>
                      <input 
                        type="text" 
                        id="custom-prod" 
                        placeholder="Ví dụ: ChatGPT Plus" 
                        value={customProductType} 
                        onChange={e => setCustomProductType(e.target.value)} 
                        required 
                      />
                    </div>
                  )}
                </div>

                {/* 2. Chọn Nhà Cung Cấp */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="acc-supplier">Nhà Cung Cấp (Đối Tác)</label>
                  <select 
                    id="acc-supplier" 
                    value={selectedSupplier} 
                    onChange={e => setSelectedSupplier(e.target.value)}
                    style={{ borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', height: '40px', padding: '0 0.75rem', fontSize: '0.875rem' }}
                  >
                    <option value="">-- Chọn nhà cung cấp nguồn hàng (Không bắt buộc) --</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name} {s.telegram ? `(@${s.telegram.replace('@','')})` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Apple Segmented Control chọn dạng tài nguyên */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Dạng Tài Nguyên Kho</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <button 
                      type="button" 
                      style={{ 
                        flex: 1, 
                        padding: '0.65rem', 
                        borderRadius: '8px', 
                        border: '1px solid ' + (resourceType === 'id_pass' ? '#0071E3' : '#E5E5EA'), 
                        backgroundColor: resourceType === 'id_pass' ? '#F2F8FE' : '#FFF', 
                        color: resourceType === 'id_pass' ? '#0071E3' : 'var(--text-dark)',
                        fontWeight: resourceType === 'id_pass' ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.85rem'
                      }}
                      onClick={() => setResourceType('id_pass')}
                    >
                      🔑 Tài Khoản (ID:Pass)
                    </button>
                    <button 
                      type="button" 
                      style={{ 
                        flex: 1, 
                        padding: '0.65rem', 
                        borderRadius: '8px', 
                        border: '1px solid ' + (resourceType === 'key' ? '#34C759' : '#E5E5EA'), 
                        backgroundColor: resourceType === 'key' ? '#F4FBF6' : '#FFF', 
                        color: resourceType === 'key' ? '#34C759' : 'var(--text-dark)',
                        fontWeight: resourceType === 'key' ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.85rem'
                      }}
                      onClick={() => setResourceType('key')}
                    >
                      🎟️ Key Kích Hoạt
                    </button>
                    
                    {/* CHỈ HIỂN THỊ CHỌN SLOT KHI Ở TAB NHẬP ĐƠN LẺ */}
                    {activeTab === 'single' && (
                      <button 
                        type="button" 
                        style={{ 
                          flex: 1, 
                          padding: '0.65rem', 
                          borderRadius: '8px', 
                          border: '1px solid ' + (resourceType === 'slot' ? '#AF52DE' : '#E5E5EA'), 
                          backgroundColor: resourceType === 'slot' ? '#FAF5FE' : '#FFF', 
                          color: resourceType === 'slot' ? '#AF52DE' : 'var(--text-dark)',
                          fontWeight: resourceType === 'slot' ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontSize: '0.85rem'
                        }}
                        onClick={() => setResourceType('slot')}
                      >
                        👥 Gán Slot Bản Quyền
                      </button>
                    )}
                  </div>
                </div>

                {/* GIAO DIỆN PHỤ THUỘC VÀO ACTIVE TAB */}
                {activeTab === 'single' ? (
                  
                  /* A: TAB NHẬP ĐƠN LẺ (SINGLE FORM) */
                  <div style={{ border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px', backgroundColor: '#FAFBFD', marginBottom: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {resourceType === 'key' ? <FiTag style={{ color: '#34C759' }} /> : resourceType === 'slot' ? <FiUsers style={{ color: '#AF52DE' }} /> : <FiLock style={{ color: '#0071E3' }} />}
                      {resourceType === 'key' ? 'Thông tin Key bản quyền' : resourceType === 'slot' ? 'Thông tin Host Family & Số lượng slot' : 'Thông tin Tài khoản & Mật khẩu'}
                    </h3>
                    
                    {resourceType === 'key' ? (
                      /* DẠNG 1: KEY KÍCH HOẠT */
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="acc-key">License Key / Dòng Key Kích Hoạt</label>
                        <input 
                          type="text" 
                          id="acc-key" 
                          placeholder="Nhập Key (Ví dụ: WP-KEY-8F8D-9E9C)" 
                          value={licenseKey} 
                          onChange={e => setLicenseKey(e.target.value)} 
                          required={resourceType === 'key' && activeTab === 'single'}
                        />
                      </div>
                    ) : resourceType === 'slot' ? (
                      /* DẠNG 2: GÁN SLOT FAMILY / TEAM */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="acc-user">Tài khoản Host (Email / Username)</label>
                            <input 
                              type="text" 
                              id="acc-user" 
                              placeholder="Email của tài khoản chủ Family/Team" 
                              value={username} 
                              onChange={e => setUsername(e.target.value)} 
                              required={resourceType === 'slot' && activeTab === 'single'}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="total-slots">Tổng số Slot của Host</label>
                            <input 
                              type="number" 
                              id="total-slots" 
                              placeholder="Ví dụ: Youtube có 5, Canva có 50..." 
                              value={totalSlots} 
                              onChange={e => setTotalSlots(e.target.value)} 
                              required={resourceType === 'slot' && activeTab === 'single'}
                              min="1"
                            />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="acc-pass">Mật khẩu Host (Nếu có)</label>
                            <div style={{ position: 'relative' }}>
                              <input 
                                type={showPasswordInModal ? "text" : "password"} 
                                id="acc-pass" 
                                placeholder="Không bắt buộc" 
                                value={passwordAcc} 
                                onChange={e => setPasswordAcc(e.target.value)} 
                                style={{ paddingRight: '40px' }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                                style={{ 
                                  position: 'absolute', 
                                  right: '12px', 
                                  top: '13px', 
                                  background: 'none', 
                                  border: 'none', 
                                  color: 'var(--text-light)', 
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                {showPasswordInModal ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                              </button>
                            </div>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="acc-pin">Mã PIN / Ghi chú Host</label>
                            <input 
                              type="text" 
                              id="acc-pin" 
                              placeholder="Ghi chú thêm về Host" 
                              value={pin} 
                              onChange={e => setPin(e.target.value)} 
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* DẠNG 3: ID:PASS TRUYỀN THỐNG */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="acc-user">Tài Khoản / Username</label>
                            <input 
                              type="text" 
                              id="acc-user" 
                              placeholder="Email hoặc Tên đăng nhập" 
                              value={username} 
                              onChange={e => setUsername(e.target.value)} 
                              required={resourceType === 'id_pass' && activeTab === 'single'}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="acc-pass">Mật Khẩu</label>
                            <div style={{ position: 'relative' }}>
                              <input 
                                type={showPasswordInModal ? "text" : "password"} 
                                id="acc-pass" 
                                placeholder="Mật khẩu của tài khoản" 
                                value={passwordAcc} 
                                onChange={e => setPasswordAcc(e.target.value)} 
                                required={resourceType === 'id_pass' && activeTab === 'single'}
                                style={{ paddingRight: '40px' }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                                style={{ 
                                  position: 'absolute', 
                                  right: '12px', 
                                  top: '13px', 
                                  background: 'none', 
                                  border: 'none', 
                                  color: 'var(--text-light)', 
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                {showPasswordInModal ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="acc-pin">PIN Profile / Ghi chú profile</label>
                          <input 
                            type="text" 
                            id="acc-pin" 
                            placeholder="Ví dụ: Profile 3 - PIN 1234" 
                            value={pin} 
                            onChange={e => setPin(e.target.value)} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  
                  /* B: TAB NHẬP HÀNG LOẠT (BULK MMO IMPORTER) */
                  <div style={{ border: '1px solid #34C759', padding: '1.25rem', borderRadius: '12px', backgroundColor: '#F4FBF6', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#2E7D32', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FiGrid /> Công Cụ Phân Tách & Nhập Hàng Loạt (Bulk Parsing)
                      </h3>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '3px 8px', 
                        borderRadius: '10px', 
                        backgroundColor: '#E8F5E9', 
                        color: '#2E7D32', 
                        fontWeight: 600 
                      }}>
                        Đã phát hiện: {bulkText.split('\n').map(l => l.trim()).filter(Boolean).length} dòng hàng
                      </span>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label htmlFor="bulk-data" style={{ fontWeight: 600, color: '#1D1D1F' }}>
                        Dán danh sách tài nguyên vào đây (Mỗi dòng một sản phẩm):
                      </label>
                      <textarea
                        id="bulk-data"
                        rows={8}
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        placeholder={
                          resourceType === 'key' 
                            ? "WP-KEY-8F8D-9E9C\nWP-KEY-2F3D-4A5B\nWP-KEY-1A2B-3C4D..."
                            : "username1@gmail.com|password123\nusername2@gmail.com|password456|pin1234\nusername3@gmail.com|password789|pin5678..."
                        }
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          lineHeight: '1.5',
                          borderRadius: '8px',
                          border: '1px solid #C3E6CB',
                          padding: '10px',
                          backgroundColor: '#FFF',
                          width: '100%',
                          outline: 'none',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      />
                    </div>

                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#555', 
                      backgroundColor: '#E8F5E9', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      borderLeft: '4px solid #34C759',
                      lineHeight: '1.4'
                    }}>
                      <FiInfo style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      <strong>Định dạng chuẩn:</strong><br />
                      - Với dạng <strong>Tài khoản (ID:Pass)</strong>: Phân tách Username, Password và PIN bằng ký tự gạch đứng <code>|</code>. Ví dụ: <code>tài_khoản|mật_khẩu</code> hoặc <code>tài_khoản|mật_khẩu|mã_pin</code>.<br />
                      - Với dạng <strong>Key kích hoạt</strong>: Mỗi dòng chỉ chứa chính xác một chuỗi Key kích hoạt.
                    </div>
                  </div>
                )}

                {/* 4. Giá vốn và Hạn sử dụng */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="acc-cost">
                      {activeTab === 'bulk' ? 'Giá Vốn Nhập Hàng Từng Unit (đ)' : 'Giá Vốn Nhập Hàng (đ)'}
                    </label>
                    <input type="number" id="acc-cost" placeholder="Ví dụ: 30000" value={cost} onChange={e => setCost(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="acc-valid">Hạn Sử Dụng (Áp dụng chung)</label>
                    <input type="date" id="acc-valid" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                  </div>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Hủy bỏ</button>
                <button type="submit" className="btn-save">
                  {editingAccount ? 'Cập Nhật Ngay' : activeTab === 'bulk' ? 'Tiến Hành Nhập Hàng Loạt' : 'Nhập Kho Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA (APPLE STYLE DIALOG) */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '450px', padding: '1.75rem' }}>
            <div style={{ textAlign: 'center', margin: '0.5rem 0 1.5rem 0' }}>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: '#FFEBEA', 
                color: '#FF3B30', 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%',
                fontSize: '1.6rem',
                marginBottom: '1rem'
              }}>
                <FiTrash2 />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1D1D1F', marginBottom: '0.5rem' }}>
                Xác Nhận Xóa Tài Nguyên
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', lineHeight: '1.5', padding: '0 0.5rem' }}>
                Bạn có chắc chắn muốn xóa tài nguyên này khỏi kho hàng? Hành động này sẽ loại bỏ vĩnh viễn dữ liệu và không thể hoàn tác.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1, height: '44px', fontWeight: 600 }}
                onClick={() => setDeleteConfirmId(null)}
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                className="btn-danger" 
                style={{ flex: 1, height: '44px', fontWeight: 600 }}
                onClick={() => handleDelete(deleteConfirmId)}
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KhoTaiNguyen;
