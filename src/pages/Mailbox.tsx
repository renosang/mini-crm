import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
    FiMail, FiRefreshCw, FiSend, FiUser, FiClock, FiCheckCircle,
    FiInbox, FiEdit3, FiSettings, FiPlus, FiAlertCircle, FiPaperclip, FiDownload
} from 'react-icons/fi';

interface IMessage {
    _id: string; from: string; from_name: string; subject: string;
    body_text: string; body_html: string; date: string;
    status: string; tags: string[]; is_read: boolean;
    ai_draft: string; linked_customer_id?: any;
    attachments?: { filename: string; content_type: string; size: number }[];
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
    const [showSettings, setShowSettings] = useState(false);
    const [imapEmail, setImapEmail] = useState('');
    const [imapPass, setImapPass] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const autoSyncRef = useRef<any>(null);

    // Auto-sync every 60 seconds
    useEffect(() => {
        loadMessages();
        loadImapSettings();
    }, [activeTab]);

    useEffect(() => {
        if (imapEmail) {
            autoSyncRef.current = setInterval(() => { syncEmails(true); }, 60000);
            syncEmails(true); // Initial sync
            return () => { if (autoSyncRef.current) clearInterval(autoSyncRef.current); };
        }
    }, [imapEmail]);

    useEffect(() => { if (selected) markRead(selected._id); }, [selected]);

    const loadImapSettings = async () => {
        try {
            const res = await api.get('/settings/imap');
            if (res.data.success && res.data.value) setImapEmail(res.data.value.user || '');
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
            alert('Đã lưu! Hệ thống sẽ tự động đồng bộ mail.');
            setShowSettings(false);
            window.location.reload();
        } catch (err: any) { alert('Lỗi: ' + err.message); }
        finally { setSavingSettings(false); }
    };

    const loadMessages = async () => {
        setLoading(true);
        try {
            const res = await api.get('/mailbox' + (activeTab ? '?status=' + activeTab : ''));
            if (res.data.success) setMessages(res.data.data);
        } catch { } finally { setLoading(false); }
    };

    const syncEmails = async (silent = false) => {
        if (!silent) setSyncing(true);
        try {
            const res = await api.get('/mailbox/sync');
            if (!silent) alert(res.data.message || 'Đã đồng bộ');
            loadMessages();
        } catch { if (!silent) alert('Lỗi đồng bộ'); }
        finally { if (!silent) setSyncing(false); }
    };

    const markRead = async (id: string) => { try { await api.put('/mailbox/' + id, { is_read: true }); } catch { } };
    const updateStatus = async (id: string, status: string) => { try { await api.put('/mailbox/' + id, { status }); loadMessages(); } catch { } };

