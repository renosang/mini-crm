import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
    FiFileText, FiSend, FiTruck, FiAlertTriangle, FiEye, FiCopy,
    FiRefreshCw, FiDollarSign, FiClock, FiSearch, FiList,
    FiCheckCircle, FiXCircle, FiUser, FiKey, FiBox, FiAlertCircle,
    FiRotateCcw
} from 'react-icons/fi';

interface ICustomer { _id: string; name: string; phone?: string; email?: string; }
interface IOrder {
    _id: string; invoice_id: string; customer_id: ICustomer | null;
    items: any[]; product_name?: string; total_amount: number;
    quantity?: number; selling_price?: number;
    status: string; payment_method?: string;
    delivery_status: string; delivered_keys: any[]; revoked_keys: any[];
    refund_status: string; refund_reason: string;
    logs: any[]; sla_warning: boolean; createdAt: string;
}

const filterTabs = [
    { key: 'all', label: 'Tất cả', icon: <FiList /> },
    { key: 'pending', label: 'Chờ TT', icon: <FiClock /> },
    { key: 'paid', label: 'Đã TT', icon: <FiCheckCircle /> },
    { key: 'delivered', label: 'Đã giao', icon: <FiTruck /> },
    { key: 'error', label: 'Lỗi/SLA', icon: <FiAlertTriangle /> },
    { key: 'refunded', label: 'Hoàn tiền', icon: <FiRotateCcw /> },
];

const productTypeTabs = [
    { key: '', label: 'Tất cả' },
    { key: 'key', label: 'Key' },
    { key: 'account', label: 'Tài khoản' },
    { key: 'service', label: 'Dịch vụ' },
];

