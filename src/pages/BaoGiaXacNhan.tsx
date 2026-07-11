import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { FiCheckCircle, FiPackage, FiClock, FiUser } from 'react-icons/fi';

interface IQuotation {
    _id: string;
    customer_id: { _id: string; name: string; phone?: string; email?: string } | null;
    items: Array<{ product_id: any; name: string; product_type: string; quantity: number; unit_price: number; stock_available: number }>;
    subtotal: number; discount_amount: number; tax_rate: number; tax_amount: number;
    activation_fee: number; grand_total: number; customer_note: string; terms: string;
    status: string; expires_at: string | null; tracking_token: string; createdAt: string;
}

const BaoGiaXacNhan: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [quotation, setQuotation] = useState<IQuotation | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => { if (token) loadQuotation(); }, [token]);

    const loadQuotation = async () => {
        try { const res = await api.get('/quotations?token=' + token); if (res.data.success) setQuotation(res.data.data); } catch { }
        finally { setLoading(false); }
    };

    const handleConfirm = async () => {
        if (!quotation) return;
        try { await api.put('/quotations/' + quotation._id, { status: 'confirmed' }); setConfirmed(true); } catch { }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Đang tải báo giá...</div>;
    if (!quotation) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}><h2>Báo giá không tồn tại hoặc đã hết hạn</h2><p style={{ color: '#86868B' }}>Vui lòng liên hệ nhân viên để được hỗ trợ</p></div>;

    const isExpired = quotation.expires_at && new Date(quotation.expires_at) < new Date();

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #6B2737, #8B3A4F)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiPackage style={{ color: '#FFF', fontSize: 28 }} /></div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: '0 0 4px' }}>Báo Giá Dịch Vụ</h1>
                <p style={{ fontSize: 14, color: '#86868B', margin: 0 }}>Mã: #{quotation._id.substring(quotation._id.length - 8).toUpperCase()}</p>
            </div>
            {quotation.customer_id && (
                <div style={{ background: '#F8F9FC', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 20, border: '1px solid #EEE', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FiUser style={{ color: '#30D158', fontSize: 20 }} /><div><strong>{quotation.customer_id.name}</strong><span style={{ color: '#86868B', marginLeft: 12, fontSize: 13 }}>{quotation.customer_id.phone || ''}</span></div>
                </div>
            )}
            <div style={{ background: '#FFF', borderRadius: 14, border: '1px solid #EEE', overflow: 'hidden', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead><tr style={{ background: '#F5F5F7' }}><th style={{ padding: '10px 14px', textAlign: 'left', color: '#6E6E73', fontSize: 12, fontWeight: 700 }}>SẢN PHẨM</th><th style={{ padding: '10px 14px', textAlign: 'center', color: '#6E6E73', fontSize: 12, fontWeight: 700 }}>SL</th><th style={{ padding: '10px 14px', textAlign: 'right', color: '#6E6E73', fontSize: 12, fontWeight: 700 }}>ĐƠN GIÁ</th><th style={{ padding: '10px 14px', textAlign: 'right', color: '#6E6E73', fontSize: 12, fontWeight: 700 }}>THÀNH TIỀN</th></tr></thead>
                    <tbody>{quotation.items.map((it, idx) => (<tr key={idx} style={{ borderBottom: '1px solid #F5F5F7' }}><td style={{ padding: '10px 14px', fontWeight: 600 }}>{it.name}</td><td style={{ padding: '10px 14px', textAlign: 'center' }}>{it.quantity}</td><td style={{ padding: '10px 14px', textAlign: 'right' }}>{it.unit_price.toLocaleString('vi-VN')} đ</td><td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{(it.quantity * it.unit_price).toLocaleString('vi-VN')} đ</td></tr>))}</tbody>
                </table>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #1D1D1F, #2C2C2E)', borderRadius: 16, padding: '1.35rem 1.25rem', color: '#FFF', marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#AEAEB2' }}><span>Tạm tính</span><span>{quotation.subtotal.toLocaleString('vi-VN')} đ</span></div>
                    {quotation.discount_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FF6B6B' }}><span>Giảm giá</span><span>-{quotation.discount_amount.toLocaleString('vi-VN')} đ</span></div>}
                    {quotation.tax_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#AEAEB2' }}><span>VAT ({quotation.tax_rate}%)</span><span>{quotation.tax_amount.toLocaleString('vi-VN')} đ</span></div>}
                    {quotation.activation_fee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#AEAEB2' }}><span>Phí kích hoạt</span><span>{quotation.activation_fee.toLocaleString('vi-VN')} đ</span></div>}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.12)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 20 }}><span>TỔNG CỘNG</span><span>{quotation.grand_total.toLocaleString('vi-VN')} đ</span></div>
                </div>
            </div>
            {quotation.customer_note && <div style={{ background: '#FFFDF0', borderRadius: 10, padding: 12, border: '1px solid #FFEBB3', fontSize: 13, color: '#515154', marginBottom: 20 }}><strong>Ghi chú:</strong> {quotation.customer_note}</div>}
            {quotation.terms && <div style={{ background: '#FAFAFC', borderRadius: 10, padding: 14, border: '1px solid #E5E5EA', fontSize: 12, color: '#86868B', marginBottom: 20, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}><strong>Điều khoản:</strong><br />{quotation.terms}</div>}
            {quotation.expires_at && <p style={{ textAlign: 'center', fontSize: 13, color: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><FiClock /> Báo giá có hiệu lực đến: {new Date(quotation.expires_at).toLocaleString('vi-VN')}</p>}
            {!confirmed && !isExpired && quotation.status !== 'converted' ? (
                <div style={{ textAlign: 'center', marginTop: 24 }}><button onClick={handleConfirm} style={{ border: 'none', background: 'linear-gradient(135deg, #0071E3, #005BB5)', color: '#FFF', padding: '14px 36px', borderRadius: 99, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,113,227,0.35)' }}><FiCheckCircle style={{ marginRight: 8, verticalAlign: 'middle' }} /> Đồng Ý Mua & Thanh Toán</button></div>
            ) : confirmed ? (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <div style={{ background: '#F0F9F1', borderRadius: 16, padding: 24, border: '1px solid #C2E7C6', textAlign: 'center', marginBottom: 24 }}><div style={{ width: 48, height: 48, background: '#34C759', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiCheckCircle style={{ color: '#FFF', fontSize: 24 }} /></div><h2 style={{ margin: '0 0 4px', color: '#2E7D32', fontSize: 18 }}>Xác nhận thành công!</h2><p style={{ color: '#515154', fontSize: 14 }}>Nhân viên sẽ sớm liên hệ</p></div>
                    <div style={{ background: '#FFFDF0', borderRadius: 16, padding: 20, border: '1px solid #FFEBB3' }}><h3 style={{ margin: '0 0 12px', color: '#D27B00', fontSize: 15 }}>Thông tin chuyển khoản</h3><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><img src={`https://img.vietqr.io/image/Sacombank-060233251669-compact2.png?amount=${quotation.grand_total}&addInfo=TT+BG+${quotation._id.substring(quotation._id.length - 8).toUpperCase()}&accountName=NGUYEN+THANH+SANG`} alt="QR" style={{ width: 180, height: 180, borderRadius: 12, border: '2px solid #E5E5EA' }} /></div><div style={{ fontSize: 13, color: '#515154', textAlign: 'center', lineHeight: 1.8 }}><div>Ngân hàng: <strong>Sacombank</strong></div><div>Số TK: <strong style={{ color: '#0071E3' }}>060233251669</strong></div><div>Chủ TK: <strong>NGUYEN THANH SANG</strong></div><div>Nội dung: <strong style={{ color: '#D27B00' }}>TT BG {quotation._id.substring(quotation._id.length - 8).toUpperCase()}</strong></div></div></div>
                    <p style={{ color: '#86868B', fontSize: 13, marginTop: 16 }}>Sau khi chuyển khoản, vui lòng liên hệ Hotline: 0962979214</p>
                </div>
            ) : null}
        </div>
    );
};

export default BaoGiaXacNhan;