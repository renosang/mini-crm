import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiFileText, FiPlus, FiSend, FiCopy, FiCheckCircle, FiTrash2, FiEye, FiClock, FiUser, FiSearch, FiTag, FiList } from 'react-icons/fi';

interface ICustomer { _id: string; name: string; phone?: string; email?: string; }
interface IQuotation { _id: string; customer_id: ICustomer | null; items: any[]; subtotal: number; discount_amount: number; tax_rate: number; tax_amount: number; activation_fee: number; grand_total: number; customer_note: string; internal_note: string; terms: string; status: string; expires_at: string | null; email_sent_at: string | null; email_opened_at: string | null; email_clicked_at: string | null; createdAt: string; }
interface IProduct { _id: string; name: string; productType?: string; }

const statusTabs = [
    { key: 'all', label: 'Tất cả', icon: <FiList /> },
    { key: 'draft', label: 'Nháp', icon: <FiFileText /> },
    { key: 'sent', label: 'Đã gửi', icon: <FiSend /> },
    { key: 'viewed', label: 'Đã xem', icon: <FiEye /> },
    { key: 'confirmed', label: 'Xác nhận', icon: <FiCheckCircle /> },
    { key: 'converted', label: 'Đơn hàng', icon: <FiTag /> },
    { key: 'expired', label: 'Hết hạn', icon: <FiClock /> },
];

