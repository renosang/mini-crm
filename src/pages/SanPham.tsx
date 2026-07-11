import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FiPlus, FiEdit, FiTrash2, FiClock, FiPlusCircle, FiFolder, FiTag,
  FiBox, FiKey, FiUsers, FiLock, FiCopy, FiCheck, FiEye, FiEyeOff, FiGrid, FiLayers, FiList, FiCalendar, FiCheckCircle, FiInfo
} from 'react-icons/fi';

interface IPackage {
  _id?: string;
  name: string;
  price: number;
  durationDays: number;
}

interface IProduct {
  _id: string;
  name: string;
  description?: string;
  productType?: 'share_slot' | 'full_account' | 'key';
  packages: IPackage[];
  createdAt: string;
}

const PRODUCT_TYPES = [
  { value: 'share_slot', label: 'Share slot', color: '#007AFF', bg: '#E1F0FF' },
  { value: 'full_account', label: 'Tài khoản (ID:Pass)', color: '#34C759', bg: '#E8F9EE' },
  { value: 'key', label: 'Key kích hoạt', color: '#FF9500', bg: '#FFF3E0' }
];

const PREMIUM_GRADIENTS = [
  'linear-gradient(135deg, #007AFF 0%, #00C6FF 100%)', // Neon Blue
  'linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)', // Sunset tricolor
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Emerald Green
  'linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)', // Royal Purple
  'linear-gradient(135deg, #FF5E62 0%, #FF9966 100%)', // Sun Orange
  'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', // Lime green
  'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)', // Deep Indigo
  'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)', // Pink Red
  'linear-gradient(135deg, #eb3c5a 0%, #f67831 100%)', // Coral Orange
  'linear-gradient(135deg, #0052D4 0%, #4364F7 50%, #6FB1FC 100%)' // Ice Blue
];