const HoaDon: React.FC = () => {
    const [orders, setOrders] = useState<IOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [productFilter, setProductFilter] = useState('');
    const [searchQ, setSearchQ] = useState('');
    const [viewingOrder, setViewingOrder] = useState<IOrder | null>(null);
    const [showKeys, setShowKeys] = useState(false);
    const [refundReason, setRefundReason] = useState('');

    useEffect(() => { loadOrders(); }, [activeTab]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await api.get('/orders');
            if (res.data.success) {
                let data = res.data.data;
                // SLA check
                const now = Date.now();
                for (const o of data) {
                    if (o.status === 'paid' && o.delivery_status !== 'delivered') {
                        const paidAt = o.logs?.find((l: any) => l.action === 'paid')?.timestamp;
                        if (paidAt && now - new Date(paidAt).getTime() > 5 * 60 * 1000) {
                            o.sla_warning = true;
                        }
                    }
                }
                setOrders(data);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleDeliver = async (id: string) => {
        try { await api.post('/orders/' + id + '/invoice-actions', { action: 'deliver' }); alert('Đã giao key!'); loadOrders(); setViewingOrder(null); }
        catch (err: any) { alert('Lỗi: ' + err.message); }
    };

    const handleRefund = async (id: string) => {
        if (!refundReason.trim()) { alert('Nhập lý do hoàn tiền'); return; }
        try { await api.post('/orders/' + id + '/invoice-actions', { action: 'refund', reason: refundReason }); alert('Đã hoàn tiền!'); loadOrders(); setViewingOrder(null); setRefundReason(''); }
        catch (err: any) { alert('Lỗi: ' + err.message); }
    };

    const copyKeys = (keys: any[]) => {
        const text = keys.map(k => k.key).filter(Boolean).join('\n');
        navigator.clipboard.writeText(text);
        alert('Đã copy ' + keys.length + ' key!');
    };

    const getStatusBadge = (status: string) => {
        const map: any = {
            pending: { bg: '#FFF5E6', color: '#D27B00', label: 'Chờ TT' },
            paid: { bg: '#F0F9F1', color: '#2E7D32', label: 'Đã TT' },
            cancelled: { bg: '#FFEBEA', color: '#D32F2F', label: 'Đã hủy' },
        };
        const s = map[status] || map.pending;
        return <span style={{ padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
    };

    const getDeliveryBadge = (ds: string, sla: boolean) => {
        if (sla) return <span style={{ padding: '3px 10px', borderRadius: 99, background: '#FF3B30', color: '#FFF', fontSize: 11, fontWeight: 700 }}>⚠ SLA</span>;
        const map: any = {
            not_delivered: { bg: '#F5F5F7', color: '#86868B', label: 'Chưa giao' },
            delivered: { bg: '#E8F5E9', color: '#2E7D32', label: 'Đã giao' },
            error: { bg: '#FFEBEA', color: '#D32F2F', label: 'Lỗi' },
        };
        const s = map[ds] || map.not_delivered;
        return <span style={{ padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
    };

    const getProductType = (order: IOrder): string => {
        const names = order.items?.map(i => i.name).join(' ') || order.product_name || '';
        if (names.toLowerCase().includes('key') || names.toLowerCase().includes('license')) return 'key';
        if (names.toLowerCase().includes('tài khoản') || names.toLowerCase().includes('account') || names.toLowerCase().includes('netflix') || names.toLowerCase().includes('spotify')) return 'account';
        return 'service';
    };

    let filteredOrders = orders;
    if (activeTab === 'pending') filteredOrders = orders.filter(o => o.status === 'pending');
    else if (activeTab === 'paid') filteredOrders = orders.filter(o => o.status === 'paid' && o.delivery_status !== 'delivered');
    else if (activeTab === 'delivered') filteredOrders = orders.filter(o => o.delivery_status === 'delivered');
    else if (activeTab === 'error') filteredOrders = orders.filter(o => o.sla_warning || o.delivery_status === 'error');
    else if (activeTab === 'refunded') filteredOrders = orders.filter(o => o.refund_status === 'refunded');

    if (productFilter) filteredOrders = filteredOrders.filter(o => getProductType(o) === productFilter);
    if (searchQ) filteredOrders = filteredOrders.filter(o => o.customer_id?.name?.toLowerCase().includes(searchQ.toLowerCase()));

    return (
        <div>
            <div className="customer-detail-header" style={{ marginBottom: '1.25rem' }}>
                <h1 className="gradient-title">Quản Lý Hóa Đơn</h1>
                <p>Giao key, theo dõi thanh toán & xử lý hoàn tiền</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {filterTabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            style={{ border: 'none', background: activeTab === tab.key ? '#0071E3' : '#F5F5F7', color: activeTab === tab.key ? '#FFF' : '#1D1D1F', padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select value={productFilter} onChange={e => setProductFilter(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 12, background: '#FFF' }}>
                        {productTypeTabs.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <div style={{ position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: 10, top: 9, color: '#8E8E93' }} />
                        <input type="text" placeholder="Tìm khách..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                            style={{ padding: '7px 12px 7px 32px', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13, width: 200 }} />
                    </div>
                </div>
            </div>

            {loading ? <p>Đang tải...</p> : (
                <div className="table-container widget" style={{ boxShadow: 'var(--shadow)' }}>
                    <table className="styled-table">
                        <thead><tr>
                            <th className="nowrap">Mã HĐ</th><th className="nowrap">Khách hàng</th><th className="nowrap">Loại SP</th>
                            <th className="nowrap">SL Key</th><th className="nowrap">Tổng tiền</th><th className="nowrap">Thanh toán</th>
                            <th className="nowrap">Giao key</th><th className="nowrap">Ngày tạo</th><th className="nowrap">Thao tác</th>
                        </tr></thead>
                        <tbody>
                            {filteredOrders.length > 0 ? filteredOrders.map(o => (
                                <tr key={o._id} style={{ background: o.sla_warning ? '#FFF5F5' : undefined }}>
                                    <td className="nowrap">
                                        <button onClick={() => setViewingOrder(o)}
                                            style={{ background: 'none', border: 'none', padding: 0, color: '#0071E3', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                                            #{o.invoice_id || o._id.substring(o._id.length - 6).toUpperCase()}
                                        </button>
                                        {o.sla_warning && <FiAlertCircle style={{ color: '#FF3B30', marginLeft: 4, fontSize: 12 }} />}
                                    </td>
                                    <td className="nowrap">{o.customer_id ? <Link to={'/customers/' + o.customer_id._id} style={{ fontWeight: 600 }}>{o.customer_id.name}</Link> : '—'}</td>
                                    <td className="nowrap"><span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: getProductType(o) === 'key' ? '#EBF5FF' : getProductType(o) === 'account' ? '#FFF0E6' : '#F0F9F1', color: getProductType(o) === 'key' ? '#0071E3' : getProductType(o) === 'account' ? '#D27B00' : '#2E7D32', fontWeight: 600 }}>{getProductType(o) === 'key' ? '🔑 Key' : getProductType(o) === 'account' ? '👤 TK' : '⚙ DV'}</span></td>
                                    <td className="nowrap">{o.delivered_keys?.length || o.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0}</td>
                                    <td className="nowrap" style={{ fontWeight: 700 }}>{o.total_amount.toLocaleString('vi-VN')} đ</td>
                                    <td className="nowrap">{getStatusBadge(o.status)}</td>
                                    <td className="nowrap">{getDeliveryBadge(o.delivery_status, o.sla_warning)}</td>
                                    <td className="nowrap" style={{ fontSize: 12, color: '#8E8E93' }}>{new Date(o.createdAt).toLocaleDateString('vi-VN')}</td>
                                    <td className="nowrap">
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button onClick={() => setViewingOrder(o)} title="Chi tiết" style={{ border: 'none', background: 'none', color: '#0071E3', cursor: 'pointer', fontSize: 14, padding: 4 }}><FiEye /></button>
                                            {o.status === 'paid' && o.delivery_status !== 'delivered' && <button onClick={() => handleDeliver(o._id)} title="Giao key" style={{ border: 'none', background: 'none', color: '#34C759', cursor: 'pointer', fontSize: 14, padding: 4 }}><FiTruck /></button>}
                                            {o.delivered_keys?.length > 0 && <button onClick={() => copyKeys(o.delivered_keys)} title="Copy key" style={{ border: 'none', background: 'none', color: '#5856D6', cursor: 'pointer', fontSize: 14, padding: 4 }}><FiCopy /></button>}
                                        </div>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#8E8E93' }}>Không có hóa đơn nào</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Modal */}
            {viewingOrder && (
                <div className="modal-overlay" onClick={() => { setViewingOrder(null); setShowKeys(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '97vw' }}>
                        <div className="modal-header"><h2><FiFileText style={{ marginRight: 6 }} /> Chi Tiết Hóa Đơn #{viewingOrder.invoice_id || viewingOrder._id.substring(viewingOrder._id.length - 6).toUpperCase()}</h2><button onClick={() => { setViewingOrder(null); setShowKeys(false); }} className="modal-close-btn">&times;</button></div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 5 }}>
                            {/* Customer */}
                            <div style={{ background: '#F8F9FC', borderRadius: 14, padding: '1rem', marginBottom: 16, border: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div><strong><FiUser style={{ marginRight: 6 }} />{viewingOrder.customer_id?.name || 'Khách lẻ'}</strong><span style={{ color: '#86868B', marginLeft: 12, fontSize: 13 }}>{viewingOrder.customer_id?.phone || ''} | {viewingOrder.customer_id?.email || ''}</span></div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div><span style={{ color: '#86868B', fontSize: 11 }}>Thanh toán</span><div>{getStatusBadge(viewingOrder.status)}</div></div>
                                    <div><span style={{ color: '#86868B', fontSize: 11 }}>Giao key</span><div>{getDeliveryBadge(viewingOrder.delivery_status, viewingOrder.sla_warning)}</div></div>
                                    <div><span style={{ color: '#86868B', fontSize: 11 }}>Hoàn tiền</span><div><span style={{ fontSize: 12, fontWeight: 600 }}>{viewingOrder.refund_status === 'refunded' ? '✅ Đã hoàn' : viewingOrder.refund_status === 'requested' ? '⏳ Đang xử lý' : '—'}</span></div></div>
                                </div>
                            </div>

                            {/* Items */}
                            <div style={{ marginBottom: 16 }}>
                                <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>📦 Sản phẩm</h4>
                                <table className="styled-table"><thead><tr><th>Tên SP</th><th>SL</th><th>Đơn giá</th><th style={{ textAlign: 'right' }}>Thành tiền</th></tr></thead>
                                    <tbody>
                                        {viewingOrder.items && viewingOrder.items.length > 0 ? viewingOrder.items.map((it: any, i: number) => (
                                            <tr key={i}><td style={{ fontWeight: 600 }}>{it.name}</td><td>{it.quantity}</td><td>{it.price.toLocaleString('vi-VN')} đ</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{(it.price * it.quantity).toLocaleString('vi-VN')} đ</td></tr>
                                        )) : viewingOrder.product_name ? (
                                            <tr><td style={{ fontWeight: 600 }}>{viewingOrder.product_name}</td><td>{viewingOrder.quantity || 1}</td><td>{(viewingOrder.selling_price || 0).toLocaleString('vi-VN')} đ</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{viewingOrder.total_amount.toLocaleString('vi-VN')} đ</td></tr>
                                        ) : <tr><td colSpan={4} style={{ textAlign: 'center', color: '#8E8E93' }}>—</td></tr>}
                                    </tbody></table>
                            </div>

                            {/* Keys */}
                            {viewingOrder.delivered_keys && viewingOrder.delivered_keys.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <h4 style={{ margin: 0, fontSize: 14 }}>🔐 Key đã giao ({viewingOrder.delivered_keys.length})</h4>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => setShowKeys(!showKeys)} style={{ border: 'none', background: 'none', color: '#0071E3', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{showKeys ? 'Ẩn' : 'Hiện'} key</button>
                                            <button onClick={() => copyKeys(viewingOrder.delivered_keys)} style={{ border: 'none', background: 'none', color: '#5856D6', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}><FiCopy /> Copy tất cả</button>
                                        </div>
                                    </div>
                                    <div className="table-container" style={{ border: '1px solid #EEE', borderRadius: 10, overflow: 'hidden' }}>
                                        <table className="styled-table"><thead><tr><th>#</th><th>Sản phẩm</th><th>Key</th></tr></thead>
                                            <tbody>{viewingOrder.delivered_keys.map((k: any, i: number) => (
                                                <tr key={i}><td>{i + 1}</td><td>{k.product_name}</td><td><code style={{ background: '#F5F5F7', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{showKeys ? k.key : '••••••••' + (k.key || '').substring((k.key || '').length - 4)}</code></td></tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Refund section */}
                            {viewingOrder.refund_status === 'refunded' && viewingOrder.revoked_keys?.length > 0 && (
                                <div style={{ marginBottom: 16, background: '#FFF5F5', borderRadius: 10, padding: 12, border: '1px solid #FFD2D2' }}>
                                    <h4 style={{ margin: '0 0 6px', fontSize: 14, color: '#D32F2F' }}>🔄 Key đã thu hồi</h4>
                                    <table className="styled-table"><tbody>{viewingOrder.revoked_keys.map((k: any, i: number) => (
                                        <tr key={i}><td>{k.product_name}</td><td><code style={{ color: '#D32F2F' }}>{k.key}</code></td><td style={{ fontSize: 11 }}>{k.reason}</td></tr>
                                    ))}</tbody></table>
                                </div>
                            )}

                            {/* Action buttons */}
                            {viewingOrder.status === 'paid' && viewingOrder.delivery_status !== 'delivered' && (
                                <div style={{ marginBottom: 16 }}>
                                    <button onClick={() => handleDeliver(viewingOrder._id)} style={{ border: 'none', background: '#34C759', color: '#FFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <FiTruck /> Giao Key Ngay
                                    </button>
                                </div>
                            )}

                            {viewingOrder.status !== 'cancelled' && viewingOrder.refund_status !== 'refunded' && (
                                <div style={{ marginBottom: 16, background: '#FFFDF0', borderRadius: 10, padding: 14, border: '1px solid #FFEBB3' }}>
                                    <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#D27B00' }}>🔄 Hoàn tiền</h4>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="text" placeholder="Lý do hoàn tiền..." value={refundReason} onChange={e => setRefundReason(e.target.value)}
                                            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13 }} />
                                        <button onClick={() => handleRefund(viewingOrder._id)}
                                            style={{ border: 'none', background: '#FF3B30', color: '#FFF', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                            Hoàn tiền & Thu hồi
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Logs */}
                            {viewingOrder.logs && viewingOrder.logs.length > 0 && (
                                <div>
                                    <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>📋 Nhật ký</h4>
                                    <div style={{ background: '#FAFAFC', borderRadius: 10, padding: 12, border: '1px solid #E5E5EA', maxHeight: 200, overflowY: 'auto' }}>
                                        {viewingOrder.logs.map((log: any, i: number) => (
                                            <div key={i} style={{ fontSize: 12, color: '#515154', padding: '6px 0', borderBottom: '1px solid #F0F0F3', display: 'flex', gap: 8 }}>
                                                <span style={{ color: '#86868B', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                                                <span style={{ fontWeight: 600, color: '#0071E3' }}>{log.action}</span>
                                                <span>{log.detail}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer"><button type="button" className="btn-cancel" onClick={() => { setViewingOrder(null); setShowKeys(false); }}>Đóng</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HoaDon;