const BaoGia: React.FC = () => {
    const [quotations, setQuotations] = useState<IQuotation[]>([]);
    const [customers, setCustomers] = useState<ICustomer[]>([]);
    const [products, setProducts] = useState<IProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQ, setSearchQ] = useState('');

    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [formItems, setFormItems] = useState<Array<{ product_id: string; name: string; product_type: string; quantity: number; unit_price: number }>>([]);
    const [productSearchIndex, setProductSearchIndex] = useState<number | null>(null);
    const [productSearch, setProductSearch] = useState('');
    const [validityDays, setValidityDays] = useState(7);
    const [discountType, setDiscountType] = useState('');
    const [discountValue, setDiscountValue] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const [activationFee, setActivationFee] = useState('');
    const [customerNote, setCustomerNote] = useState('');
    const [internalNote, setInternalNote] = useState('');
    const [terms, setTerms] = useState('1. Chính sách 1 đổi 1 nếu key lỗi\n2. Hướng dẫn kích hoạt tài khoản\n3. Lưu ý không share tài khoản cho nhiều thiết bị');

    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showEmailPreview, setShowEmailPreview] = useState<any>(null);

    useEffect(() => { loadData(); }, []);
    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const statusParam = activeTab === 'all' ? '' : '?status=' + activeTab;
            const [resQ, resC, resP] = await Promise.all([
                api.get('/quotations' + statusParam),
                api.get('/customers'),
                api.get('/products'),
            ]);
            if (resQ.data.success) setQuotations(resQ.data.data);
            if (resC.data.success) setCustomers(resC.data.data);
            if (resP.data.success) setProducts(resP.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || (c.phone && c.phone.includes(customerSearchQuery)));
    const filteredProducts = products.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase()));

    const addItem = () => setFormItems([...formItems, { product_id: '', name: '', product_type: 'key', quantity: 1, unit_price: 0 }]);
    const removeItem = (idx: number) => setFormItems(formItems.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: string, value: any) => {
        const updated = [...formItems];
        (updated[idx] as any)[field] = value;
        setFormItems(updated);
    };
    const selectProduct = (idx: number, product: IProduct) => {
        updateItem(idx, 'product_id', product._id);
        updateItem(idx, 'name', product.name);
        updateItem(idx, 'product_type', product.productType || 'key');
        setProductSearchIndex(null);
        setProductSearch('');
    };
    const calcSubtotal = () => formItems.reduce((s: number, it: any) => s + it.unit_price * it.quantity, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerId || formItems.length === 0) { alert('Vui lòng chọn khách hàng và ít nhất 1 sản phẩm'); return; }
        try {
            await api.post('/quotations', { customer_id: selectedCustomerId, items: formItems, validity_days: validityDays, discount_type: discountType, discount_value: Number(discountValue) || 0, tax_rate: Number(taxRate) || 0, activation_fee: Number(activationFee) || 0, customer_note: customerNote, internal_note: internalNote, terms });
            setIsModalOpen(false);
            resetForm();
            loadData();
        } catch (err: any) { alert('Lỗi: ' + (err.response?.data?.message || err.message)); }
    };

    const handleSendEmail = async (id: string) => {
        if (!window.confirm('Gửi email báo giá cho khách hàng?')) return;
        try {
            const res = await api.get('/quotations/' + id + '/send-email?preview=true');
            if (res.data.success) { setShowEmailPreview({ id, ...res.data }); setShowPreviewModal(true); }
        } catch (err: any) { alert('Lỗi: ' + (err.response?.data?.message || err.message)); }
    };
    const handleConfirmSend = async (id: string) => {
        try {
            const res = await api.get('/quotations/' + id + '/send-email');
            if (res.data.success) { alert('Đã gửi email báo giá!'); setShowPreviewModal(false); loadData(); }
        } catch (err: any) { alert('Lỗi: ' + err.message); }
    };
    const handleClone = async (id: string) => {
        try { await api.post('/quotations/' + id + '/actions', { action: 'clone' }); loadData(); }
        catch (err: any) { alert('Lỗi: ' + err.message); }
    };
    const handleConvert = async (id: string) => {
        if (!window.confirm('Chuyển báo giá này thành đơn hàng?')) return;
        try { await api.put('/quotations/' + id + '/actions', { action: 'convert' }); alert('Đã chuyển thành đơn hàng!'); loadData(); }
        catch (err: any) { alert('Lỗi: ' + err.message); }
    };
    const handleDelete = async (id: string) => {
        if (!window.confirm('Xóa báo giá này?')) return;
        try { await api.delete('/quotations/' + id); loadData(); }
        catch (err: any) { alert('Lỗi: ' + err.message); }
    };
    const resetForm = () => {
        setSelectedCustomerId(''); setCustomerSearchQuery(''); setFormItems([]);
        setValidityDays(7); setDiscountType(''); setDiscountValue(''); setTaxRate(''); setActivationFee('');
        setCustomerNote(''); setInternalNote(''); setTerms('1. Chính sách 1 đổi 1 nếu key lỗi\n2. Hướng dẫn kích hoạt tài khoản\n3. Lưu ý không share tài khoản cho nhiều thiết bị');
    };

    const getStatusBadge = (status: string) => {
        const map: any = {
            draft: { bg: '#F5F5F7', color: '#1D1D1F', label: 'Nháp' },
            sent: { bg: '#EBF5FF', color: '#0071E3', label: 'Đã gửi' },
            viewed: { bg: '#FFF5E6', color: '#D27B00', label: 'Đã xem' },
            confirmed: { bg: '#F0F9F1', color: '#2E7D32', label: 'Xác nhận' },
            converted: { bg: '#E8F5E9', color: '#1565C0', label: 'Đơn hàng' },
            expired: { bg: '#FFEBEA', color: '#D32F2F', label: 'Hết hạn' },
            cancelled: { bg: '#F5F5F7', color: '#86868B', label: 'Đã hủy' }
        };
        const s = map[status] || map.draft;
        return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
    };

    const filteredQuotations = searchQ ? quotations.filter(q => q.customer_id?.name?.toLowerCase().includes(searchQ.toLowerCase())) : quotations;

    return (
        <div>
            <div className="customer-detail-header" style={{ marginBottom: '1.25rem' }}>
                <h1 className="gradient-title">Quản Lý Báo Giá</h1>
                <p>Tạo & gửi báo giá chuyên nghiệp, tracking trạng thái khách hàng</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {statusTabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            style={{ border: 'none', background: activeTab === tab.key ? '#0071E3' : '#F5F5F7', color: activeTab === tab.key ? '#FFF' : '#1D1D1F', padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <div style={{ position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: 10, top: 9, color: '#8E8E93' }} />
                        <input type="text" placeholder="Tìm khách hàng..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                            style={{ padding: '7px 12px 7px 32px', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13, width: 200 }} />
                    </div>
                    <button className="login-button" style={{ width: 'auto', padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { resetForm(); setIsModalOpen(true); }}>
                        <FiPlus /> Tạo Báo Giá
                    </button>
                </div>
            </div>

            {loading ? <p>Đang tải...</p> : (
                <div className="table-container widget" style={{ boxShadow: 'var(--shadow)' }}>
                    <table className="styled-table">
                        <thead><tr><th className="nowrap">Mã BG</th><th className="nowrap">Khách hàng</th><th className="nowrap">Số SP</th><th className="nowrap">Tổng tiền</th><th className="nowrap">Trạng thái</th><th className="nowrap">Ngày tạo</th><th className="nowrap">Thao tác</th></tr></thead>
                        <tbody>
                            {filteredQuotations.length > 0 ? filteredQuotations.map(q => (
                                <tr key={q._id}>
                                    <td className="nowrap"><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0071E3' }}>#{q._id.substring(q._id.length - 6).toUpperCase()}</span></td>
                                    <td className="nowrap">{q.customer_id ? <Link to={'/customers/' + q.customer_id._id} style={{ fontWeight: 600 }}>{q.customer_id.name}</Link> : '—'}</td>
                                    <td className="nowrap">{q.items?.length || 0}</td>
                                    <td className="nowrap" style={{ fontWeight: 700 }}>{q.grand_total.toLocaleString('vi-VN')} đ</td>
                                    <td className="nowrap">{getStatusBadge(q.status)}</td>
                                    <td className="nowrap" style={{ fontSize: 12, color: '#8E8E93' }}>{new Date(q.createdAt).toLocaleDateString('vi-VN')}</td>
                                    <td className="nowrap">
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button onClick={() => handleSendEmail(q._id)} title="Gửi email" style={{ border: 'none', background: 'none', color: '#0071E3', cursor: 'pointer', fontSize: 14, padding: 4 }}><FiSend /></button>
                                            <button onClick={() => handleClone(q._id)} title="Nhân bản" style={{ border: 'none', background: 'none', color: '#5856D6', cursor: 'pointer', fontSize: 14, padding: 4 }}><FiCopy /></button>
                                            {q.status !== 'converted' && <button onClick={() => handleConvert(q._id)} title="Chuyển → Đơn hàng" style={{ border: 'none', background: 'none', color: '#34C759', cursor: 'pointer', fontSize: 14, padding: 4 }}><FiCheckCircle /></button>}
                                            <button onClick={() => handleDelete(q._id)} title="Xóa" style={{ border: 'none', background: 'none', color: '#FF3B30', cursor: 'pointer', fontSize: 14, padding: 4 }}><FiTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#8E8E93' }}>Chưa có báo giá nào</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '820px', maxWidth: '97vw' }}>
                        <div className="modal-header"><h2><FiFileText style={{ marginRight: 6, verticalAlign: 'middle' }} /> Tạo Báo Giá Mới</h2><button onClick={() => setIsModalOpen(false)} className="modal-close-btn">&times;</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 5 }}>
                                <div className="form-group" style={{ position: 'relative' }}>
                                    <label>Khách hàng</label>
                                    <div style={{ position: 'relative' }}>
                                        <FiSearch style={{ position: 'absolute', left: 12, top: 13, color: '#8E8E93' }} />
                                        <input type="text" placeholder="Tìm khách hàng..." value={customerSearchQuery}
                                            onChange={e => { setCustomerSearchQuery(e.target.value); setShowCustomerDropdown(true); }}
                                            onFocus={() => setShowCustomerDropdown(true)} style={{ paddingLeft: 35 }} />
                                        {showCustomerDropdown && customerSearchQuery.trim() !== '' && (
                                            <div style={{ position: 'absolute', width: '100%', zIndex: 100, background: '#FFF', border: '1px solid #DDD', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.1)', maxHeight: 160, overflowY: 'auto' }}>
                                                {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                                    <div key={c._id} onClick={() => { setSelectedCustomerId(c._id); setCustomerSearchQuery(c.name); setShowCustomerDropdown(false); }}
                                                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                                                        <strong>{c.name}</strong><span style={{ color: '#8E8E93', fontSize: 12 }}>{c.phone || ''}</span>
                                                    </div>
                                                )) : <div style={{ padding: '0.75rem 1rem', color: '#8E8E93', fontStyle: 'italic' }}>Không tìm thấy</div>}
                                            </div>
                                        )}
                                    </div>
                                    {selectedCustomerId && <div style={{ marginTop: 6, padding: '4px 10px', background: '#EBF5FF', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#0071E3' }}><FiUser style={{ marginRight: 6 }} />{customers.find(c => c._id === selectedCustomerId)?.name}</div>}
                                </div>
                                <div className="form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label style={{ margin: 0 }}>Sản phẩm báo giá</label>
                                        <button type="button" onClick={addItem} style={{ border: 'none', background: 'none', color: '#0071E3', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><FiPlus /> Thêm dòng</button>
                                    </div>
                                    {formItems.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: 8, alignItems: 'center', position: 'relative' }}>
                                            <div style={{ flex: 2, position: 'relative' }}>
                                                <input type="text" placeholder="Chọn sản phẩm..." value={item.name}
                                                    onFocus={() => { setProductSearchIndex(idx); setProductSearch(''); }}
                                                    onChange={e => { updateItem(idx, 'name', e.target.value); setProductSearch(e.target.value); setProductSearchIndex(idx); }}
                                                    style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #D2D2D7', width: '100%' }} />
                                                {productSearchIndex === idx && (
                                                    <div style={{ position: 'absolute', width: '100%', zIndex: 50, background: '#FFF', border: '1px solid #DDD', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', maxHeight: 140, overflowY: 'auto' }}>
                                                        {filteredProducts.map(p => (
                                                            <div key={p._id} onClick={() => selectProduct(idx, p)} style={{ padding: '0.45rem 0.75rem', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #F5F5F7' }}>
                                                                {p.name} <span style={{ color: '#8E8E93', fontSize: 11 }}>({p.productType || 'key'})</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))} style={{ width: 65, padding: '0.5rem', borderRadius: 8, border: '1px solid #D2D2D7', textAlign: 'center' }} />
                                            <input type="number" min={0} value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} placeholder="Đơn giá" style={{ width: 120, padding: '0.5rem', borderRadius: 8, border: '1px solid #D2D2D7' }} />
                                            <button type="button" onClick={() => removeItem(idx)} style={{ border: 'none', background: 'none', color: '#FF3B30', cursor: 'pointer', padding: 4 }}><FiTrash2 /></button>
                                        </div>
                                    ))}
                                    {formItems.length > 0 && <div style={{ marginTop: 8, textAlign: 'right', fontWeight: 600, fontSize: 14, color: '#0071E3' }}>Tạm tính: {calcSubtotal().toLocaleString('vi-VN')} đ</div>}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label>Hiệu lực (ngày)</label><input type="number" min={1} value={validityDays} onChange={e => setValidityDays(Math.max(1, Number(e.target.value)))} /></div>
                                    <div className="form-group"><label>Chiết khấu</label><div style={{ display: 'flex', gap: 4 }}>
                                        <select value={discountType} onChange={e => setDiscountType(e.target.value)} style={{ width: 80, padding: '0.5rem', borderRadius: 8, border: '1px solid #D2D2D7' }}><option value="">Không</option><option value="percentage">%</option><option value="fixed">VNĐ</option></select>
                                        <input type="number" min={0} value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="0" style={{ flex: 1 }} /></div></div>
                                    <div className="form-group"><label>VAT (%)</label><input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="0" /></div>
                                </div>
                                <div className="form-group"><label>Phí kích hoạt (đ)</label><input type="number" min={0} value={activationFee} onChange={e => setActivationFee(e.target.value)} placeholder="0" /></div>
                                <div className="form-group"><label>Ghi chú khách hàng</label><textarea rows={2} value={customerNote} onChange={e => setCustomerNote(e.target.value)} placeholder="Hiển thị với khách..." /></div>
                                <div className="form-group"><label>Ghi chú nội bộ</label><textarea rows={2} value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="Nội bộ..." /></div>
                                <div className="form-group"><label>Điều khoản sử dụng & bảo hành</label><textarea rows={3} value={terms} onChange={e => setTerms(e.target.value)} /></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy</button><button type="submit" className="btn-save">Tạo Báo Giá</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showPreviewModal && showEmailPreview && (
                <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '880px', maxWidth: '95vw' }}>
                        <div className="modal-header"><h2>Xem Trước Email Báo Giá</h2><button onClick={() => setShowPreviewModal(false)} className="modal-close-btn">&times;</button></div>
                        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '1rem' }}>
                            <div style={{ background: '#FFF', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E5EA' }} dangerouslySetInnerHTML={{ __html: showEmailPreview.previewHtml || '' }} />
                        </div>
                        <div className="modal-footer"><button type="button" className="btn-cancel" onClick={() => setShowPreviewModal(false)}>Hủy</button><button type="button" className="btn-save" onClick={() => handleConfirmSend(showEmailPreview.id)}>Xác Nhận Gửi Email</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BaoGia;