const SanPham: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // States cho quản lý kho hàng inline của sản phẩm
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState<boolean>(false);
  const [selectedInventoryProduct, setSelectedInventoryProduct] = useState<IProduct | null>(null);
  const [inventoryAccounts, setInventoryAccounts] = useState<any[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState<boolean>(false);
  const [inventoryActiveTab, setInventoryActiveTab] = useState<'list' | 'add'>('list');
  const [inventoryImportTab, setInventoryImportTab] = useState<'single' | 'bulk'>('single');
  const [invResourceType, setInvResourceType] = useState<'id_pass' | 'key' | 'slot'>('id_pass');
  const [invIsReusable, setInvIsReusable] = useState<boolean>(false);
  const [invTotalSlots, setInvTotalSlots] = useState<string>('5');
  const [invUsername, setInvUsername] = useState<string>('');
  const [invPasswordAcc, setInvPasswordAcc] = useState<string>('');
  const [invLicenseKey, setInvLicenseKey] = useState<string>('');
  const [invPin, setInvPin] = useState<string>('');
  const [invCost, setInvCost] = useState<string>('');
  const [invValidUntil, setInvValidUntil] = useState<string>('');
  const [invBulkText, setInvBulkText] = useState<string>('');
  const [editingInventoryAccount, setEditingInventoryAccount] = useState<any | null>(null);
  const [visibleInvPasswords, setVisibleInvPasswords] = useState<Record<string, boolean>>({});
  const [showInvPasswordInModal, setShowInvPasswordInModal] = useState<boolean>(false);
  const [copiedInvId, setCopiedInvId] = useState<string | null>(null);

  // Selected product state for adding/editing packages
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);

  // Filter tab state
  const [activeTab, setActiveTab] = useState<string>('all');

  // Modal controls
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);
  const [productName, setProductName] = useState<string>('');
  const [productDesc, setProductDesc] = useState<string>('');
  const [productType, setProductType] = useState<'share_slot' | 'full_account' | 'key'>('share_slot');

  // Package Form controls
  const [isPackageModalOpen, setIsPackageModalOpen] = useState<boolean>(false);
  const [editingPackage, setEditingPackage] = useState<IPackage | null>(null);
  const [packageName, setPackageName] = useState<string>('');
  const [packagePrice, setPackagePrice] = useState<number>(0);
  const [packageDuration, setPackageDuration] = useState<number>(30);
  const [durationPreset, setDurationPreset] = useState<string>('30'); // '30', '90', '180', '365', 'custom'

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<{ success: boolean; data: IProduct[] }>('/products');
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryAccounts = async (productId: string) => {
    try {
      setIsInventoryLoading(true);
      const { data } = await api.get<{ success: boolean; data: any[] }>('/accounts');
      if (data.success) {
        const filtered = data.data.filter(acc => {
          const accProdId = typeof acc.product_id === 'object' ? acc.product_id?._id : acc.product_id;
          return accProdId === productId;
        });
        setInventoryAccounts(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInventoryLoading(false);
    }
  };

  const openInventoryModal = (product: IProduct) => {
    setSelectedInventoryProduct(product);
    setInventoryActiveTab('list');
    setInventoryImportTab('single');
    
    let defaultResType: 'id_pass' | 'key' | 'slot' = 'id_pass';
    if (product.productType === 'share_slot') {
      defaultResType = 'slot';
    } else if (product.productType === 'key') {
      defaultResType = 'key';
    }
    setInvResourceType(defaultResType);
    setInvIsReusable(false);
    setInvTotalSlots(product.productType === 'share_slot' ? '5' : '1');
    
    setInvUsername('');
    setInvPasswordAcc('');
    setInvLicenseKey('');
    setInvPin('');
    setInvCost('');
    setInvValidUntil('');
    setInvBulkText('');
    setEditingInventoryAccount(null);
    
    setIsInventoryModalOpen(true);
    fetchInventoryAccounts(product._id);
  };

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryProduct) return;
    
    if (!editingInventoryAccount && inventoryActiveTab === 'add' && inventoryImportTab === 'bulk') {
      if (!invBulkText.trim()) return alert('Vui lòng nhập danh sách tài nguyên.');
      
      const lines = invBulkText.split('\n').map(l => l.trim()).filter(Boolean);
      const parsedAccounts: any[] = [];
      
      for (const line of lines) {
        if (invResourceType === 'key') {
          parsedAccounts.push({
            product_type: selectedInventoryProduct.name,
            product_id: selectedInventoryProduct._id,
            resource_type: 'key',
            total_slots: 1,
            account_details: { license_key: line },
            cost: Number(invCost || 0),
            valid_until: invValidUntil || null,
            status: 'available',
            used_slots: 0
          });
        } else if (invResourceType === 'id_pass') {
          const parts = line.split('|').map(p => p.trim());
          if (parts.length < 2) {
            return alert(`Dòng tài khoản không hợp lệ (thiếu mật khẩu): "${line}". Định dạng chuẩn: user|pass hoặc user|pass|pin`);
          }
          parsedAccounts.push({
            product_type: selectedInventoryProduct.name,
            product_id: selectedInventoryProduct._id,
            resource_type: 'id_pass',
            total_slots: 1,
            account_details: {
              username: parts[0],
              password_acc: parts[1],
              pin: parts[2] || '',
            },
            cost: Number(invCost || 0),
            valid_until: invValidUntil || null,
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
          setInvBulkText('');
          setInventoryActiveTab('list');
          await fetchInventoryAccounts(selectedInventoryProduct._id);
        }
      } catch (err) {
        alert('Không thể nhập hàng loạt tài nguyên. Vui lòng kiểm tra lại dữ liệu.');
      }
      return;
    }
    
    const body = {
      product_type: selectedInventoryProduct.name,
      product_id: selectedInventoryProduct._id,
      resource_type: invResourceType,
      total_slots: (invResourceType === 'slot' || invIsReusable) ? Number(invTotalSlots || 1) : 1,
      account_details: {
        username: invResourceType !== 'key' ? invUsername : '',
        password_acc: invResourceType === 'id_pass' ? invPasswordAcc : '',
        license_key: invResourceType === 'key' ? invLicenseKey : '',
        pin: invResourceType === 'id_pass' ? invPin : ''
      },
      cost: Number(invCost || 0),
      valid_until: invValidUntil || null
    };

    try {
      if (editingInventoryAccount) {
        const res = await api.put<{ success: boolean }>(`/accounts/${editingInventoryAccount._id}`, body);
        if (res.data.success) {
          alert('Cập nhật tài nguyên thành công!');
          setEditingInventoryAccount(null);
          setInventoryActiveTab('list');
          await fetchInventoryAccounts(selectedInventoryProduct._id);
        }
      } else {
        const res = await api.post<{ success: boolean }>('/accounts', { ...body, status: 'available', used_slots: 0 });
        if (res.data.success) {
          alert('Nhập kho tài nguyên thành công!');
          setInventoryActiveTab('list');
          await fetchInventoryAccounts(selectedInventoryProduct._id);
        }
      }
    } catch (err) {
      alert('Không thể lưu thông tin tài nguyên.');
    }
  };

  const handleDeleteInventoryAccount = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài nguyên này khỏi kho hàng?')) return;
    try {
      const res = await api.delete(`/accounts/${id}`);
      if (res.data.success) {
        alert('Xóa tài nguyên khỏi kho thành công!');
        if (selectedInventoryProduct) {
          await fetchInventoryAccounts(selectedInventoryProduct._id);
        }
      }
    } catch (err) {
      alert('Không thể xóa tài nguyên.');
    }
  };

  const handleEditInventoryAccountClick = (acc: any) => {
    setEditingInventoryAccount(acc);
    setInventoryActiveTab('add');
    setInventoryImportTab('single');
    
    setInvResourceType(acc.resource_type || 'id_pass');
    setInvTotalSlots(String(acc.total_slots || 5));
    setInvIsReusable(acc.resource_type !== 'slot' && (acc.total_slots || 1) > 1);
    setInvUsername(acc.account_details?.username || '');
    setInvPasswordAcc(acc.account_details?.password_acc || '');
    setInvLicenseKey(acc.account_details?.license_key || '');
    setInvPin(acc.account_details?.pin || '');
    setInvCost(String(acc.cost || 0));
    setInvValidUntil(acc.valid_until ? acc.valid_until.substring(0, 10) : '');
  };

  const handleCopyInv = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInvId(id);
    setTimeout(() => setCopiedInvId(null), 1500);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle preset change for packages
  const handlePresetChange = (presetValue: string) => {
    setDurationPreset(presetValue);
    if (presetValue === '30') {
      setPackageDuration(30);
      setPackageName('Gói 1 tháng');
    } else if (presetValue === '90') {
      setPackageDuration(90);
      setPackageName('Gói 3 tháng');
    } else if (presetValue === '180') {
      setPackageDuration(180);
      setPackageName('Gói 6 tháng');
    } else if (presetValue === '365') {
      setPackageDuration(365);
      setPackageName('Gói 12 tháng');
    } else {
      setPackageDuration(30);
      setPackageName('');
    }
  };

  // Handle Product Submit
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert('Vui lòng nhập tên sản phẩm.');
      return;
    }

    try {
      if (editingProduct) {
        const { data } = await api.put(`/products/${editingProduct._id}`, {
          name: productName,
          description: productDesc,
          productType: productType,
        });
        if (data.success) {
          alert('Cập nhật sản phẩm thành công!');
        }
      } else {
        const { data } = await api.post('/products', {
          name: productName,
          description: productDesc,
          productType: productType,
          packages: [],
        });
        if (data.success) {
          alert('Tạo sản phẩm mới thành công!');
        }
      }
      setIsProductModalOpen(false);
      setProductName('');
      setProductDesc('');
      setProductType('share_slot');
      setEditingProduct(null);
      await fetchProducts();
    } catch (err: any) {
      alert('Thao tác thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  // Open Product Modal
  const openProductModal = (product: IProduct | null = null) => {
    if (product) {
      setEditingProduct(product);
      setProductName(product.name);
      setProductDesc(product.description || '');
      setProductType(product.productType || 'share_slot');
    } else {
      setEditingProduct(null);
      setProductName('');
      setProductDesc('');
      setProductType('share_slot');
    }
    setIsProductModalOpen(true);
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này cùng tất cả các gói dịch vụ trực thuộc?')) return;
    try {
      const { data } = await api.delete(`/products/${id}`);
      if (data.success) {
        alert('Xóa sản phẩm thành công!');
        await fetchProducts();
      }
    } catch (err: any) {
      alert('Xóa sản phẩm thất bại.');
    }
  };

  // Handle Package Submit
  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!packageName.trim()) {
      alert('Vui lòng nhập tên gói dịch vụ.');
      return;
    }

    try {
      const { data: fetchRes } = await api.get<{ success: boolean; data: IProduct }>(`/products/${selectedProduct._id}`);
      let currentPackages = fetchRes.success ? fetchRes.data.packages : [...selectedProduct.packages];
      let updatedPackages = [...currentPackages];

      if (editingPackage) {
        updatedPackages = updatedPackages.map(pkg =>
          pkg._id === editingPackage._id ? { ...pkg, name: packageName, price: Number(packagePrice), durationDays: Number(packageDuration) } : pkg
        );
      } else {
        updatedPackages.push({
          name: packageName,
          price: Number(packagePrice),
          durationDays: Number(packageDuration),
        });
      }

      const { data } = await api.put(`/products/${selectedProduct._id}`, {
        packages: updatedPackages
      });

      if (data.success) {
        setIsPackageModalOpen(false);
        setPackageName('');
        setPackagePrice(0);
        setPackageDuration(30);
        setDurationPreset('30');
        setEditingPackage(null);
        setSelectedProduct(null);
        await fetchProducts();
      }
    } catch (err: any) {
      alert('Lưu gói dịch vụ thất bại.');
    }
  };

  // Open Package Modal
  const openPackageModal = (product: IProduct, pkg: IPackage | null = null) => {
    setSelectedProduct(product);
    if (pkg) {
      setEditingPackage(pkg);
      setPackageName(pkg.name);
      setPackagePrice(pkg.price);
      setPackageDuration(pkg.durationDays);
      if ([30, 90, 180, 365].includes(pkg.durationDays)) {
        setDurationPreset(String(pkg.durationDays));
      } else {
        setDurationPreset('custom');
      }
    } else {
      setEditingPackage(null);
      if (product.productType === 'share_slot') {
        setPackageName('Gói 1 tháng');
        setPackagePrice(0);
        setPackageDuration(30);
        setDurationPreset('30');
      } else {
        setPackageName(product.productType === 'key' ? 'Key kích hoạt vĩnh viễn' : 'Gói tài khoản vĩnh viễn');
        setPackagePrice(0);
        setPackageDuration(9999);
        setDurationPreset('custom');
      }
    }
    setIsPackageModalOpen(true);
  };

  // Delete Package
  const handleDeletePackage = async (product: IProduct, pkgId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa gói dịch vụ này?')) return;
    try {
      const updatedPackages = product.packages.filter(p => p._id !== pkgId);
      const { data } = await api.put(`/products/${product._id}`, {
        packages: updatedPackages
      });
      if (data.success) {
        await fetchProducts();
      }
    } catch (err: any) {
      alert('Xóa gói dịch vụ thất bại.');
    }
  };

  const handleSeedData = async () => {
    const defaultProducts = [
      {
        name: 'Canva Pro',
        description: 'Phần mềm thiết kế đồ họa phổ biến toàn cầu',
        productType: 'share_slot',
        packages: [
          { name: 'Gói 1 tháng', price: 20000, durationDays: 30 },
          { name: 'Gói 3 tháng', price: 50000, durationDays: 90 },
          { name: 'Gói 6 tháng', price: 90000, durationDays: 180 },
          { name: 'Gói 12 tháng', price: 150000, durationDays: 365 }
        ]
      },
      {
        name: 'YouTube Premium',
        description: 'Dịch vụ xem YouTube không quảng cáo, nghe nhạc chất lượng cao',
        productType: 'share_slot',
        packages: [
          { name: 'Gói 1 tháng', price: 25000, durationDays: 30 },
          { name: 'Gói 3 tháng', price: 70000, durationDays: 90 },
          { name: 'Gói 12 tháng', price: 240000, durationDays: 365 }
        ]
      },
      {
        name: 'Netflix Premium 4K',
        description: 'Nền tảng xem phim trực tuyến chất lượng cao 4K HDR',
        productType: 'full_account',
        packages: [
          { name: 'Gói 1 tháng', price: 55000, durationDays: 30 },
          { name: 'Gói 3 tháng', price: 150000, durationDays: 90 },
          { name: 'Gói 6 tháng', price: 280000, durationDays: 180 }
        ]
      },
      {
        name: 'ChatGPT Plus (GPT-4o)',
        description: 'Tài khoản OpenAI nâng cấp bản quyền thông minh nhất',
        productType: 'full_account',
        packages: [
          { name: 'Gói 1 tháng (Share)', price: 120000, durationDays: 30 },
          { name: 'Gói 1 tháng (Private)', price: 490000, durationDays: 30 }
        ]
      }
    ];

    try {
      setLoading(true);
      for (const prod of defaultProducts) {
        try {
          await api.post('/products', prod);
        } catch (e) {
          // ignore
        }
      }
      alert('Đồng bộ dữ liệu mẫu thành công!');
      await fetchProducts();
    } catch (err) {
      alert('Đồng bộ thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    if (activeTab === 'all') return true;
    return product.productType === activeTab;
  });

  return (
    <div>
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="gradient-title">Sản Phẩm & Dịch Vụ</h1>
          <p>Quản lý sản phẩm, cấu hình bảng giá và gói dịch vụ.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {products.length === 0 && (
            <button className="login-button" style={{ width: 'auto', backgroundColor: '#8E8E93' }} onClick={handleSeedData}>
              Đồng bộ Dữ Liệu Mẫu
            </button>
          )}
          <button className="login-button" style={{ width: 'auto' }} onClick={() => openProductModal()}>
            <FiPlus style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Tạo Sản Phẩm Mới
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid #ECECEC', marginTop: '1.25rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: activeTab === 'all' ? 'var(--primary-color)' : '#F2F2F7',
            color: activeTab === 'all' ? '#FFF' : '#555',
            whiteSpace: 'nowrap'
          }}
        >
          Tất cả ({products.length})
        </button>
        {PRODUCT_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setActiveTab(type.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === type.value ? type.color : '#F2F2F7',
              color: activeTab === type.value ? '#FFF' : '#555',
              whiteSpace: 'nowrap'
            }}
          >
            {type.label} ({products.filter(p => p.productType === type.value).length})
          </button>
        ))}
      </div>

      {loading && products.length === 0 ? (
        <p>Đang tải danh sách sản phẩm...</p>
      ) : filteredProducts.length === 0 ? (
        <div className="widget" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>
          Chưa có sản phẩm nào thuộc phân loại này. Nhấn nút "Tạo Sản Phẩm Mới" để thêm!
        </div>
      ) : (
        /* DÀN HÀNG NGANG 4 CỘT CHUYÊN NGHIỆP - FIXED HEIGHT */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.5rem',
          paddingBottom: '2rem'
        }}>
          {filteredProducts.map((product, idx) => {
            const currentType = PRODUCT_TYPES.find(t => t.value === product.productType);
            // Cycle through gradients list by element index so each card has a distinct colorful background
            const gradientBg = PREMIUM_GRADIENTS[idx % PREMIUM_GRADIENTS.length];

            return (
              <div
                key={product._id}
                className="widget"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  height: '375px'
                }}
              >
                {/* Khối màu Gradient phía trên chứa tên dịch vụ */}
                <div style={{
                  height: '130px',
                  width: '100%',
                  position: 'relative',
                  background: gradientBg,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  flexShrink: 0
                }}>
                  {/* Dùng thẻ DIV thay H3 kèm style màu chữ trắng cưỡng bức !important để đè CSS chung */}
                  <div style={{
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    margin: 0,
                    textAlign: 'center',
                    color: '#FFFFFF',
                    textShadow: '0 2px 6px rgba(0,0,0,0.35)',
                    letterSpacing: '0.5px',
                    wordBreak: 'break-word',
                    maxHeight: '72px',
                    overflow: 'hidden',
                    lineHeight: '1.25'
                  }}>
                    {product.name}
                  </div>

                  {/* Badge phân loại */}
                  {currentType && (
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      fontSize: '0.65rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      color: '#FFFFFF',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      {currentType.label}
                    </span>
                  )}

                  {/* Icon Sửa/Xóa nổi trên góc ảnh */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => openProductModal(product)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        transition: 'background-color 0.2s'
                      }}
                      title="Sửa sản phẩm"
                    >
                      <FiEdit size={12} style={{ color: '#FFF' }} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product._id)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        color: '#FFD2D2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        transition: 'background-color 0.2s'
                      }}
                      title="Xóa sản phẩm"
                    >
                      <FiTrash2 size={12} style={{ color: '#FFD2D2' }} />
                    </button>
                  </div>
                </div>

                {/* Nội dung bên dưới */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0 0 0.75rem 0', height: '32px', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {product.description || 'Chưa có mô tả cho sản phẩm này.'}
                  </p>

                  {/* Nút thêm gói */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F2F2F7', paddingTop: '0.5rem', marginBottom: '0.5rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>Gói cước</span>
                    <button
                      onClick={() => openPackageModal(product)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: 'var(--primary-color)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <FiPlusCircle /> Thêm Gói
                    </button>
                  </div>

                  {/* Danh sách các gói & giá: Có scrollbar */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '2px'
                  }}>
                    {product.packages && product.packages.length > 0 ? (
                      product.packages.map((pkg, idx) => (
                        <div
                          key={pkg._id || idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.825rem',
                            padding: '4px 6px',
                            backgroundColor: '#F8F9FA',
                            borderRadius: '6px'
                          }}
                        >
                          <span style={{ color: '#333', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }} title={pkg.name}>{pkg.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <strong style={{ color: 'var(--primary-color)' }}>{pkg.price.toLocaleString('vi-VN')}đ</strong>
                            <button
                              onClick={() => openPackageModal(product, pkg)}
                              style={{ border: 'none', background: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '2px' }}
                              title="Sửa gói"
                            >
                              <FiEdit size={10} />
                            </button>
                            <button
                              onClick={() => handleDeletePackage(product, pkg._id || '')}
                              style={{ border: 'none', background: 'none', color: '#FF3B30', cursor: 'pointer', padding: '2px' }}
                              title="Xóa gói"
                            >
                              <FiTrash2 size={10} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic', margin: 'auto', textAlign: 'center' }}>
                        Chưa có gói cước nào.
                      </p>
                    )}
                  </div>
                  {/* Nút Quản lý Kho hàng inline */}
                  <button
                    onClick={() => openInventoryModal(product)}
                    style={{
                      marginTop: '0.6rem',
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--primary-color)',
                      backgroundColor: 'rgba(0, 113, 227, 0.04)',
                      color: 'var(--primary-color)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                  >
                    <FiBox /> Quản lý Kho hàng
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL SẢN PHẨM */}
      {isProductModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProductModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Sửa Sản Phẩm' : 'Tạo Sản Phẩm Mới'}</h2>
              <button onClick={() => setIsProductModalOpen(false)} className="modal-close-btn">&times;</button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Tên sản phẩm */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="prod-name" style={{ fontWeight: 600 }}>Tên Sản Phẩm (Ví dụ: Canva Pro, Netflix Premium)</label>
                  <input
                    type="text"
                    id="prod-name"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    required
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #CCC' }}
                  />
                </div>

                {/* Phân loại dịch vụ */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontWeight: 600 }}>Loại Hình Dịch Vụ</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {PRODUCT_TYPES.map(type => (
                      <label
                        key={type.value}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px',
                          border: `2px solid ${productType === type.value ? type.color : '#ECECEC'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: productType === type.value ? type.bg : '#FFF',
                          transition: 'all 0.2s ease',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          color: productType === type.value ? type.color : '#333'
                        }}
                      >
                        <input
                          type="radio"
                          name="productType"
                          value={type.value}
                          checked={productType === type.value}
                          onChange={() => setProductType(type.value as any)}
                          style={{ display: 'none' }}
                        />
                        {type.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Mô tả sản phẩm */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="prod-desc" style={{ fontWeight: 600 }}>Mô Tả Sản Phẩm</label>
                  <textarea
                    id="prod-desc"
                    rows={2}
                    value={productDesc}
                    onChange={e => setProductDesc(e.target.value)}
                    placeholder="Nhập mô tả hoặc tính năng nổi bật..."
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #CCC', resize: 'vertical' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsProductModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn-save">Lưu Lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GÓI DỊCH VỤ */}
      {isPackageModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPackageModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingPackage ? 'Sửa Gói Cước' : 'Thêm Gói Cước Mới'}</h2>
              <button onClick={() => setIsPackageModalOpen(false)} className="modal-close-btn">&times;</button>
            </div>
            <form onSubmit={handlePackageSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Chọn loại thời hạn - Chỉ hiển thị cho Share slot */}
                {selectedProduct?.productType === 'share_slot' && (
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 600 }}>Thời Hạn Gói</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                      {[
                        { value: '30', label: '1 Tháng' },
                        { value: '90', label: '3 Tháng' },
                        { value: '180', label: '6 Tháng' },
                        { value: '365', label: '12 Tháng' },
                        { value: 'custom', label: 'Tự chọn' }
                      ].map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => handlePresetChange(preset.value)}
                          style={{
                            padding: '8px 4px',
                            borderRadius: '6px',
                            border: durationPreset === preset.value ? '2px solid var(--primary-color)' : '1px solid #CCC',
                            backgroundColor: durationPreset === preset.value ? 'rgba(0, 122, 255, 0.1)' : '#FFF',
                            color: durationPreset === preset.value ? 'var(--primary-color)' : '#333',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nhập số ngày sử dụng (Luôn hiển thị với Tài khoản/Key, hiển thị ở Share slot nếu chọn Tự chọn) */}
                {(selectedProduct?.productType !== 'share_slot' || durationPreset === 'custom') && (
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label htmlFor="pkg-duration" style={{ fontWeight: 600 }}>Thời Hạn Sử Dụng (Số ngày)</label>
                    <input
                      type="number"
                      id="pkg-duration"
                      value={packageDuration}
                      onChange={e => setPackageDuration(Number(e.target.value))}
                      required
                      min={1}
                      style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #CCC' }}
                    />
                    <small style={{ color: 'var(--text-light)' }}>
                      Nhập 9999 cho gói vĩnh viễn hoặc không thời hạn.
                    </small>
                  </div>
                )}

                {/* Tên gói cước */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="pkg-name" style={{ fontWeight: 600 }}>Tên Gói Cước</label>
                  <input
                    type="text"
                    id="pkg-name"
                    value={packageName}
                    onChange={e => setPackageName(e.target.value)}
                    required
                    placeholder="Ví dụ: Gói 1 tháng, Slot Gia Đình, Key Pro"
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #CCC' }}
                  />
                </div>

                {/* Giá bán lẻ */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="pkg-price" style={{ fontWeight: 600 }}>Giá Bán Lẻ (đ)</label>
                  <input
                    type="number"
                    id="pkg-price"
                    value={packagePrice}
                    onChange={e => setPackagePrice(Number(e.target.value))}
                    required
                    min={0}
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #CCC' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsPackageModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn-save">Lưu Gói</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL QUẢN LÝ KHO HÀNG INLINE CỦA SẢN PHẨM */}
      {isInventoryModalOpen && selectedInventoryProduct && (
        <div className="modal-overlay" onClick={() => setIsInventoryModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '95vw' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiBox style={{ color: 'var(--primary-color)' }} /> 
                Kho tài nguyên: {selectedInventoryProduct.name}
              </h2>
              <button onClick={() => setIsInventoryModalOpen(false)} className="modal-close-btn">&times;</button>
            </div>

            {/* Segmented Control cho 2 Tab chính */}
            <div className="segmented-control" style={{ margin: '1rem' }}>
              <button
                type="button"
                className={`segment-button ${inventoryActiveTab === 'list' ? 'active' : ''}`}
                onClick={() => setInventoryActiveTab('list')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <FiList /> Danh sách tồn kho ({inventoryAccounts.length})
              </button>
              <button
                type="button"
                className={`segment-button ${inventoryActiveTab === 'add' ? 'active' : ''}`}
                onClick={() => {
                  setInventoryActiveTab('add');
                  setEditingInventoryAccount(null);
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <FiPlusCircle /> Nhập hàng vào kho
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 1rem 1rem 1rem' }}>
              
              {/* TAB 1: DANH SÁCH TỒN KHO */}
              {inventoryActiveTab === 'list' && (
                <div>
                  {/* Tính toán thống kê Host Family nếu đây là share_slot */}
                  {selectedInventoryProduct.productType === 'share_slot' && !isInventoryLoading && inventoryAccounts.length > 0 && (() => {
                    const totalHosts = inventoryAccounts.length;
                    const totalSlots = inventoryAccounts.reduce((sum, item) => sum + (item.total_slots || 0), 0);
                    const usedSlots = inventoryAccounts.reduce((sum, item) => sum + (item.used_slots || 0), 0);
                    const freeSlots = Math.max(0, totalSlots - usedSlots);

                    return (
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '1rem', 
                        marginBottom: '1.25rem',
                        backgroundColor: '#FAF9FB',
                        border: '1px solid #E5D5F5',
                        borderRadius: '12px',
                        padding: '1rem'
                      }}>
                        <div style={{ textAlign: 'center', borderRight: '1px solid #E5E5EA' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>Tài khoản chủ fam</span>
                          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 0 0', color: '#7B1FA2' }}>{totalHosts} acc</h3>
                        </div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid #E5E5EA' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>Slot đã bán</span>
                          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 0 0', color: '#AF52DE' }}>{usedSlots} / {totalSlots} slot</h3>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>Slot trống khả dụng</span>
                          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 0 0', color: '#34C759' }}>{freeSlots} slot</h3>
                        </div>
                      </div>
                    );
                  })()}

                  {isInventoryLoading ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Đang tải danh sách kho...</p>
                  ) : inventoryAccounts.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)', backgroundColor: '#F5F5F7', borderRadius: '12px' }}>
                      Kho hàng của sản phẩm này đang trống. Nhấp Tab "Nhập hàng vào kho" để bổ sung!
                    </div>
                  ) : (
                    <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                      <table className="styled-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Phân loại</th>
                            <th>Chi tiết tài nguyên</th>
                            <th>Giá vốn</th>
                            <th>Hạn sử dụng</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryAccounts.map((item: any) => (
                            <tr key={item._id}>
                              <td className="nowrap">
                                {item.resource_type === 'key' ? (
                                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#EBF9EB', color: '#2E7D32', fontWeight: 600 }}>
                                    🎟️ Key
                                  </span>
                                ) : item.resource_type === 'slot' ? (
                                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#FAF5FE', color: '#7B1FA2', fontWeight: 600 }}>
                                    👥 Slot
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#E1F5FE', color: '#0288D1', fontWeight: 600 }}>
                                    🔑 ID:Pass
                                  </span>
                                )}
                              </td>
                              <td>
                                {item.resource_type === 'key' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <code style={{ backgroundColor: '#F5F5F7', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 600, color: '#1D1D1F', fontSize: '0.85rem' }}>
                                        {item.account_details?.license_key || '(Trống Key)'}
                                      </code>
                                      {item.account_details?.license_key && (
                                        <button 
                                          onClick={() => handleCopyInv(item.account_details!.license_key!, item._id)}
                                          style={{ background: 'none', border: 'none', color: '#0071E3', cursor: 'pointer', display: 'inline-flex', padding: 0 }}
                                        >
                                          {copiedInvId === item._id ? <FiCheck style={{ color: '#34C759' }} /> : <FiCopy />}
                                        </button>
                                      )}
                                    </div>
                                    {(item.total_slots || 1) > 1 && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                        <div style={{ flex: 1, backgroundColor: '#E5E5EA', height: '6px', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
                                          <div style={{ width: `${Math.min(100, ((item.used_slots || 0) / (item.total_slots || 1)) * 100)}%`, backgroundColor: '#34C759', height: '100%', borderRadius: '3px' }}></div>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2E7D32' }}>
                                          {item.used_slots}/{item.total_slots} đã active
                                        </span>
                                      </div>
                                    )}
                                    {(item.total_slots || 1) > 1 && item.slots_assigned && item.slots_assigned.length > 0 && (
                                      <div style={{ marginTop: '4px', backgroundColor: '#F4FBF6', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E8F5E9', fontSize: '0.75rem' }}>
                                        <div style={{ fontWeight: 600, color: '#2E7D32' }}>Khách hàng active:</div>
                                        <ul style={{ margin: 0, paddingLeft: '12px', color: '#1D1D1F', lineHeight: '1.4' }}>
                                          {item.slots_assigned.map((slot: any, idx: number) => (
                                            <li key={idx}><strong>{slot.customer_id?.name || 'Khách'}</strong> ({slot.assigned_email || 'n/a'})</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ) : item.resource_type === 'slot' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {item.account_details?.username && (
                                      <div style={{ fontSize: '0.85rem' }}>Host Acc: <strong>{item.account_details.username}</strong></div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                      <div style={{ flex: 1, backgroundColor: '#E5E5EA', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, ((item.used_slots || 0) / (item.total_slots || 1)) * 100)}%`, backgroundColor: '#AF52DE', height: '100%' }}></div>
                                      </div>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7B1FA2' }}>
                                        {item.used_slots}/{item.total_slots} slot đã gán
                                      </span>
                                    </div>
                                    {item.slots_assigned && item.slots_assigned.length > 0 ? (
                                      <div style={{ marginTop: '4px', backgroundColor: '#FAF9FC', padding: '6px 10px', borderRadius: '8px', border: '1px solid #F0EDF5', fontSize: '0.75rem' }}>
                                        <div style={{ fontWeight: 600, color: '#7B1FA2' }}>Khách hàng đã gán:</div>
                                        <ul style={{ margin: 0, paddingLeft: '12px', color: '#1D1D1F', lineHeight: '1.4' }}>
                                          {item.slots_assigned.map((slot: any, idx: number) => (
                                            <li key={idx}><strong>{slot.customer_id?.name || 'Khách'}</strong> ({slot.assigned_email || 'n/a'})</li>
                                          ))}
                                        </ul>
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--text-light)', fontSize: '0.75rem', fontStyle: 'italic' }}>Chưa gán slot nào</span>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                    {item.account_details?.username && <div>User: <strong>{item.account_details.username}</strong></div>}
                                    {item.account_details?.password_acc && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>Pass:</span>
                                        <code>{visibleInvPasswords[item._id] ? item.account_details.password_acc : '••••••••'}</code>
                                        <button onClick={() => setVisibleInvPasswords(p => ({ ...p, [item._id]: !p[item._id] }))} style={{ background: 'none', border: 'none', color: '#0071E3', cursor: 'pointer', display: 'inline-flex', padding: 0 }}>
                                          {visibleInvPasswords[item._id] ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                                        </button>
                                      </div>
                                    )}
                                    {item.account_details?.pin && <div>PIN: <code>{item.account_details.pin}</code></div>}
                                    {(item.total_slots || 1) > 1 && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                        <div style={{ flex: 1, backgroundColor: '#E5E5EA', height: '6px', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
                                          <div style={{ width: `${Math.min(100, ((item.used_slots || 0) / (item.total_slots || 1)) * 100)}%`, backgroundColor: '#0071E3', height: '100%' }}></div>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0071E3' }}>
                                          {item.used_slots}/{item.total_slots} đã active
                                        </span>
                                      </div>
                                    )}
                                    {(item.total_slots || 1) > 1 && item.slots_assigned && item.slots_assigned.length > 0 && (
                                      <div style={{ marginTop: '4px', backgroundColor: '#F0F7FF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E1F0FF', fontSize: '0.75rem' }}>
                                        <div style={{ fontWeight: 600, color: '#0071E3' }}>Khách hàng active:</div>
                                        <ul style={{ margin: 0, paddingLeft: '12px', color: '#1D1D1F', lineHeight: '1.4' }}>
                                          {item.slots_assigned.map((slot: any, idx: number) => (
                                            <li key={idx}><strong>{slot.customer_id?.name || 'Khách'}</strong> ({slot.assigned_email || 'n/a'})</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="nowrap" style={{ fontWeight: 600 }}>{item.cost.toLocaleString('vi-VN')} đ</td>
                              <td className="nowrap" style={{ fontSize: '0.8rem' }}>
                                {item.valid_until ? (
                                  <div><FiCalendar style={{ marginRight: '4px', verticalAlign: 'middle' }} />{new Date(item.valid_until).toLocaleDateString('vi-VN')}</div>
                                ) : (
                                  <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Vĩnh viễn</span>
                                )}
                              </td>
                              <td className="nowrap">
                                <button type="button" className="btn-edit-sm" onClick={() => handleEditInventoryAccountClick(item)} style={{ marginRight: '6px' }} title="Sửa"><FiEdit size={12} /></button>
                                <button type="button" className="btn-delete-sm" onClick={() => handleDeleteInventoryAccount(item._id)} title="Xóa"><FiTrash2 size={12} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: NHẬP HÀNG MỚI (TỰ ĐỘNG CHUẨN HÓA DƯỚI DẠNG FORM SẠCH SẼ) */}
              {inventoryActiveTab === 'add' && (
                <form onSubmit={handleInventorySubmit}>
                  
                  {/* Switch Sub-tab: Đơn lẻ / Hàng loạt (Chỉ khi không edit) */}
                  {!editingInventoryAccount && (
                    <div className="segmented-control" style={{ marginBottom: '1.25rem' }}>
                      <button
                        type="button"
                        onClick={() => { setInventoryImportTab('single'); }}
                        className={`segment-button ${inventoryImportTab === 'single' ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <FiBox /> Nhập Đơn lẻ
                      </button>
                      <button
                        type="button"
                        onClick={() => { setInventoryImportTab('bulk'); }}
                        className={`segment-button ${inventoryImportTab === 'bulk' ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <FiGrid /> Nhập Hàng loạt
                      </button>
                    </div>
                  )}

                  {/* Form Nhập Đơn lẻ */}
                  {inventoryImportTab === 'single' ? (
                    <div style={{ border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px', backgroundColor: '#FAFBFD', marginBottom: '1.25rem' }}>
                      
                      {/* Checkbox Tái sử dụng (Nếu không phải slot) */}
                      {invResourceType !== 'slot' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', padding: '8px 12px', backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E5E5EA' }}>
                          <input 
                            type="checkbox" 
                            id="inv-reusable-check" 
                            checked={invIsReusable} 
                            onChange={e => {
                              setInvIsReusable(e.target.checked);
                              if (e.target.checked && (invTotalSlots === '1' || invTotalSlots === '5')) {
                                setInvTotalSlots('1000');
                              }
                            }}
                            style={{ width: 'auto', cursor: 'pointer', margin: 0 }}
                          />
                          <label htmlFor="inv-reusable-check" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, color: 'var(--primary-color)' }}>
                            Tái sử dụng (Kích hoạt được nhiều lần / Multi-use)
                          </label>
                        </div>
                      )}

                      {/* Các input theo phân loại */}
                      {invResourceType === 'key' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="inv-key">License Key / Dòng Key Kích Hoạt</label>
                            <input 
                              type="text" 
                              id="inv-key" 
                              placeholder="Nhập Key (Ví dụ: WP-KEY-8F8D-9E9C)" 
                              value={invLicenseKey} 
                              onChange={e => setInvLicenseKey(e.target.value)} 
                              required={invResourceType === 'key'}
                            />
                          </div>
                          {invIsReusable && (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor="inv-total-slots">Số lần kích hoạt tối đa của Key này</label>
                              <input 
                                type="number" 
                                id="inv-total-slots" 
                                placeholder="Ví dụ: 1000" 
                                value={invTotalSlots} 
                                onChange={e => setInvTotalSlots(e.target.value)} 
                                required={invIsReusable}
                                min="1"
                              />
                            </div>
                          )}
                        </div>
                      ) : invResourceType === 'slot' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor="inv-user">Tài khoản Host (Email / Username)</label>
                              <input 
                                type="text" 
                                id="inv-user" 
                                placeholder="Email của tài khoản chủ Family/Team" 
                                value={invUsername} 
                                onChange={e => setInvUsername(e.target.value)} 
                                required={invResourceType === 'slot'}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor="inv-total-slots">Tổng số Slot của Host</label>
                              <input 
                                type="number" 
                                id="inv-total-slots" 
                                placeholder="Ví dụ: 5" 
                                value={invTotalSlots} 
                                onChange={e => setInvTotalSlots(e.target.value)} 
                                required={invResourceType === 'slot'}
                                min="1"
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor="inv-pass">Mật khẩu Host (Nếu có)</label>
                              <input 
                                type="text" 
                                id="inv-pass" 
                                placeholder="Không bắt buộc" 
                                value={invPasswordAcc} 
                                onChange={e => setInvPasswordAcc(e.target.value)} 
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor="inv-pin">Mã PIN / Ghi chú Host</label>
                              <input 
                                type="text" 
                                id="inv-pin" 
                                placeholder="Ghi chú thêm về Host" 
                                value={invPin} 
                                onChange={e => setInvPin(e.target.value)} 
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor="inv-user">Tài Khoản / Username</label>
                              <input 
                                type="text" 
                                id="inv-user" 
                                placeholder="Email hoặc Tên đăng nhập" 
                                value={invUsername} 
                                onChange={e => setInvUsername(e.target.value)} 
                                required={invResourceType === 'id_pass'}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor="inv-pass">Mật Khẩu</label>
                              <input 
                                type="text" 
                                id="inv-pass" 
                                placeholder="Mật khẩu tài khoản" 
                                value={invPasswordAcc} 
                                onChange={e => setInvPasswordAcc(e.target.value)} 
                                required={invResourceType === 'id_pass'}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: invIsReusable ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor="inv-pin">PIN Profile / Ghi chú profile</label>
                              <input 
                                type="text" 
                                id="inv-pin" 
                                placeholder="Ví dụ: Profile 3 - PIN 1234" 
                                value={invPin} 
                                onChange={e => setInvPin(e.target.value)} 
                              />
                            </div>
                            {invIsReusable && (
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="inv-total-slots">Số lần sử dụng tối đa của Tài khoản này</label>
                                <input 
                                  type="number" 
                                  id="inv-total-slots" 
                                  placeholder="Ví dụ: 1000" 
                                  value={invTotalSlots} 
                                  onChange={e => setInvTotalSlots(e.target.value)} 
                                  required={invIsReusable}
                                  min="1"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Form Nhập Hàng loạt */
                    <div style={{ border: '1px solid #34C759', padding: '1.25rem', borderRadius: '12px', backgroundColor: '#F4FBF6', marginBottom: '1.25rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label htmlFor="inv-bulk-data" style={{ fontWeight: 600 }}>
                          Dán danh sách tài nguyên (Mỗi dòng một sản phẩm):
                        </label>
                        <textarea
                          id="inv-bulk-data"
                          rows={6}
                          value={invBulkText}
                          onChange={e => setInvBulkText(e.target.value)}
                          placeholder={
                            invResourceType === 'key'
                              ? "WP-KEY-8F8D-9E9C\nWP-KEY-2F3D-4A5B..."
                              : "user1@gmail.com|pass123\nuser2@gmail.com|pass456|pin1234..."
                          }
                          style={{ fontFamily: 'monospace', fontSize: '0.85rem', padding: '10px', width: '100%', borderRadius: '8px', border: '1px solid #C3E6CB' }}
                        />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#555', backgroundColor: '#E8F5E9', padding: '8px 12px', borderRadius: '8px' }}>
                        <FiInfo style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        <strong>Quy tắc:</strong> Dạng Key: mỗi dòng 1 key. Dạng ID:Pass: nhập theo dạng <code>user|pass</code> hoặc <code>user|pass|pin</code>.
                      </div>
                    </div>
                  )}

                  {/* Giá vốn và hạn sử dụng */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label htmlFor="inv-cost">Giá Vốn Nhập Hàng (đ)</label>
                      <input type="number" id="inv-cost" value={invCost} onChange={e => setInvCost(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="inv-valid">Hạn Sử Dụng</label>
                      <input type="date" id="inv-valid" value={invValidUntil} onChange={e => setInvValidUntil(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-cancel" onClick={() => setInventoryActiveTab('list')}>Quay lại</button>
                    <button type="submit" className="btn-save">
                      {editingInventoryAccount ? 'Cập Nhật' : inventoryImportTab === 'bulk' ? 'Nhập Hàng loạt' : 'Nhập Kho ngay'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SanPham;
