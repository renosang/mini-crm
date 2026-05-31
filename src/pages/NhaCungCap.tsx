import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import {
  FiBriefcase, FiPlus, FiTrash2, FiSearch, FiEdit, FiMail, FiPhone, FiSend,
  FiCheckCircle, FiXCircle, FiPlusCircle, FiInfo, FiAlertTriangle,
  FiDollarSign, FiTrendingUp, FiDownload, FiGrid
} from 'react-icons/fi';

// ===================== TYPES =====================
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

interface ISupplierImport {
  _id: string;
  supplier_id: ISupplier | string;
  import_date: string;
  items: Array<{
    product_type: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
  }>;
  total_cost: number;
  payment_status: 'pending' | 'partial' | 'paid';
  paid_amount: number;
  notes: string;
  accounts_created: number;
  createdAt: string;
}

interface ISupplierPayment {
  _id: string;
  supplier_id: ISupplier | string;
  import_id?: ISupplierImport | string;
  amount: number;
  payment_date: string;
  method: 'bank_transfer' | 'crypto' | 'cash' | 'other';
  reference: string;
  notes: string;
  createdAt: string;
}

interface IDashboardStats {
  suppliers: { total: number; active: number; inactive: number };
  imports: { total: number; totalCost: number; totalPaid: number };
  payments: { total: number; totalAmount: number };
  outstandingDebt: number;
  accounts: { total: number; totalCost: number; sold: number; available: number };
  topSuppliers: Array<{
    _id: string;
    name: string;
    totalImportCost: number;
    totalPaid: number;
    importCount: number;
  }>;
  debtBySupplier: Array<{
    _id: string;
    name: string;
    totalImportCost: number;
    totalPaid: number;
    debt: number;
  }>;
}

// ===================== HELPER =====================
const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

