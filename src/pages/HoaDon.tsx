import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiFileText, FiSend, FiMail, FiAlertTriangle, FiEye, FiCopy, FiCheckCircle, FiClock, FiSearch, FiUser, FiRotateCcw, FiAlertCircle, FiDownload, FiPrinter, FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface ICustomer { _id: string; name: string; phone?: string; email?: string; }
interface IOrder { _id: string; invoice_id: string; customer_id: ICustomer | null; items: any[]; product_name?: string; total_amount: number; quantity?: number; selling_price?: number; cost_price?: number; expiry_date?: string; accounts?: any[]; status: string; payment_method?: string; delivery_status: string; delivered_keys: any[]; revoked_keys: any[]; refund_status: string; refund_reason: string; logs: any[]; sla_warning: boolean; createdAt: string; recurring_invoice?: any; discount_amount?: number; customer_note?: string; internal_note?: string; }

const filterTabs = [{ key: 'all', label: 'Tất cả' }, { key: 'pending', label: 'Chờ TT' }, { key: 'paid', label: 'Đã TT' }, { key: 'delivered', label: 'Đã gửi' }, { key: 'refunded', label: 'Hoàn tiền' }];

const HoaDon: React.FC = () => {
    const [orders, setOrders] = useState<IOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQ, setSearchQ] = useState('');
    const [viewingOrder, setViewingOrder] = useState<IOrder | null>(null);
    const [showPdf, setShowPdf] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [showKeys, setShowKeys] = useState(false);

    useEffect(() => { loadOrders(); }, [activeTab]);

    const loadOrders = async () => {
        setLoading(true);
        try { const res = await api.get('/orders'); if (res.data.success) { const now = Date.now(); for (const o of res.data.data) { if (o.status === 'paid' && o.delivery_status !== 'delivered') { const paidAt = o.logs?.find((l: any) => l.action === 'paid')?.timestamp; if (paidAt && now - new Date(paidAt).getTime() > 5 * 60 * 1000) o.sla_warning = true; } } setOrders(res.data.data); } } catch { } finally { setLoading(false); }
    };

    const handleDeliver = async (id: string) => { try { const res = await api.post('/orders/' + id + '/invoice-actions', { action: 'deliver' }); alert(res.data.successEmail ? 'Đã gửi email bàn giao!' : 'Đã bàn giao!'); loadOrders(); setViewingOrder(null); } catch (err: any) { alert('Lỗi: ' + err.message); } };
    const handleRefund = async (id: string) => { if (!refundReason.trim()) { alert('Nhập lý do'); return; } try { await api.post('/orders/' + id + '/invoice-actions', { action: 'refund', reason: refundReason }); alert('Đã hoàn tiền!'); loadOrders(); setViewingOrder(null); setRefundReason(''); } catch (err: any) { alert('Lỗi: ' + err.message); } };
    const copyKeys = (keys: any[]) => { navigator.clipboard.writeText(keys.map(k => k.key).filter(Boolean).join('\n')); alert('Đã copy ' + keys.length + ' key!'); };

    const getPdfUrl = (id: string) => '/api/orders/pdf/' + id;
    const downloadPdf = (id: string) => { const a = document.createElement('a'); a.href = getPdfUrl(id); a.download = 'hoa-don-' + id + '.pdf'; a.click(); };
    const getStatusBadge = (s: string) => ({ pending: { bg: '#FFF5E6', color: '#D27B00', l: 'Chờ TT' }, paid: { bg: '#F0F9F1', color: '#2E7D32', l: 'Đã TT' }, cancelled: { bg: '#FFEBEA', color: '#D32F2F', l: 'Hủy' } } as any)[s] || { bg: '#F5F5F7', color: '#86868B', l: s };
    const getProductType = (o: IOrder): string => { const n = o.items?.map(i => i.name).join(' ') || o.product_name || ''; return n.toLowerCase().includes('key') || n.toLowerCase().includes('license') ? 'key' : n.toLowerCase().includes('tài khoản') || n.toLowerCase().includes('account') || n.toLowerCase().includes('netflix') ? 'account' : 'service'; };

    let displayOrders = orders;
    if (activeTab === 'pending') displayOrders = orders.filter(o => o.status === 'pending');
    else if (activeTab === 'paid') displayOrders = orders.filter(o => o.status === 'paid' && o.delivery_status !== 'delivered');
    else if (activeTab === 'delivered') displayOrders = orders.filter(o => o.delivery_status === 'delivered');
    else if (activeTab === 'refunded') displayOrders = orders.filter(o => o.refund_status === 'refunded');
    if (searchQ) displayOrders = displayOrders.filter(o => o.customer_id?.name?.toLowerCase().includes(searchQ.toLowerCase()) || (o.invoice_id || '').toLowerCase().includes(searchQ.toLowerCase()));

    const formatMoney = (n: number) => n.toLocaleString('vi-VN') + ' đ';

    return (
        <div>
            <div className="customer-detail-header" style={{ marginBottom: '1rem' }}>
                <h1 className="gradient-title">Quản Lý Hóa Đơn</h1>
                <p>Theo dõi thanh toán, bàn giao key & tải hóa đơn PDF</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {filterTabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ border: 'none', background: activeTab === t.key ? '#0071E3' : '#F5F5F7', color: activeTab === t.key ? '#FFF' : '#1D1D1F', padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{t.label}</button>
                    ))}
                </div>
                <div style={{ position: 'relative' }}>
                    <FiSearch style={{ position: 'absolute', left: 10, top: 9, color: '#8E8E93' }} />
                    <input placeholder="Tìm khách hoặc mã HĐ..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ padding: '7px 12px 7px 32px', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13, width: 220 }} />
                </div>
            </div>

            {loading ? <p style={{ textAlign: 'center', padding: '2rem', color: '#8E8E93' }}>Đang tải...</p> :
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '0.75rem' }}>
                    {displayOrders.length > 0 ? displayOrders.map(o => {
                        const sb = getStatusBadge(o.status);
                        const ptype = getProductType(o);
                        return (
                            <div key={o._id} onClick={() => setViewingOrder(o)} style={{ background: '#FFF', borderRadius: 14, border: '1px solid #EEE', padding: '1rem', cursor: 'pointer', transition: 'box-shadow 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,113,227,0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#0071E3' }}>#{o.invoice_id || o._id.substring(18).toUpperCase()}</div>
                                    <span style={{ padding: '3px 10px', borderRadius: 99, background: sb.bg, color: sb.color, fontSize: 11, fontWeight: 700 }}>{sb.l}</span>
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{o.customer_id?.name || 'Khách lẻ'}</div>
                                <div style={{ fontSize: 12, color: '#8E8E93', marginBottom: 10 }}>{o.items?.length || 0} sản phẩm · {formatMoney(o.total_amount)}</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#6E6E73' }}>
                                    {ptype === 'key' && <span style={{ padding: '2px 8px', borderRadius: 99, background: '#EBF5FF', color: '#0071E3', fontWeight: 600 }}>🔑 Key</span>}
                                    {ptype === 'account' && <span style={{ padding: '2px 8px', borderRadius: 99, background: '#FFF0E6', color: '#D27B00', fontWeight: 600 }}>👤 Tài khoản</span>}
                                    {o.delivery_status === 'delivered' && <span style={{ padding: '2px 8px', borderRadius: 99, background: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }}>📨 Đã gửi</span>}
                                    {o.refund_status === 'refunded' && <span style={{ padding: '2px 8px', borderRadius: 99, background: '#FFEBEA', color: '#D32F2F', fontWeight: 600 }}>🔄 Đã hoàn</span>}
                                    <span>{new Date(o.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F0F5' }}>
                                    <button onClick={(e) => { e.stopPropagation(); setViewingOrder(o); setShowPdf(true); }} style={pdfBtn}><FiFileText /> Xem PDF</button>
                                    <button onClick={(e) => { e.stopPropagation(); downloadPdf(o._id); }} style={dlBtn}><FiDownload /> Tải</button>
                                    {o.status === 'paid' && o.delivery_status !== 'delivered' && <button onClick={(e) => { e.stopPropagation(); handleDeliver(o._id); }} style={delBtn}><FiMail /> Gửi</button>}
                                    {o.delivered_keys?.length > 0 && <button onClick={(e) => { e.stopPropagation(); copyKeys(o.delivered_keys); }} style={{ border: 'none', background: 'none', color: '#5856D6', cursor: 'pointer', padding: 4, fontSize: 13 }}><FiCopy /></button>}
                                </div>
                            </div>
                        );
                    }) : <div style={{ textAlign: 'center', padding: '3rem', color: '#8E8E93', gridColumn: '1/-1' }}>Không có hóa đơn nào</div>}
                </div>}

            {/* Detail Modal */}
            {viewingOrder && (
                <div className="modal-overlay" onClick={() => { setViewingOrder(null); setShowPdf(false); setShowKeys(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: showPdf ? '95vw' : '700px', maxWidth: showPdf ? '95vw' : '95vw', maxHeight: '90vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiFileText /> Hóa đơn #{viewingOrder.invoice_id || viewingOrder._id.substring(18).toUpperCase()}</h2>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setShowPdf(!showPdf)} style={{ border: 'none', background: '#0071E3', color: '#FFF', padding: '6px 14px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><FiFileText /> {showPdf ? 'Ẩn PDF' : 'Xem PDF'}</button>
                                <button onClick={() => downloadPdf(viewingOrder._id)} style={{ border: 'none', background: '#34C759', color: '#FFF', padding: '6px 14px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><FiDownload /> Tải PDF</button>
                                <button onClick={() => { setViewingOrder(null); setShowPdf(false); setShowKeys(false); }} className="modal-close-btn">&times;</button>
                            </div>
                        </div>

                        {showPdf && (
                            <div style={{ background: '#F5F5F7', padding: '1rem' }}>
                                <iframe src={getPdfUrl(viewingOrder._id)} style={{ width: '100%', height: '75vh', border: 'none', borderRadius: 8, background: '#FFF' }} title="Hóa đơn PDF" />
                            </div>
                        )}

                        <div className="modal-body">
                            <div style={{ background: '#F8F9FC', borderRadius: 12, padding: '1rem', marginBottom: 12, border: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ fontWeight: 600 }}><FiUser style={{ marginRight: 6 }} />{viewingOrder.customer_id?.name || 'Khách lẻ'} <span style={{ fontWeight: 400, color: '#8E8E93', marginLeft: 8, fontSize: 12 }}>{viewingOrder.customer_id?.phone || ''} · {viewingOrder.customer_id?.email || ''}</span></div>
                                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}><span><span style={{ color: '#8E8E93' }}>TT:</span> {getStatusBadge(viewingOrder.status).l}</span><span><span style={{ color: '#8E8E93' }}>Gửi:</span> {viewingOrder.delivery_status === 'delivered' ? '✅' : '⏳'}</span><span><span style={{ color: '#8E8E93' }}>Tổng:</span> <strong style={{ color: '#D32F2F' }}>{formatMoney(viewingOrder.total_amount)}</strong></span></div>
                            </div>

                            <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>📦 Sản phẩm / Dịch vụ</h4>
                            <table className="styled-table" style={{ marginBottom: 12 }}><thead><tr><th>Tên SP</th><th>SL</th><th>Đơn giá</th><th style={{ textAlign: 'right' }}>Thành tiền</th></tr></thead>
                                <tbody>
                                    {viewingOrder.items && viewingOrder.items.length > 0 ? viewingOrder.items.map((it: any, i: number) => (<tr key={i}><td style={{ fontWeight: 600 }}>{it.name}</td><td>{it.quantity}</td><td>{formatMoney(it.price)}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(it.price * it.quantity)}</td></tr>))
                                        : viewingOrder.product_name ? (<tr><td style={{ fontWeight: 600 }}>{viewingOrder.product_name}</td><td>{viewingOrder.quantity || 1}</td><td>{formatMoney(viewingOrder.selling_price || 0)}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(viewingOrder.total_amount)}</td></tr>)
                                            : <tr><td colSpan={4} style={{ textAlign: 'center', color: '#8E8E93' }}>—</td></tr>}
                                </tbody></table>

                            {viewingOrder.product_name && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, marginBottom: 12, background: '#FAFAFC', padding: 10, borderRadius: 8, border: '1px solid #EEE' }}>
                                    {viewingOrder.cost_price > 0 && <div><span style={{ color: '#8E8E93' }}>Giá gốc:</span> {formatMoney(viewingOrder.cost_price)}</div>}
                                    {viewingOrder.selling_price > 0 && <div><span style={{ color: '#8E8E93' }}>Giá bán:</span> {formatMoney(viewingOrder.selling_price)}</div>}
                                    {viewingOrder.expiry_date && <div><span style={{ color: '#8E8E93' }}>Hạn SD:</span> {new Date(viewingOrder.expiry_date).toLocaleDateString('vi-VN')}</div>}
                                    {viewingOrder.discount_amount > 0 && <div><span style={{ color: '#D32F2F' }}>Giảm giá:</span> {formatMoney(viewingOrder.discount_amount)}</div>}
                                    {viewingOrder.payment_method && <div><span style={{ color: '#8E8E93' }}>Thanh toán:</span> {viewingOrder.payment_method === 'bank_transfer' ? '🏦 CK' : '💵 TM'}</div>}
                                    {viewingOrder.customer_note && <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#8E8E93' }}>Ghi chú KH:</span> {viewingOrder.customer_note}</div>}
                                    {viewingOrder.internal_note && <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#8E8E93' }}>Ghi chú NB:</span> {viewingOrder.internal_note}</div>}
                                </div>
                            )}

                            {viewingOrder.delivered_keys && viewingOrder.delivered_keys.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }} onClick={() => setShowKeys(!showKeys)}>
                                        <h4 style={{ margin: 0, fontSize: 14 }}>🔐 Thông tin bàn giao ({viewingOrder.delivered_keys.length})</h4>
                                        {showKeys ? <FiChevronUp /> : <FiChevronDown />}
                                    </div>
                                    <table className="styled-table"><thead><tr><th>#</th><th>SP</th><th>Key/TK</th></tr></thead><tbody>{viewingOrder.delivered_keys.map((k: any, i: number) => (<tr key={i}><td>{i + 1}</td><td>{k.product_name}</td><td><code style={{ background: '#F5F5F7', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{showKeys ? k.key : '••••' + (k.key || '').slice(-4)}</code></td></tr>))}</tbody></table>
                                </div>
                            )}

                            {viewingOrder.status === 'paid' && viewingOrder.delivery_status !== 'delivered' && (
                                <div style={{ background: '#F0F9F1', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #C2E7C6' }}>
                                    <p style={{ margin: '0 0 10px', fontSize: 13 }}>Khách đã thanh toán. <strong>Gửi email bàn giao</strong> key/tài khoản.</p>
                                    <button onClick={() => handleDeliver(viewingOrder._id)} style={{ border: 'none', background: '#0071E3', color: '#FFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiMail /> Gửi Email Bàn Giao</button>
                                </div>
                            )}

                            {viewingOrder.status !== 'cancelled' && viewingOrder.refund_status !== 'refunded' && (
                                <div style={{ background: '#FFFDF0', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #FFEBB3' }}>
                                    <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#D27B00' }}>🔄 Hoàn tiền</h4>
                                    <div style={{ display: 'flex', gap: 8 }}><input placeholder="Lý do..." value={refundReason} onChange={e => setRefundReason(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13 }} /><button onClick={() => handleRefund(viewingOrder._id)} style={{ border: 'none', background: '#FF3B30', color: '#FFF', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Hoàn tiền</button></div>
                                </div>
                            )}

                            {viewingOrder.logs && viewingOrder.logs.length > 0 && (
                                <div><h4 style={{ margin: '0 0 8px', fontSize: 14 }}>📋 Nhật ký</h4>
                                    <div style={{ background: '#FAFAFC', borderRadius: 10, padding: 10, border: '1px solid #E5E5EA', maxHeight: 150, overflowY: 'auto', fontSize: 11 }}>
                                        {viewingOrder.logs.map((log: any, i: number) => (<div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #F0F0F3', display: 'flex', gap: 8, color: '#515154' }}><span style={{ color: '#86868B', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString('vi-VN')}</span><span style={{ fontWeight: 600, color: '#0071E3' }}>{log.action}</span><span>{log.detail}</span></div>))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer"><button type="button" className="btn-cancel" onClick={() => { setViewingOrder(null); setShowPdf(false); setShowKeys(false); }}>Đóng</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const pdfBtn: React.CSSProperties = { border: 'none', background: '#0071E3', color: '#FFF', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 };
const dlBtn: React.CSSProperties = { border: 'none', background: '#F5F5F7', color: '#1D1D1F', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 };
const delBtn: React.CSSProperties = { border: 'none', background: '#34C759', color: '#FFF', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 };

export default HoaDon;