    const handleSendReply = async () => {
        if (!selected || !replyText.trim()) return;
        try {
            const res = await api.post('/mailbox/reply', { messageId: selected._id, body: replyText });
            if (res.data.success) { alert('Đã gửi trả lời!'); setReplyText(''); loadMessages(); setSelected(null); }
            else alert('Lỗi: ' + (res.data.message || ''));
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

    const useAiDraft = () => { if (selected?.ai_draft) setReplyText(selected.ai_draft); };
    const tagColor: any = { 'Kinh doanh': '#0071E3', 'Bảo hành': '#D32F2F', 'Gia hạn': '#D27B00', 'Hỗ trợ': '#5856D6' };
    const formatFileSize = (bytes: number) => bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(0) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';

    return (<div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div>
                <h1 className="gradient-title" style={{ marginBottom: 2, fontSize: '1.3rem' }}>📬 Mail Box</h1>
                {imapEmail && <span style={{ fontSize: 11, color: '#8E8E93' }}>{imapEmail} · Tự động đồng bộ mỗi 60s</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
                {!imapEmail && <button onClick={() => setShowSettings(true)} style={{ border: 'none', background: '#0071E3', color: '#FFF', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}><FiSettings style={{ marginRight: 4, verticalAlign: 'middle' }} /> Kết nối Gmail</button>}
                <button onClick={() => setShowCompose(true)} style={{ border: 'none', background: '#34C759', color: '#FFF', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><FiPlus /> Soạn mail</button>
                <button onClick={() => syncEmails(false)} disabled={syncing} style={{ border: 'none', background: '#F5F5F7', color: '#1D1D1F', padding: '8px 12px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}><FiRefreshCw /> {syncing ? '...' : ''}</button>
            </div>
        </div>

        {!imapEmail && (<div style={{ background: '#FFF5E6', borderRadius: 12, padding: '1rem', marginBottom: '1rem', border: '1px solid #FFE0B2', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <FiAlertCircle style={{ color: '#D27B00', fontSize: 20 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
                <strong style={{ color: '#D27B00' }}>Chưa kết nối Gmail</strong>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#515154' }}>Nhập Email và App Password Gmail để đồng bộ mail về CRM.</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#86868B' }}>App Password: Google Account → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng</p>
            </div>
            <button onClick={() => setShowSettings(true)} style={{ border: 'none', background: '#0071E3', color: '#FFF', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <FiSettings style={{ marginRight: 6, verticalAlign: 'middle' }} /> Cấu hình IMAP
            </button>
        </div>)}

        {showSettings && (<div className="modal-overlay" onClick={() => setShowSettings(false)}><div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '450px', maxWidth: '95vw' }}>
            <div className="modal-header"><h2><FiSettings style={{ marginRight: 6 }} /> Cấu hình IMAP Gmail</h2><button onClick={() => setShowSettings(false)} className="modal-close-btn">&times;</button></div>
            <div className="modal-body">
                <div className="form-group"><label>Email Gmail</label><input type="email" value={imapEmail} onChange={e => setImapEmail(e.target.value)} placeholder="yourname@gmail.com" /></div>
                <div className="form-group"><label>Mật khẩu ứng dụng (App Password)</label><input type="password" value={imapPass} onChange={e => setImapPass(e.target.value)} placeholder="Nhập App Password từ Google..." />
                    <p style={{ fontSize: 11, color: '#8E8E93', marginTop: 4 }}>Vào Google Account → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng để tạo.</p></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn-cancel" onClick={() => setShowSettings(false)}>Hủy</button><button type="button" className="btn-save" onClick={saveImapSettings} disabled={savingSettings}>{savingSettings ? 'Đang lưu...' : 'Lưu & Kết nối'}</button></div>
        </div></div>)}

        {showCompose && (<div className="modal-overlay" onClick={() => setShowCompose(false)}><div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px', maxWidth: '95vw' }}>
            <div className="modal-header"><h2><FiEdit3 style={{ marginRight: 6 }} /> Soạn mail mới</h2><button onClick={() => setShowCompose(false)} className="modal-close-btn">&times;</button></div>
            <div className="modal-body">
                <div className="form-group"><label>Đến (To)</label><input type="email" value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="khachhang@gmail.com" /></div>
                <div className="form-group"><label>Tiêu đề</label><input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Tiêu đề mail..." /></div>
                <div className="form-group"><label>Nội dung</label><textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={8} placeholder="Soạn nội dung mail..." style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13, resize: 'vertical' }} /></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn-cancel" onClick={() => setShowCompose(false)}>Hủy</button><button type="button" className="btn-save" onClick={handleCompose}><FiSend style={{ marginRight: 4 }} /> Gửi mail</button></div>
        </div></div>)}

        <div style={{ display: 'flex', gap: '0.75rem', height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
            {/* Left sidebar - tabs */}
            <div style={{ width: 160, minWidth: 150, background: '#F8F9FC', borderRadius: 12, padding: '0.6rem', border: '1px solid #EEE', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {tabFilters.map(t => (<button key={t.key} onClick={() => { setActiveTab(t.key); setSelected(null); }} style={{ border: 'none', background: activeTab === t.key ? '#0071E3' : 'transparent', color: activeTab === t.key ? '#FFF' : '#1D1D1F', padding: '7px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5 }}>{t.icon} {t.label}</button>))}
            </div>

            {/* Message list - Gmail style */}
            <div style={{ flex: 1, minWidth: 0, background: '#FFF', borderRadius: 12, border: '1px solid #EEE', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#8E8E93' }}>Đang tải...</div> :
                        messages.length > 0 ? messages.map(m => (
                            <div key={m._id} onClick={() => { setSelected(m); setReplyText(m.ai_draft || ''); }}
                                style={{ cursor: 'pointer', background: selected?._id === m._id ? '#E8F0FE' : m.is_read ? '#FFF' : '#FFFDF0', borderBottom: '1px solid #F0F0F5', padding: '10px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.tags?.[0] ? (tagColor[m.tags[0]] || '#888') : '#DDD', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                        {(m.from_name || m.from || '?')[0].toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <span style={{ fontWeight: m.is_read ? 400 : 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {m.from_name || m.from}
                                                {m.linked_customer_id && <span style={{ marginLeft: 6, fontSize: 10, color: '#30D158' }}><FiUser style={{ verticalAlign: 'middle' }} /></span>}
                                            </span>
                                            <span style={{ fontSize: 11, color: '#8E8E93', whiteSpace: 'nowrap', marginLeft: 8 }}>{new Date(m.date).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div style={{ fontWeight: m.is_read ? 400 : 600, fontSize: 12.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1D1D1F' }}>{m.subject}</div>
                                        <div style={{ fontSize: 11, color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                                            {(m.body_text || '').substring(0, 100)} {m.attachments?.length ? <span style={{ color: '#0071E3' }}><FiPaperclip style={{ verticalAlign: 'middle', fontSize: 10 }} /> {m.attachments.length}</span> : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 4, marginLeft: 44 }}>
                                    {m.tags?.map(t => <span key={t} style={{ padding: '1px 6px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: (tagColor[t] || '#888') + '15', color: tagColor[t] || '#888' }}>{t}</span>)}
                                </div>
                            </div>
                        )) : <div style={{ textAlign: 'center', padding: '3rem', color: '#8E8E93' }}>{imapEmail ? 'Chưa có mail nào. Hệ thống sẽ tự động đồng bộ mỗi 60s.' : 'Vui lòng kết nối Gmail trước.'}</div>}
                </div>
            </div>

            {/* Detail panel */}
            <div style={{ flex: 1.5, minWidth: 360, background: '#FFF', borderRadius: 12, border: '1px solid #EEE', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {selected ? (<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #EEE', background: '#FAFAFC' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.subject}</h3>
                                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#8E8E93' }}>
                                    {(selected.from_name || selected.from) + ' <' + selected.from + '>'}
                                    {selected.linked_customer_id && <Link to={'/customers/' + selected.linked_customer_id._id} style={{ marginLeft: 8, color: '#0071E3', fontWeight: 600 }}><FiUser style={{ verticalAlign: 'middle' }} /> {selected.linked_customer_id.name}</Link>}
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#AEAEB2' }}>{new Date(selected.date).toLocaleString('vi-VN')}</p>
                            </div>
                            <select value={selected.status} onChange={e => updateStatus(selected._id, e.target.value)} style={{ padding: '3px 6px', borderRadius: 5, border: '1px solid #D2D2D7', fontSize: 10, flexShrink: 0 }}><option value="new">Mới</option><option value="pending">Đang xử lý</option><option value="resolved">Đã xong</option></select>
                        </div>
                        <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>{selected.tags?.map(t => <span key={t} style={{ padding: '1px 6px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: (tagColor[t] || '#888') + '15', color: tagColor[t] || '#888' }}>{t}</span>)}</div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', fontSize: 12.5, lineHeight: 1.6, color: '#333' }}
                        dangerouslySetInnerHTML={{ __html: selected.body_html || (selected.body_text || '').replace(/\n/g, '<br>') }} />

                    {/* Attachments */}
                    {selected.attachments && selected.attachments.length > 0 && (
                        <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid #EEE', background: '#FAFAFC' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', marginBottom: 6 }}>📎 Tệp đính kèm ({selected.attachments.length})</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {selected.attachments.map((att, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FFF', padding: '4px 10px', borderRadius: 6, border: '1px solid #E5E5EA', fontSize: 11 }}>
                                        <FiPaperclip style={{ color: '#0071E3', fontSize: 11 }} />
                                        <span>{att.filename}</span>
                                        <span style={{ color: '#8E8E93', fontSize: 10 }}>({formatFileSize(att.size)})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ padding: '0.8rem 1rem', borderTop: '1px solid #EEE', background: '#FAFAFC' }}>
                        {selected.ai_draft && !replyText && (<div style={{ marginBottom: 6, background: '#EBF5FF', borderRadius: 6, padding: 6, fontSize: 11, color: '#0071E3', display: 'flex', alignItems: 'center', gap: 6 }}><span>🤖 AI đã soạn sẵn câu trả lời</span><button onClick={useAiDraft} style={{ marginLeft: 'auto', border: 'none', background: '#0071E3', color: '#FFF', padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>Dùng bản nháp</button></div>)}
                        <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} placeholder="Soạn câu trả lời..." style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #D2D2D7', fontSize: 12, resize: 'vertical' }} />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}><button onClick={handleSendReply} style={{ border: 'none', background: '#0071E3', color: '#FFF', padding: '6px 16px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><FiSend /> Gửi trả lời</button><button onClick={() => { setReplyText('Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất.\n\nTrân trọng,\nBeegadget.net'); }} style={{ border: 'none', background: '#F5F5F7', color: '#1D1D1F', padding: '6px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}><FiEdit3 style={{ marginRight: 3, verticalAlign: 'middle' }} /> Mẫu</button></div>
                    </div>
                </div>) : (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8E8E93', flexDirection: 'column', gap: 8 }}><FiMail style={{ fontSize: 40 }} /><p>Chọn một email để xem chi tiết</p></div>)}
            </div>
        </div>
    </div>);
};

export default Mailbox;