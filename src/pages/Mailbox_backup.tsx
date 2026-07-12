import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
    FiMail, FiRefreshCw, FiSend, FiUser, FiClock, FiCheckCircle,
    FiInbox, FiEdit3, FiSettings, FiPlus, FiX, FiAlertCircle
} from 'react-icons/fi';

interface IMessage {
    _id: string; from: string; from_name: string; subject: string;
    body_text: string; body_html: string; date: string;
    status: string; tags: string[]; is_read: boolean;
    ai_draft: string; linked_customer_id?: any;
}

const tabFilters = [
    { key: '', label: 'Tất cả', icon: <FiMail /> },
    { key: 'new', label: 'Mới', icon: <FiInbox /> },
    { key: 'pending', label: 'Đang xử lý', icon: <FiClock /> },
    { key: 'resolved', label: 'Đã xong', icon: <FiCheckCircle /> },
];

const Mailbox: React.FC = () => {
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('new');
    const [selected, setSelected] = useState<IMessage | null>(null);
    const [replyText, setReplyText] = useState('');
    const [syncing, setSyncing] = useState(false);

    // IMAP Settings
    const [showSettings, setShowSettings] = useState(false);
    const [imapEmail, setImapEmail] = useState('');
    const [imapPass, setImapPass] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);

    // Compose new email
    const [showCompose, setShowCompose] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');

    useEffect(() => { loadMessages(); }, [activeTab]);
    useEffect(() => { loadImapSettings(); }, []);
    useEffect(() => { if (selected) markRead(selected._id); }, [selected]);

    const loadImapSettings = async () => {
        try {
            const res = await api.get('/settings/imap');
            if (res.data.success && res.data.value) {
                setImapEmail(res.data.value.user || '');
            }
        } catch { }
    };

    const saveImapSettings = async () => {
        if (!imapEmail || !imapPass) { alert('Vui lòng nhập đầy đủ Email và Mật khẩu ứng dụng'); return; }
        setSavingSettings(true);
        try {
            await api.post('/settings/imap', {
                key: 'imap',
                value: { host: 'imap.gmail.com', port: 993, user: imapEmail, password: imapPass }
            });
            alert('Đã lưu cấu hình IMAP!');
            setShowSettings(false);
        } catch (err: any) { alert('Lỗi: ' + err.message); }
        finally { setSavingSettings(false); }
    };

    const loadMessages = async () => {
        setLoading(true);
        try {
            const url = '/mailbox' + (activeTab ? '?status=' + activeTab : '');
            const res = await api.get(url);
            if (res.data.success) setMessages(res.data.data);
        } catch { } finally { setLoading(false); }
    };

    const syncEmails = async () => {
        setSyncing(true);
        try {
            const res = await api.get('/mailbox/sync');
            alert(res.data.message || 'Đã đồng bộ');
            loadMessages();
        } catch { } finally { setSyncing(false); }
    };

    const testImap = async () => {
        try {
            const res = await api.get('/mailbox/test-imap');
            alert(res.data.message || JSON.stringify(res.data));
        } catch (err: any) { alert('Lỗi: ' + err.message); }
    };

    const [hasOAuth, setHasOAuth] = useState(false);
    useEffect(() => { api.get('/mailbox/oauth').then(r => { if (r.data?.success && r.data?.url) setHasOAuth(true); }).catch(() => { }); }, []);

    const connectGmail = async () => {
        try {
            const res = await api.get('/mailbox/oauth');
            if (res.data.success && res.data.url) {
                window.location.href = res.data.url;
            } else {
                alert('Chưa cấu hình Gmail OAuth. Vui lòng dùng Cấu hình thủ công (IMAP).');
            }
        } catch (err: any) { alert('Lỗi: ' + err.message); }
    };

    const markRead = async (id: string) => {
        try { await api.put('/mailbox/' + id, { is_read: true }); } catch { }
    };

    const updateStatus = async (id: string, status: string) => {
        try { await api.put('/mailbox/' + id, { status: status }); loadMessages(); } catch { }
    };

    const handleSendReply = async () => {
        if (!selected || !replyText.trim()) return;
        try {
            const res = await api.post('/mailbox/reply', { messageId: selected._id, body: replyText });
            if (res.data.success) { alert('Đã gửi trả lời!'); setReplyText(''); loadMessages(); setSelected(null); }
            else { alert('Lỗi: ' + (res.data.message || '')); }
        } catch (err: any) { alert('Lỗi: ' + err.message); }
    };

    const handleCompose = async () => {
        if (!composeTo || !composeSubject || !composeBody) { alert('Vui lòng điền đầy đủ thông tin'); return; }
        try {
            await api.post('/mailbox/compose', { to: composeTo, subject: composeSubject, body: composeBody });
            alert('Đã gửi mail!');
            setShowCompose(false);
            setComposeTo(''); setComposeSubject(''); setComposeBody('');
        } catch (err: any) { alert('Lỗi: ' + err.message); }
    };

    const useAiDraft = () => {
        if (selected?.ai_draft) setReplyText(selected.ai_draft);
    };

    const tagColor: any = { 'Kinh doanh': '#0071E3', 'Bảo hành': '#D32F2F', 'Gia hạn': '#D27B00', 'Hỗ trợ': '#5856D6' };

    return (
        <div>
            <div className="customer-detail-header" style={{ marginBottom: '1rem' }}>
                <h1 className="gradient-title">📬 Mail Box</h1>
                <p>Quản lý email khách hàng, trả lời trực tiếp không cần mở Gmail</p>
            </div>

            {/* Settings/OAuth banner */}
            {!imapEmail && (
                <div style={{ background: '#FFF5E6', borderRadius: 12, padding: '1rem', marginBottom: '1rem', border: '1px solid #FFE0B2', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <FiAlertCircle style={{ color: '#D27B00', fontSize: 20 }} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <strong style={{ color: '#D27B00' }}>Chưa kết nối Gmail</strong>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#515154' }}>Kết nối Gmail để đồng bộ và gửi mail trực tiếp từ CRM.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={connectGmail} style={{ border: 'none', background: '#34C759', color: '#FFF', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            🔗 Kết nối Gmail (OAuth)
                        </button>
                        <button onClick={() => setShowSettings(true)} style={{ border: 'none', background: '#0071E3', color: '#FFF', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <FiSettings style={{ marginRight: 4, verticalAlign: 'middle' }} /> Cấu hình thủ công
                        </button>
                    </div>
                </div>
            )}
            {imapEmail && (
                <div style={{ background: '#F0F9F1', borderRadius: 12, padding: '0.6rem 1rem', marginBottom: '1rem', border: '1px solid #C2E7C6', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiCheckCircle style={{ color: '#2E7D32', fontSize: 16 }} />
                    <span style={{ fontSize: 13, color: '#2E7D32', fontWeight: 600 }}>✅ Đã kết nối: {imapEmail}</span>
                    <button onClick={connectGmail} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: '#0071E3', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Kết nối lại</button>
                </div>
            )}

            {/* IMAP Settings Modal */}
            {showSettings && (
                <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '450px', maxWidth: '95vw' }}>
                        <div className="modal-header">
                            <h2><FiSettings style={{ marginRight: 6 }} /> Cấu hình IMAP Gmail</h2>
                            <button onClick={() => setShowSettings(false)} className="modal-close-btn">&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Email Gmail</label>
                                <input type="email" value={imapEmail} onChange={e => setImapEmail(e.target.value)} placeholder="yourname@gmail.com" />
                            </div>
                            <div className="form-group">
                                <label>Mật khẩu ứng dụng (App Password)</label>
                                <input type="password" value={imapPass} onChange={e => setImapPass(e.target.value)} placeholder="Nhập App Password từ Google..." />
                                <p style={{ fontSize: 11, color: '#8E8E93', marginTop: 4 }}>
                                    Vào Google Account → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng để tạo.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn-cancel" onClick={() => setShowSettings(false)}>Hủy</button>
                            <button type="button" className="btn-save" onClick={saveImapSettings} disabled={savingSettings}>
                                {savingSettings ? 'Đang lưu...' : 'Lưu & Kết nối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Compose Modal */}
            {showCompose && (
                <div className="modal-overlay" onClick={() => setShowCompose(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px', maxWidth: '95vw' }}>
                        <div className="modal-header">
                            <h2><FiEdit3 style={{ marginRight: 6 }} /> Soạn mail mới</h2>
                            <button onClick={() => setShowCompose(false)} className="modal-close-btn">&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Đến (To)</label>
                                <input type="email" value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="khachhang@gmail.com" />
                            </div>
                            <div className="form-group">
                                <label>Tiêu đề</label>
                                <input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Tiêu đề mail..." />
                            </div>
                            <div className="form-group">
                                <label>Nội dung</label>
                                <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={8} placeholder="Soạn nội dung mail..."
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13, resize: 'vertical' }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn-cancel" onClick={() => setShowCompose(false)}>Hủy</button>
                            <button type="button" className="btn-save" onClick={handleCompose}>
                                <FiSend style={{ marginRight: 4 }} /> Gửi mail
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main 3-column layout */}
            <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                {/* Left Sidebar */}
                <div style={{ width: 200, minWidth: 170, background: '#F8F9FC', borderRadius: 14, padding: '1rem', border: '1px solid #EEE', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {tabFilters.map(t => (
                        <button key={t.key} onClick={() => { setActiveTab(t.key); setSelected(null); }}
                            style={{ border: 'none', background: activeTab === t.key ? '#0071E3' : 'transparent', color: activeTab === t.key ? '#FFF' : '#1D1D1F', padding: '8px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setShowCompose(true)}
                        style={{ border: 'none', background: '#34C759', color: '#FFF', padding: '10px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
                        <FiPlus /> Soạn mail
                    </button>
                    <button onClick={syncEmails} disabled={syncing}
                        style={{ border: 'none', background: imapEmail ? '#0071E3' : '#8E8E93', color: '#FFF', padding: '10px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: imapEmail ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <FiRefreshCw /> {syncing ? 'Đang đồng bộ...' : 'Đồng bộ Gmail'}
                    </button>
                    {imapEmail && (
                        <button onClick={() => setShowSettings(true)}
                            style={{ border: 'none', background: 'transparent', color: '#8E8E93', padding: '6px', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>
                            <FiSettings style={{ marginRight: 4, verticalAlign: 'middle' }} /> Cài đặt IMAP
                        </button>
                    )}
                </div>

                {/* Message List */}
                <div style={{ flex: 1, minWidth: 280, background: '#FFF', borderRadius: 14, border: '1px solid #EEE', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div className="table-container widget" style={{ boxShadow: 'none', border: 'none' }}>
                        <table className="styled-table">
                            <thead><tr><th>Từ</th><th>Tiêu đề</th><th>Tag</th><th>Ngày</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</td></tr> :
                                    messages.length > 0 ? messages.map(m => (
                                        <tr key={m._id} onClick={() => { setSelected(m); setReplyText(m.ai_draft || ''); }}
                                            style={{ cursor: 'pointer', background: selected?._id === m._id ? '#EBF5FF' : m.is_read ? '#FFF' : '#FFFDF0', fontWeight: m.is_read ? 400 : 600 }}>
                                            <td className="nowrap" style={{ fontSize: 13 }}>{m.from_name || m.from}
                                                {m.linked_customer_id && <span style={{ marginLeft: 6, fontSize: 10, color: '#30D158' }}><FiUser style={{ verticalAlign: 'middle' }} /></span>}
                                            </td>
                                            <td style={{ fontSize: 13 }}>{m.subject}</td>
                                            <td className="nowrap">{m.tags?.map(t => <span key={t} style={{ padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: (tagColor[t] || '#888') + '15', color: tagColor[t] || '#888', marginRight: 4 }}>{t}</span>)}</td>
                                            <td className="nowrap" style={{ fontSize: 11, color: '#8E8E93' }}>{new Date(m.date).toLocaleString('vi-VN')}</td>
                                        </tr>
                                    )) : <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#8E8E93' }}>
                                        {imapEmail ? 'Chưa có mail nào. Nhấn "Đồng bộ Gmail" để tải thư về.' : 'Vui lòng cấu hình IMAP trước.'}
                                    </td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Panel */}
                <div style={{ flex: 1.5, minWidth: 350, background: '#FFF', borderRadius: 14, border: '1px solid #EEE', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {selected ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid #EEE', background: '#FAFAFC' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{selected.subject}</h3>
                                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8E8E93' }}>
                                            {selected.from_name || selected.from} &lt;{selected.from}&gt;
                                            {selected.linked_customer_id && <Link to={'/customers/' + selected.linked_customer_id._id} style={{ marginLeft: 8, color: '#0071E3', fontWeight: 600 }}><FiUser style={{ verticalAlign: 'middle' }} /> {selected.linked_customer_id.name}</Link>}
                                        </p>
                                    </div>
                                    <select value={selected.status} onChange={e => updateStatus(selected._id, e.target.value)}
                                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D2D2D7', fontSize: 11 }}>
                                        <option value="new">Mới</option><option value="pending">Đang xử lý</option><option value="resolved">Đã xong</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                    {selected.tags?.map(t => <span key={t} style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: (tagColor[t] || '#888') + '15', color: tagColor[t] || '#888' }}>{t}</span>)}
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', fontSize: 13, lineHeight: 1.6 }}
                                dangerouslySetInnerHTML={{ __html: selected.body_html || (selected.body_text || '').replace(/\n/g, '<br>') }} />

                            <div style={{ padding: '1rem', borderTop: '1px solid #EEE', background: '#FAFAFC' }}>
                                {selected.ai_draft && !replyText && (
                                    <div style={{ marginBottom: 8, background: '#EBF5FF', borderRadius: 8, padding: 8, fontSize: 12, color: '#0071E3', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>🤖 AI đã soạn sẵn câu trả lời</span>
                                        <button onClick={useAiDraft} style={{ marginLeft: 'auto', border: 'none', background: '#0071E3', color: '#FFF', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Dùng bản nháp</button>
                                    </div>
                                )}
                                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4}
                                    placeholder="Soạn câu trả lời..."
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13, resize: 'vertical' }} />
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <button onClick={handleSendReply}
                                        style={{ border: 'none', background: '#0071E3', color: '#FFF', padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <FiSend /> Gửi trả lời
                                    </button>
                                    <button onClick={() => { setReplyText('Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất.\n\nTrân trọng,\nBeegadget.net'); }}
                                        style={{ border: 'none', background: '#F5F5F7', color: '#1D1D1F', padding: '8px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                                        <FiEdit3 style={{ marginRight: 4, verticalAlign: 'middle' }} /> Mẫu
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8E8E93', flexDirection: 'column', gap: 8 }}>
                            <FiMail style={{ fontSize: 40 }} />
                            <p>Chọn một email để xem chi tiết</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Mailbox;