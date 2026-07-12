import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    FiDollarSign, FiPlus, FiTrash2, FiTrendingUp, FiTrendingDown,
    FiClock, FiAlertCircle, FiRepeat, FiList, FiPieChart
} from 'react-icons/fi';

interface IPnL { totalRevenue: number; cogs: number; totalCost: number; costByCategory: any; profit: number; expenseCount: number; orderCount: number; }
interface IExpense { _id: string; category: string; amount: number; description: string; status: string; expense_date: string; recurring_config?: any; supplier_id?: any; }

const categoryTabs = [
    { key: '', label: 'Tất cả', icon: <FiList /> },
    { key: 'recurring', label: 'Định kỳ', icon: <FiRepeat /> },
    { key: 'risk', label: 'Rủi ro', icon: <FiAlertCircle /> },
    { key: 'funding', label: 'Nạp ví', icon: <FiDollarSign /> },
    { key: 'other', label: 'Khác', icon: <FiPieChart /> },
];

const ChiPhi: React.FC = () => {
    const [pnl, setPnl] = useState<IPnL | null>(null);
    const [expenses, setExpenses] = useState<IExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formCategory, setFormCategory] = useState('other');
    const [formAmount, setFormAmount] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formRecurring, setFormRecurring] = useState(false);
    const [formInterval, setFormInterval] = useState(30);

    useEffect(() => { loadData(); }, [categoryFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resPnl, resExp] = await Promise.all([
                api.get('/expenses/pnl'),
                api.get('/expenses' + (categoryFilter ? '?category=' + categoryFilter : '')),
            ]);
            if (resPnl.data.success && resPnl.data.data && typeof resPnl.data.data.totalRevenue === 'number') setPnl(resPnl.data.data);
            if (resExp.data.success && Array.isArray(resExp.data.data)) setExpenses(resExp.data.data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formAmount) { alert('Nhập số tiền'); return; }
        try {
            await api.post('/expenses', {
                category: formCategory, amount: Number(formAmount), description: formDesc,
                recurring_config: formRecurring ? { enabled: true, interval_days: formInterval, next_due_date: new Date(Date.now() + formInterval * 86400000) } : undefined
            });
            setIsModalOpen(false); loadData();
            setFormAmount(''); setFormDesc(''); setFormRecurring(false); setFormInterval(30);
        } catch (err: any) { alert('Lỗi: ' + err.message); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xóa chi phí này?')) return;
        try { await api.delete('/expenses/' + id); loadData(); } catch { }
    };

    const catLabel = (c: string) => ({ recurring: 'Định kỳ', risk: 'Rủi ro', funding: 'Nạp ví', other: 'Khác' } as any)[c] || c;
    const catColor = (c: string) => ({ recurring: '#0071E3', risk: '#D32F2F', funding: '#D27B00', other: '#5856D6' } as any)[c] || '#86868B';

    if (loading && !pnl) return <p>Đang tải...</p>;

    return (
        <div>
            <div className="customer-detail-header" style={{ marginBottom: '1.25rem' }}>
                <h1 className="gradient-title">Quản Lý Chi Phí</h1>
                <p>Theo dõi chi phí vận hành & phân tích lợi nhuận</p>
            </div>

            {/* P&L Dashboard Cards */}
            {pnl && (
                <div className="stats-grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.5rem' }}>
                    <div className="stat-card widget stat-card-blue">
                        <div className="stat-card-icon"><FiTrendingUp /></div>
                        <div className="stat-card-info"><h3>Tổng Doanh Thu</h3><p className="stat-card-value">{pnl.totalRevenue.toLocaleString('vi-VN')} đ</p></div>
                    </div>
                    <div className="stat-card widget stat-card-orange">
                        <div className="stat-card-icon"><FiDollarSign /></div>
                        <div className="stat-card-info"><h3>Giá Vốn (COGS)</h3><p className="stat-card-value">{pnl.cogs.toLocaleString('vi-VN')} đ</p></div>
                    </div>
                    <div className="stat-card widget stat-card-red">
                        <div className="stat-card-icon"><FiTrendingDown /></div>
                        <div className="stat-card-info"><h3>Tổng Chi Phí</h3><p className="stat-card-value">{pnl.totalCost.toLocaleString('vi-VN')} đ</p></div>
                    </div>
                    <div className="stat-card widget" style={{ background: pnl.profit >= 0 ? 'linear-gradient(135deg, #E8F5E9, #C8E6C9)' : 'linear-gradient(135deg, #FFEBEA, #FFD2D2)' }}>
                        <div className="stat-card-icon" style={{ color: pnl.profit >= 0 ? '#2E7D32' : '#D32F2F' }}><FiDollarSign /></div>
                        <div className="stat-card-info"><h3>Lợi Nhuận Ròng</h3><p className="stat-card-value" style={{ color: pnl.profit >= 0 ? '#2E7D32' : '#D32F2F' }}>{pnl.profit.toLocaleString('vi-VN')} đ</p></div>
                    </div>
                </div>
            )}

            {/* Category Breakdown */}
            {pnl && pnl.costByCategory && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {Object.entries(pnl.costByCategory).map(([cat, amt]: any) => (
                        <span key={cat} style={{ padding: '4px 12px', borderRadius: 99, background: catColor(cat) + '15', color: catColor(cat), fontSize: 12, fontWeight: 600 }}>
                            {catLabel(cat)}: {amt.toLocaleString('vi-VN')} đ
                        </span>
                    ))}
                </div>
            )}

            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {categoryTabs.map(tab => (
                        <button key={tab.key} onClick={() => setCategoryFilter(tab.key)}
                            style={{ border: 'none', background: categoryFilter === tab.key ? '#0071E3' : '#F5F5F7', color: categoryFilter === tab.key ? '#FFF' : '#1D1D1F', padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
                <button className="login-button" style={{ width: 'auto', padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsModalOpen(true)}>
                    <FiPlus /> Thêm Chi Phí
                </button>
            </div>

            {/* Table */}
            {loading ? <p>Đang tải...</p> : (
                <div className="table-container widget" style={{ boxShadow: 'var(--shadow)' }}>
                    <table className="styled-table">
                        <thead><tr>
                            <th>Ngày</th><th>Loại</th><th>Mô tả</th><th>Số tiền</th><th>Định kỳ</th><th></th>
                        </tr></thead>
                        <tbody>
                            {expenses.length > 0 ? expenses.map(e => (
                                <tr key={e._id}>
                                    <td className="nowrap" style={{ fontSize: 12, color: '#8E8E93' }}>{new Date(e.expense_date).toLocaleDateString('vi-VN')}</td>
                                    <td className="nowrap"><span style={{ padding: '2px 8px', borderRadius: 99, background: catColor(e.category) + '15', color: catColor(e.category), fontSize: 11, fontWeight: 600 }}>{catLabel(e.category)}</span></td>
                                    <td>{e.description}</td>
                                    <td className="nowrap" style={{ fontWeight: 700, color: '#D32F2F' }}>-{e.amount.toLocaleString('vi-VN')} đ</td>
                                    <td className="nowrap">{e.recurring_config?.enabled ? <FiRepeat style={{ color: '#0071E3' }} /> : '—'}</td>
                                    <td className="nowrap"><button onClick={() => handleDelete(e._id)} style={{ border: 'none', background: 'none', color: '#FF3B30', cursor: 'pointer' }}><FiTrash2 /></button></td>
                                </tr>
                            )) : <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#8E8E93' }}>Chưa có chi phí nào</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '500px', maxWidth: '95vw' }}>
                        <div className="modal-header"><h2><FiDollarSign style={{ marginRight: 6 }} /> Thêm Chi Phí</h2><button onClick={() => setIsModalOpen(false)} className="modal-close-btn">&times;</button></div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                                <div className="form-group">
                                    <label>Loại chi phí</label>
                                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                                        <option value="recurring">Định kỳ (gia hạn TK gốc)</option>
                                        <option value="risk">Rủi ro / Bảo hành</option>
                                        <option value="funding">Nạp ví nhà cung cấp</option>
                                        <option value="other">Chi phí khác</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Số tiền (đ)</label>
                                    <input type="number" min={0} value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" required />
                                </div>
                                <div className="form-group">
                                    <label>Mô tả</label>
                                    <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Ví dụ: Gia hạn tài khoản Zoom Master" />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={formRecurring} onChange={e => setFormRecurring(e.target.checked)} /> Chi phí định kỳ
                                    </label>
                                    {formRecurring && (
                                        <div style={{ marginTop: 8 }}>
                                            <label>Chu kỳ (ngày)</label>
                                            <select value={formInterval} onChange={e => setFormInterval(Number(e.target.value))}>
                                                <option value={1}>1 ngày</option><option value={7}>7 ngày</option><option value={30}>30 ngày</option>
                                                <option value={90}>90 ngày</option><option value={180}>180 ngày</option><option value={365}>365 ngày</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy</button>
                                <button type="submit" className="btn-save">Lưu Chi Phí</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChiPhi;