// ===================== MAIN COMPONENT =====================
const NhaCungCap: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  // ─── Suppliers (Danh bạ) ───
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Dashboard Stats ───
  const [dashboardStats, setDashboardStats] = useState<IDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // ─── Imports ───
  const [imports, setImports] = useState<ISupplierImport[]>([]);
  const [loadingImports, setLoadingImports] = useState(false);

  // ─── Payments ───
  const [payments, setPayments] = useState<ISupplierPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // ─── Profit ───
  const [profitData, setProfitData] = useState<any>(null);
  const [loadingProfit, setLoadingProfit] = useState(false);
  const [profitFilter, setProfitFilter] = useState<{ supplier_id: string; from: string; to: string }>({
    supplier_id: '', from: '', to: ''
  });

  // ─── Modal states ───
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ISupplier | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ─── Supplier form ───
  const [sName, setSName] = useState('');
  const [sContact, setSContact] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sTelegram, setSTelegram] = useState('');
  const [sNotes, setSNotes] = useState('');
  const [sStatus, setSStatus] = useState<'active' | 'inactive'>('active');

  // ─── Import form ───
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSupplierId, setImportSupplierId] = useState('');
  const [importDate, setImportDate] = useState('');
  const [importItems, setImportItems] = useState<Array<{ product_type: string; quantity: number; unit_cost: number; account_data: string }>>([
    { product_type: '', quantity: 1, unit_cost: 0, account_data: '' }
  ]);
  const [importNotes, setImportNotes] = useState('');

  // ─── Payment form ───
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSupplierId, setPaymentSupplierId] = useState('');
  const [paymentImportId, setPaymentImportId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'crypto' | 'cash' | 'other'>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // ─── Search & Filter (Danh bạ) ───
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ─── Import filter ───
  const [importFilterSupplier, setImportFilterSupplier] = useState('');

  // ================= LOAD FUNCTIONS =================
  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get<{ success: boolean; data: ISupplier[] }>('/suppliers');
      if (res.data.success) setSuppliers(res.data.data);
    } catch (err) {
      setError('Lỗi tải danh sách nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDashboardStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await api.get<{ success: boolean; data: IDashboardStats }>('/suppliers/dashboard-stats');
      if (res.data.success) setDashboardStats(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadImports = useCallback(async () => {
    try {
      setLoadingImports(true);
      const params: any = {};
      if (importFilterSupplier) params.supplier_id = importFilterSupplier;
      const res = await api.get<{ success: boolean; data: ISupplierImport[] }>('/suppliers/imports', { params });
      if (res.data.success) setImports(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImports(false);
    }
  }, [importFilterSupplier]);

  const loadPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const res = await api.get<{ success: boolean; data: ISupplierPayment[] }>('/suppliers/payments');
      if (res.data.success) setPayments(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  const loadProfit = useCallback(async () => {
    try {
      setLoadingProfit(true);
      const params: any = {};
      if (profitFilter.supplier_id) params.supplier_id = profitFilter.supplier_id;
      if (profitFilter.from) params.from = profitFilter.from;
      if (profitFilter.to) params.to = profitFilter.to;
      const res = await api.get<{ success: boolean; data: any }>('/suppliers/profit', { params });
      if (res.data.success) setProfitData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfit(false);
    }
  }, [profitFilter]);

  useEffect(() => {
    loadSuppliers();
    loadDashboardStats();
  }, [loadSuppliers, loadDashboardStats]);

  useEffect(() => {
    if (activeTab === 'imports') loadImports();
    if (activeTab === 'payments') loadPayments();
    if (activeTab === 'profit') loadProfit();
  }, [activeTab, loadImports, loadPayments, loadProfit]);

  // ================= SUPPLIER HANDLERS =================
  const handleEditClick = (sup: ISupplier) => {
    setEditingSupplier(sup);
    setSName(sup.name);
    setSContact(sup.contact_name || '');
    setSEmail(sup.email || '');
    setSPhone(sup.phone || '');
    setSTelegram(sup.telegram || '');
    setSNotes(sup.notes || '');
    setSStatus(sup.status);
    setIsSupplierModalOpen(true);
  };

  const handleCloseSupplierModal = () => {
    setIsSupplierModalOpen(false);
    setEditingSupplier(null);
    setSName('');
    setSContact('');
    setSEmail('');
    setSPhone('');
    setSTelegram('');
    setSNotes('');
    setSStatus('active');
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return alert('Vui lòng nhập tên nhà cung cấp.');
    const body = {
      name: sName.trim(), contact_name: sContact.trim(), email: sEmail.trim(),
      phone: sPhone.trim(), telegram: sTelegram.trim(), notes: sNotes.trim(), status: sStatus
    };
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier._id}`, body);
      } else {
        await api.post('/suppliers', body);
      }
      handleCloseSupplierModal();
      await loadSuppliers();
      await loadDashboardStats();
    } catch (err) {
      alert('Không thể lưu thông tin nhà cung cấp.');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const res = await api.delete(`/suppliers/${id}`);
      if (res.data.success) {
        setDeleteConfirmId(null);
        await loadSuppliers();
        await loadDashboardStats();
      }
    } catch (err) {
      alert('Không thể xóa nhà cung cấp.');
    }
  };

  const formatTelegram = (handle: string) => {
    if (!handle) return '';
    const clean = handle.replace('@', '').trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    return `https://t.me/${clean}`;
  };

  // ================= IMPORT HANDLERS =================
  const handleAddImportItem = () => {
    setImportItems([...importItems, { product_type: '', quantity: 1, unit_cost: 0, account_data: '' }]);
  };

  const handleRemoveImportItem = (idx: number) => {
    if (importItems.length === 1) return;
    setImportItems(importItems.filter((_, i) => i !== idx));
  };

  const handleImportItemChange = (idx: number, field: string, value: any) => {
    const items = [...importItems];
    if (field === 'account_data' || field === 'product_type') {
      (items[idx] as any)[field] = value;
    } else {
      (items[idx] as any)[field] = Number(value);
    }
    setImportItems(items);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importSupplierId) return alert('Vui lòng chọn nhà cung cấp.');
    if (importItems.some(item => !item.product_type.trim())) return alert('Vui lòng nhập loại sản phẩm cho tất cả các mục.');

    try {
      const res = await api.post('/suppliers/imports', {
        supplier_id: importSupplierId,
        import_date: importDate || undefined,
        items: importItems.map(item => ({
          product_type: item.product_type.trim(),
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          account_data: item.account_data || '',
        })),
        notes: importNotes,
      });

      if (res.data.success) {
        alert(res.data.message || 'Nhập hàng thành công!');
        setIsImportModalOpen(false);
        setImportSupplierId('');
        setImportDate('');
        setImportItems([{ product_type: '', quantity: 1, unit_cost: 0, account_data: '' }]);
        setImportNotes('');
        await loadImports();
        await loadDashboardStats();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi nhập hàng.');
    }
  };

  // ================= PAYMENT HANDLERS =================
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSupplierId || !paymentAmount) return alert('Vui lòng chọn nhà cung cấp và nhập số tiền.');

    try {
      const res = await api.post('/suppliers/payments', {
        supplier_id: paymentSupplierId,
        import_id: paymentImportId || undefined,
        amount: paymentAmount,
        payment_date: paymentDate || undefined,
        method: paymentMethod,
        reference: paymentReference,
        notes: paymentNotes,
      });

      if (res.data.success) {
        alert('Ghi nhận thanh toán thành công!');
        setIsPaymentModalOpen(false);
        setPaymentSupplierId('');
        setPaymentImportId('');
        setPaymentAmount(0);
        setPaymentDate('');
        setPaymentMethod('bank_transfer');
        setPaymentReference('');
        setPaymentNotes('');
        await loadPayments();
        await loadDashboardStats();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi ghi nhận thanh toán.');
    }
  };

  // ================= RENDER: DASHBOARD TAB =================
  const renderDashboard = () => {
    if (loadingStats) return <p>Đang tải dữ liệu tổng quan...</p>;
    if (!dashboardStats) return <p>Không có dữ liệu.</p>;

    const d = dashboardStats;

    return (
      <div>
        {/* Stats Grid */}
        <div className="stats-grid-4" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FBFBFD, #F5F5F7)' }}>
            <div className="stat-card-icon" style={{ backgroundColor: '#E3F2FD', color: '#0071E3' }}><FiBriefcase /></div>
            <div className="stat-card-info">
              <h3>Nhà Cung Cấp</h3>
              <p style={{ fontWeight: 700 }}>{d.suppliers.total} tổng · {d.suppliers.active} HĐ</p>
            </div>
          </div>
          <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #F3E8FF, #E8D5FF)' }}>
            <div className="stat-card-icon" style={{ backgroundColor: '#F3E8FF', color: '#AF52DE' }}><FiDownload /></div>
            <div className="stat-card-info">
              <h3>Phiếu Nhập</h3>
              <p style={{ fontWeight: 700, color: '#AF52DE' }}>{d.imports.total} phiếu · {formatCurrency(d.imports.totalCost)}</p>
            </div>
          </div>
          <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #EBF9EB, #D1F2D1)' }}>
            <div className="stat-card-icon" style={{ backgroundColor: '#E8F5E9', color: '#34C759' }}><FiDollarSign /></div>
            <div className="stat-card-info">
              <h3>Đã Thanh Toán</h3>
              <p style={{ color: '#2E7D32', fontWeight: 700 }}>{formatCurrency(d.payments.totalAmount)}</p>
            </div>
          </div>
          <div className="stat-card widget" style={{ background: d.outstandingDebt > 0 ? 'linear-gradient(135deg, #FFEBEA, #FFCDCC)' : 'linear-gradient(135deg, #EBF9EB, #D1F2D1)' }}>
            <div className="stat-card-icon" style={{ backgroundColor: d.outstandingDebt > 0 ? '#FFEBEA' : '#E8F5E9', color: d.outstandingDebt > 0 ? '#FF3B30' : '#34C759' }}><FiTrendingUp /></div>
            <div className="stat-card-info">
              <h3>Công Nợ</h3>
              <p style={{ color: d.outstandingDebt > 0 ? '#C62828' : '#2E7D32', fontWeight: 700 }}>
                {d.outstandingDebt > 0 ? formatCurrency(d.outstandingDebt) : 'Không nợ'}
              </p>
            </div>
          </div>
        </div>

        {/* Account stats */}
        <div className="widget" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Tài Khoản Đã Nhập Từ Nhà Cung Cấp</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <div><strong>{d.accounts.total}</strong> Tổng tài khoản</div>
            <div><strong style={{ color: '#34C759' }}>{d.accounts.available}</strong> Còn trong kho</div>
            <div><strong style={{ color: '#0071E3' }}>{d.accounts.sold}</strong> Đã bán</div>
            <div><strong>{formatCurrency(d.accounts.totalCost)}</strong> Tổng vốn</div>
          </div>
        </div>

        {/* Top Suppliers + Debt */}
        <div className="supplier-dashboard-grid" style={{ marginBottom: '2rem' }}>
          <div className="widget" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Top Đối Tác Nhập Hàng Nhiều Nhất</h3>
            {d.topSuppliers.length === 0 ? (
              <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Chưa có dữ liệu nhập hàng.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-light)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>Đối Tác</th>
                      <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>SL Nhập</th>
                      <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>Tổng Chi</th>
                      <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>Đã Trả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.topSuppliers.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}><strong>{s.name}</strong></td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{s.importCount}</td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{formatCurrency(s.totalImportCost)}</td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap', color: '#34C759' }}>{formatCurrency(s.totalPaid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="widget" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Công Nợ Theo Đối Tác</h3>
            {d.debtBySupplier.length === 0 ? (
              <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Không có công nợ.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-light)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>Đối Tác</th>
                      <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>Tổng Nhập</th>
                      <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>Đã Trả</th>
                      <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>Còn Nợ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.debtBySupplier.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}><strong>{s.name}</strong></td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{formatCurrency(s.totalImportCost)}</td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{formatCurrency(s.totalPaid)}</td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap', color: s.debt > 0 ? '#FF3B30' : '#34C759', fontWeight: 600 }}>
                          {formatCurrency(s.debt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ================= RENDER: DIRECTORY TAB =================
  const renderDirectory = () => {
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
    const inactiveSuppliers = suppliers.filter(s => s.status === 'inactive').length;

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
        {/* Stats */}
        <div className="stats-grid-3" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FBFBFD, #F5F5F7)' }}>
            <div className="stat-card-icon" style={{ backgroundColor: '#E3F2FD', color: '#0071E3' }}><FiBriefcase /></div>
            <div className="stat-card-info"><h3>Tổng Nhà Cung Cấp</h3><p style={{ fontWeight: 700 }}>{totalSuppliers} đối tác</p></div>
          </div>
          <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #EBF9EB, #D1F2D1)' }}>
            <div className="stat-card-icon" style={{ backgroundColor: '#E8F5E9', color: '#34C759' }}><FiCheckCircle /></div>
            <div className="stat-card-info"><h3>Đang Hoạt Động</h3><p style={{ color: '#2E7D32', fontWeight: 700 }}>{activeSuppliers} đang cấp hàng</p></div>
          </div>
          <div className="stat-card widget" style={{ background: 'linear-gradient(135deg, #FFEBEA, #FFCDCC)' }}>
            <div className="stat-card-icon" style={{ backgroundColor: '#FFEBEA', color: '#FF3B30' }}><FiXCircle /></div>
            <div className="stat-card-info"><h3>Tạm Ngừng</h3><p style={{ color: '#C62828', fontWeight: 700 }}>{inactiveSuppliers} đối tác</p></div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="widget" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', padding: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <FiSearch style={{ position: 'absolute', left: '16px', top: '13px', color: 'var(--text-light)' }} />
            <input type="text" placeholder="Tìm tên, người đại diện, Telegram..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '44px', borderRadius: '30px', border: '1px solid var(--border-color)', height: '40px', width: '100%', marginBottom: 0 }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0 1rem', borderRadius: '20px', border: '1px solid var(--border-color)', outline: 'none', height: '40px', minWidth: '140px', fontSize: '0.85rem' }}>
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm dừng</option>
          </select>
          <button className="login-button" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 1.25rem', borderRadius: '20px', fontSize: '0.85rem' }}
            onClick={() => setIsSupplierModalOpen(true)}>
            <FiPlusCircle /> Thêm Đối Tác
          </button>
        </div>

        {/* Table */}
        {loading ? <p>Đang tải...</p> : error ? <p style={{ color: 'red' }}>{error}</p> : (
          <div className="table-container widget">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Tên Đối Tác</th>
                  <th>Người Đại Diện</th>
                  <th>Liên Hệ</th>
                  <th>Telegram</th>
                  <th>Trạng Thái</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length > 0 ? filteredSuppliers.map(item => (
                  <tr key={item._id}>
                    <td>
                      <strong style={{ color: '#1D1D1F', fontSize: '0.95rem' }}>{item.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>{item.notes || 'Không có ghi chú'}</div>
                    </td>
                    <td><strong>{item.contact_name || 'N/A'}</strong></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.825rem' }}>
                        {item.phone && <div><FiPhone style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {item.phone}</div>}
                        {item.email && <div style={{ color: 'var(--text-light)' }}><FiMail style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {item.email}</div>}
                      </div>
                    </td>
                    <td>{item.telegram ? (
                      <a href={formatTelegram(item.telegram)} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#E1F5FE', color: '#0288D1', padding: '4px 10px', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                        <FiSend /> @{item.telegram.replace('@', '')}
                      </a>
                    ) : <span style={{ fontStyle: 'italic', color: 'var(--text-light)', fontSize: '0.8rem' }}>Chưa cập nhật</span>}</td>
                    <td>
                      <span className="product-badge" style={{
                        backgroundColor: item.status === 'active' ? '#EBF9EB' : '#FFEBEA',
                        color: item.status === 'active' ? '#34C759' : '#FF3B30', fontSize: '0.75rem',
                        padding: '3px 8px', borderRadius: '10px', fontWeight: 700
                      }}>{item.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button className="btn-edit-sm" onClick={() => handleEditClick(item)} title="Chỉnh sửa"><FiEdit size={14} /></button>
                        <button className="btn-delete-sm" onClick={() => setDeleteConfirmId(item._id)} title="Xóa"><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>Chưa có thông tin nhà cung cấp.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Supplier Modal */}
        {isSupplierModalOpen && (
          <div className="modal-overlay" onClick={handleCloseSupplierModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '650px' }}>
              <div className="modal-header">
                <h2>{editingSupplier ? 'Sửa Thông Tin' : 'Thêm Nhà Cung Cấp Mới'}</h2>
                <button onClick={handleCloseSupplierModal} className="modal-close-btn">&times;</button>
              </div>
              <form onSubmit={handleSupplierSubmit}>
                <div className="modal-body">
                  <div className="form-group"><label>Tên Nhà Cung Cấp *</label>
                    <input type="text" placeholder="Ví dụ: Shop Key MMO Pro" value={sName} onChange={e => setSName(e.target.value)} required /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group"><label>Người Đại Diện</label>
                      <input type="text" placeholder="Tên người liên hệ" value={sContact} onChange={e => setSContact(e.target.value)} /></div>
                    <div className="form-group"><label>Telegram Handle</label>
                      <input type="text" placeholder="@shopkeymmo" value={sTelegram} onChange={e => setSTelegram(e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group"><label>Số Điện Thoại</label>
                      <input type="text" placeholder="Số điện thoại" value={sPhone} onChange={e => setSPhone(e.target.value)} /></div>
                    <div className="form-group"><label>Email</label>
                      <input type="email" placeholder="email@example.com" value={sEmail} onChange={e => setSEmail(e.target.value)} /></div>
                  </div>
                  <div className="form-group"><label>Ghi Chú</label>
                    <textarea rows={3} placeholder="Thông tin ghi chú..." value={sNotes} onChange={e => setSNotes(e.target.value)} /></div>
                  <div className="form-group"><label>Trạng Thái</label>
                    <select value={sStatus} onChange={e => setSStatus(e.target.value as 'active' | 'inactive')}>
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Tạm dừng</option>
                    </select></div>
                </div>
                <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn-cancel" onClick={handleCloseSupplierModal} style={{ height: '38px', padding: '0 1.25rem' }}>Hủy</button>
                  <button type="submit" className="btn-save" style={{ height: '38px', padding: '0 1.5rem', backgroundColor: '#0071E3' }}>
                    {editingSupplier ? 'Cập Nhật' : 'Thêm Mới'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteConfirmId && (
          <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px', textAlign: 'center', padding: '2rem' }}>
              <FiAlertTriangle style={{ color: '#FF3B30', fontSize: '3rem', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Xác Nhận Xóa?</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Tất cả dữ liệu của nhà cung cấp này sẽ bị xóa.</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-cancel" style={{ flex: 1, height: '40px' }} onClick={() => setDeleteConfirmId(null)}>Hủy</button>
                <button className="btn-save" style={{ flex: 1, height: '40px', backgroundColor: '#FF3B30' }}
                  onClick={() => deleteConfirmId && handleDeleteSupplier(deleteConfirmId)}>Xác nhận xóa</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ================= RENDER: IMPORTS TAB =================
  const renderImports = () => {
    return (
      <div>
        <div className="widget" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'nowrap', flex: '1', minWidth: 0 }}>
            <FiDownload size={20} color="#AF52DE" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap' }}>Phiếu Nhập Hàng</span>
            <select value={importFilterSupplier} onChange={e => setImportFilterSupplier(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', maxWidth: '220px', minWidth: '120px' }}>
              <option value="">Tất cả NCC</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '34px', padding: '0 14px', border: 'none', borderRadius: '8px', backgroundColor: '#AF52DE', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => setIsImportModalOpen(true)}>
            <FiPlusCircle size={14} /> Tạo Phiếu
          </button>
        </div>

        {loadingImports ? <p>Đang tải...</p> : (
          <div className="table-container widget">
            <table className="styled-table">
              <thead>
                <tr>
                  <th className="nowrap">Ngày Nhập</th>
                  <th className="nowrap">Nhà Cung Cấp</th>
                  <th className="nowrap">Số Mặt Hàng</th>
                  <th className="nowrap">Tổng Chi Phí</th>
                  <th className="nowrap">Đã Thanh Toán</th>
                  <th className="nowrap">Trạng Thái TT</th>
                  <th className="nowrap">TK Đã Tạo</th>
                  <th className="nowrap">Ghi Chú</th>
                </tr>
              </thead>
              <tbody>
                {imports.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>Chưa có phiếu nhập nào.</td></tr>
                ) : imports.map(item => {
                  const supplier = typeof item.supplier_id === 'object' ? item.supplier_id : null;
                  return (
                    <tr key={item._id}>
                      <td style={{ fontSize: '0.85rem' }} className="nowrap">{formatShortDate(item.import_date)}</td>
                      <td className="nowrap"><strong>{supplier?.name || 'N/A'}</strong></td>
                      <td className="nowrap">{item.items.length} loại · {item.items.reduce((s, i) => s + i.quantity, 0)} cái</td>
                      <td className="nowrap"><strong>{formatCurrency(item.total_cost)}</strong></td>
                      <td className="nowrap" style={{ color: '#34C759' }}>{formatCurrency(item.paid_amount)}</td>
                      <td className="nowrap">
                        <span className="product-badge" style={{
                          backgroundColor: item.payment_status === 'paid' ? '#EBF9EB' : item.payment_status === 'partial' ? '#FFF8E1' : '#FFEBEA',
                          color: item.payment_status === 'paid' ? '#34C759' : item.payment_status === 'partial' ? '#FF9500' : '#FF3B30',
                          fontSize: '0.75rem', padding: '3px 8px', borderRadius: '10px', fontWeight: 700
                        }}>
                          {item.payment_status === 'paid' ? 'Đã trả' : item.payment_status === 'partial' ? 'Trả 1 phần' : 'Chưa trả'}
                        </span>
                      </td>
                      <td className="nowrap">{item.accounts_created}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-light)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }} className="nowrap">{item.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Import Modal */}
        {isImportModalOpen && (
          <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h2>Nhập Hàng Từ Nhà Cung Cấp</h2>
                <button onClick={() => setIsImportModalOpen(false)} className="modal-close-btn">&times;</button>
              </div>
              <form onSubmit={handleImportSubmit}>
                <div className="modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label>Nhà Cung Cấp *</label>
                      <select value={importSupplierId} onChange={e => setImportSupplierId(e.target.value)} required>
                        <option value="">-- Chọn nhà cung cấp --</option>
                        {suppliers.filter(s => s.status === 'active').map(s => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Ngày Nhập</label>
                      <input type="date" value={importDate} onChange={e => setImportDate(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Danh Sách Hàng Nhập</label>
                    <button type="button" onClick={handleAddImportItem} style={{ backgroundColor: '#E3F2FD', color: '#0071E3', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                      <FiPlus size={14} /> Thêm dòng
                    </button>
                  </div>

                  {importItems.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '0.75rem', background: '#F9F9FB', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E5E5EA' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#1D1D1F' }}>Mặt hàng #{idx + 1}</strong>
                        {importItems.length > 1 && (
                          <button type="button" onClick={() => handleRemoveImportItem(idx)}
                            style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', padding: '2px 6px', fontSize: '0.8rem' }}>
                            <FiTrash2 size={14} /> Xóa
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 1.4fr', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <input type="text" placeholder="Loại SP (VD: Gmail)" value={item.product_type}
                          onChange={e => handleImportItemChange(idx, 'product_type', e.target.value)} required
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
                        <input type="number" placeholder="SL" min={1} value={item.quantity}
                          onChange={e => handleImportItemChange(idx, 'quantity', e.target.value)}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
                        <input type="number" placeholder="Đơn giá" min={0} value={item.unit_cost}
                          onChange={e => handleImportItemChange(idx, 'unit_cost', e.target.value)}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: '0.8rem', color: '#0071E3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: '4px' }}>
                          {formatCurrency(item.quantity * item.unit_cost)}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                          Thông tin tài khoản (mỗi dòng = 1 tài khoản, định dạng: username:password hoặc license_key)
                        </label>
                        <textarea
                          rows={3}
                          placeholder={'user1:pass123\nuser2:pass456\nuser3:pass789'}
                          value={item.account_data}
                          onChange={e => handleImportItemChange(idx, 'account_data', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontFamily: 'monospace', resize: 'vertical' }}
                        />
                      </div>
                    </div>
                  ))}

                  <div style={{ textAlign: 'right', marginTop: '0.75rem', fontWeight: 600, fontSize: '1rem' }}>
                    Tổng cộng: <span style={{ color: '#0071E3' }}>{formatCurrency(importItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0))}</span>
                  </div>

                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Ghi Chú</label>
                    <textarea rows={2} placeholder="Ghi chú cho phiếu nhập này..." value={importNotes} onChange={e => setImportNotes(e.target.value)} />
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: '#FFF8E1', borderRadius: '8px', fontSize: '0.8rem', color: '#795548', marginTop: '0.5rem' }}>
                    <FiInfo style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Hệ thống sẽ tự động tạo tài khoản trong Kho Tài Nguyên với giá nhập tương ứng.
                  </div>
                </div>
                <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn-cancel" onClick={() => setIsImportModalOpen(false)} style={{ height: '38px', padding: '0 1.25rem' }}>Hủy</button>
                  <button type="submit" className="btn-save" style={{ height: '38px', padding: '0 1.5rem', backgroundColor: '#AF52DE' }}>Xác Nhận Nhập Hàng</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ================= RENDER: PAYMENTS TAB =================
  const renderPayments = () => {
    // Tính tổng công nợ từ dashboard stats
    const totalDebt = dashboardStats?.outstandingDebt || 0;

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="widget stat-card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #FBFBFD, #F5F5F7)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-light)', margin: 0 }}>Tổng Đã Thanh Toán</h3>
            <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#34C759' }}>
              {formatCurrency(dashboardStats?.payments.totalAmount || 0)}
            </p>
          </div>
          <div className="widget stat-card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #FBFBFD, #F5F5F7)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-light)', margin: 0 }}>Tổng Nhập Hàng</h3>
            <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#AF52DE' }}>
              {formatCurrency(dashboardStats?.imports.totalCost || 0)}
            </p>
          </div>
          <div className="widget stat-card" style={{ padding: '1rem', background: totalDebt > 0 ? 'linear-gradient(135deg, #FFEBEA, #FFCDCC)' : 'linear-gradient(135deg, #EBF9EB, #D1F2D1)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-light)', margin: 0 }}>Công Nợ Hiện Tại</h3>
            <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: totalDebt > 0 ? '#FF3B30' : '#34C759' }}>
              {totalDebt > 0 ? formatCurrency(totalDebt) : 'Không nợ'}
            </p>
          </div>
          <div className="widget stat-card" 
            onClick={() => setIsPaymentModalOpen(true)}
            style={{ 
              padding: '1rem', 
              background: 'linear-gradient(135deg, #0071E3, #005BB5)', 
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 8px 20px rgba(0, 113, 227, 0.15)',
              border: 'none'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 113, 227, 0.25)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 113, 227, 0.15)';
            }}
          >
            <FiPlusCircle size={20} style={{ marginBottom: '0.25rem' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ghi Nhận Thanh Toán</span>
          </div>
        </div>

        {loadingPayments ? <p>Đang tải...</p> : (
          <div className="table-container widget">
            <table className="styled-table">
              <thead>
                <tr>
                  <th className="nowrap">Ngày TT</th>
                  <th className="nowrap">Nhà Cung Cấp</th>
                  <th className="nowrap">Số Tiền</th>
                  <th className="nowrap">Phương Thức</th>
                  <th className="nowrap">Mã Giao Dịch</th>
                  <th className="nowrap">Ghi Chú</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>Chưa có giao dịch thanh toán nào.</td></tr>
                ) : payments.map(p => {
                  const supplier = typeof p.supplier_id === 'object' ? p.supplier_id : null;
                  const methodLabels: Record<string, string> = { bank_transfer: 'Chuyển khoản', crypto: 'Crypto/USDT', cash: 'Tiền mặt', other: 'Khác' };
                  return (
                    <tr key={p._id}>
                      <td style={{ fontSize: '0.85rem' }} className="nowrap">{formatShortDate(p.payment_date)}</td>
                      <td className="nowrap"><strong>{supplier?.name || 'N/A'}</strong></td>
                      <td className="nowrap"><strong style={{ color: '#34C759' }}>{formatCurrency(p.amount)}</strong></td>
                      <td className="nowrap">
                        <span className="product-badge" style={{
                          backgroundColor: '#E3F2FD', color: '#0071E3', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '10px'
                        }}>{methodLabels[p.method] || p.method}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-light)' }} className="nowrap">{p.reference || '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-light)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }} className="nowrap">{p.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Modal */}
        {isPaymentModalOpen && (
          <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px' }}>
              <div className="modal-header">
                <h2>Ghi Nhận Thanh Toán</h2>
                <button onClick={() => setIsPaymentModalOpen(false)} className="modal-close-btn">&times;</button>
              </div>
              <form onSubmit={handlePaymentSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Nhà Cung Cấp *</label>
                    <select value={paymentSupplierId} onChange={e => setPaymentSupplierId(e.target.value)} required>
                      <option value="">-- Chọn nhà cung cấp --</option>
                      {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Gắn với phiếu nhập (không bắt buộc)</label>
                    <select value={paymentImportId} onChange={e => setPaymentImportId(e.target.value)}>
                      <option value="">-- Thanh toán chung --</option>
                      {imports.filter(i => i.payment_status !== 'paid').map(i => {
                        const supplier = typeof i.supplier_id === 'object' ? i.supplier_id : null;
                        return (
                          <option key={i._id} value={i._id}>
                            {formatShortDate(i.import_date)} - {supplier?.name || 'N/A'} - {formatCurrency(i.total_cost)} (còn {formatCurrency(i.total_cost - i.paid_amount)})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Số Tiền *</label>
                      <input type="number" min={0} placeholder="0" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} required />
                    </div>
                    <div className="form-group">
                      <label>Ngày Thanh Toán</label>
                      <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Phương Thức</label>
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                        <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                        <option value="crypto">Crypto / USDT</option>
                        <option value="cash">Tiền mặt</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Mã Giao Dịch / Proof</label>
                      <input type="text" placeholder="Mã GD, link proof..." value={paymentReference} onChange={e => setPaymentReference(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Ghi Chú</label>
                    <textarea rows={2} placeholder="Ghi chú..." value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
                  </div>
                </div>
                <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn-cancel" onClick={() => setIsPaymentModalOpen(false)} style={{ height: '38px', padding: '0 1.25rem' }}>Hủy</button>
                  <button type="submit" className="btn-save" style={{ height: '38px', padding: '0 1.5rem', backgroundColor: '#34C759' }}>Xác Nhận Thanh Toán</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ================= RENDER: PROFIT TAB =================
  const renderProfit = () => {
    return (
      <div>
        <div className="widget" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <FiTrendingUp size={20} color="#FF9500" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>Phân Tích Lợi Nhuận Theo Nhà Cung Cấp</span>
          </div>
          
          {/* Filters Row */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'nowrap', width: '100%' }}>
            <select value={profitFilter.supplier_id} onChange={e => setProfitFilter(prev => ({ ...prev, supplier_id: e.target.value }))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', flex: 2, minWidth: 0 }}>
              <option value="">Tất cả NCC</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <input type="date" value={profitFilter.from} onChange={e => setProfitFilter(prev => ({ ...prev, from: e.target.value }))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', flex: 1.5, minWidth: 0 }} />
            <span style={{ color: 'var(--text-light)', flexShrink: 0 }}>→</span>
            <input type="date" value={profitFilter.to} onChange={e => setProfitFilter(prev => ({ ...prev, to: e.target.value }))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', flex: 1.5, minWidth: 0 }} />
          </div>

          {/* Button Row */}
          <div>
            <button onClick={loadProfit} className="login-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', padding: '0 1.5rem', borderRadius: '8px', fontSize: '0.85rem', width: '100%', cursor: 'pointer' }}>
              <FiSearch size={14} /> Lọc Kết Quả
            </button>
          </div>
        </div>

        {loadingProfit ? <p>Đang tải...</p> : !profitData ? <p>Nhấn "Lọc" để xem dữ liệu.</p> : (
          <div>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="widget stat-card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #FBFBFD, #F5F5F7)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-light)', margin: 0 }}>Tổng Sản Phẩm</h3>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.25rem 0 0 0' }}>{profitData.summary.totalItems}</p>
              </div>
              <div className="widget stat-card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #FFF8E1, #FFECB3)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-light)', margin: 0 }}>Tổng Vốn</h3>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#FF9500' }}>{formatCurrency(profitData.summary.totalCost)}</p>
              </div>
              <div className="widget stat-card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-light)', margin: 0 }}>Tổng Doanh Thu</h3>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#2E7D32' }}>{formatCurrency(profitData.summary.totalRevenue)}</p>
              </div>
              <div className="widget stat-card" style={{ padding: '1rem', background: profitData.summary.totalProfit >= 0 ? 'linear-gradient(135deg, #E8F5E9, #C8E6C9)' : 'linear-gradient(135deg, #FFEBEA, #FFCDCC)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-light)', margin: 0 }}>Lợi Nhuận</h3>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: profitData.summary.totalProfit >= 0 ? '#2E7D32' : '#C62828' }}>
                  {formatCurrency(profitData.summary.totalProfit)} ({profitData.summary.profitPercent}%)
                </p>
              </div>
            </div>

            {/* Profit by Supplier */}
            <div className="widget" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Lợi Nhuận Theo Nhà Cung Cấp</h3>
              {profitData.profitBySupplier.length === 0 ? (
                <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Không có dữ liệu.</p>
              ) : (
                <table className="styled-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr><th>Nhà Cung Cấp</th><th>SL Bán</th><th>Vốn</th><th>Doanh Thu</th><th>Lợi Nhuận</th><th>Tỉ Lệ</th></tr>
                  </thead>
                  <tbody>
                    {profitData.profitBySupplier.map((ps: any, i: number) => (
                      <tr key={i}>
                        <td><strong>{ps.supplier?.name || 'Không rõ'}</strong></td>
                        <td>{ps.count}</td>
                        <td>{formatCurrency(ps.totalCost)}</td>
                        <td>{formatCurrency(ps.totalRevenue)}</td>
                        <td style={{ color: ps.totalProfit >= 0 ? '#34C759' : '#FF3B30', fontWeight: 600 }}>
                          {formatCurrency(ps.totalProfit)}
                        </td>
                        <td>{ps.totalCost > 0 ? `${((ps.totalProfit / ps.totalCost) * 100).toFixed(1)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ================= MAIN RENDER =================
  const tabItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <FiGrid /> },
    { key: 'directory', label: 'Danh Bạ Đối Tác', icon: <FiBriefcase /> },
    { key: 'imports', label: 'Quản Lý Hàng Nhập', icon: <FiDownload /> },
    { key: 'payments', label: 'Thanh Toán & Công Nợ', icon: <FiDollarSign /> },
    { key: 'profit', label: 'Lợi Nhuận', icon: <FiTrendingUp /> },
  ];

  const descriptions: Record<string, string> = {
    dashboard: 'Tổng quan chi phí nhập hàng, công nợ và hiệu quả kinh doanh theo từng đối tác',
    directory: 'Danh bạ toàn bộ đối tác, nhà cung cấp tài nguyên MMO',
    imports: 'Quản lý phiếu nhập hàng - tự động tạo tài khoản vào Kho Tài Nguyên',
    payments: 'Theo dõi thanh toán, công nợ với từng nhà cung cấp',
    profit: 'Phân tích lợi nhuận, so sánh giá nhập và giá bán theo đối tác',
  };

  return (
    <div>
      {/* Header */}
      <div className="customer-detail-header" style={{ marginBottom: '1rem' }}>
        <h1 className="gradient-title">Quản Lý Nhà Cung Cấp</h1>
        <p>{descriptions[activeTab]}</p>
      </div>

      {/* Tab Selector */}
      <div className="supplier-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid #E5E5EA', paddingBottom: '0.6rem' }}>
        {tabItems.map(tab => (
          <button key={tab.key} onClick={() => setSearchParams({ tab: tab.key })}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
              background: activeTab === tab.key ? 'var(--primary-color)' : 'none',
              color: activeTab === tab.key ? 'white' : 'var(--text-light)',
              fontWeight: 600, borderRadius: '10px',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: activeTab === tab.key ? '0 4px 12px rgba(0, 113, 227, 0.2)' : 'none',
              transition: 'all 0.2s',
              flexShrink: 0
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'directory' && renderDirectory()}
      {activeTab === 'imports' && renderImports()}
      {activeTab === 'payments' && renderPayments()}
      {activeTab === 'profit' && renderProfit()}
    </div>
  );
};

export default NhaCungCap;
