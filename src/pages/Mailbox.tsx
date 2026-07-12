import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiMail, FiRefreshCw, FiSend, FiUser, FiClock, FiCheckCircle, FiInbox, FiEdit3, FiSettings, FiPlus, FiAlertCircle, FiPaperclip, FiX, FiBold, FiItalic, FiUnderline, FiList, FiLink, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';

interface IMessage { _id: string; from: string; from_name: string; subject: string; body_text: string; body_html: string; date: string; status: string; tags: string[]; is_read: boolean; ai_draft: string; linked_customer_id?: any; attachments?: { filename: string; content_type: string; size: number }[]; }

const tabs = [
    { key: '', label: 'Tất cả', icon: <FiMail /> },
    { key: 'new', label: 'Mới', icon: <FiInbox /> },
    { key: 'pending', label: 'Đang xử lý', icon: <FiClock /> },
    { key: 'resolved', label: 'Đã xong', icon: <FiCheckCircle /> },
    { key: 'sent', label: 'Đã gửi', icon: <FiSend /> },
];

function execCmd(c: string, v?: string) { document.execCommand(c, false, v); }

const Mailbox: React.FC = () => {
    const [msgs, setMsgs] = useState<IMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('new');
    const [sel, setSel] = useState<IMessage | null>(null);
    const [reply, setReply] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [saving, setSaving] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [to, setTo] = useState('');
    const [subj, setSubj] = useState('');
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [fullScreen, setFullScreen] = useState(false);
    const autoRef = useRef<any>(null);

    useEffect(() => { loadMsgs(); loadSettings(); }, [tab]);
    useEffect(() => { if (email) { autoRef.current = setInterval(() => sync(true), 60000); sync(true); return () => clearInterval(autoRef.current); } }, [email]);
    useEffect(() => { if (sel && !fullScreen) api.put('/mailbox/' + sel._id, { is_read: true }).catch(() => { }); }, [sel]);

    const loadSettings = async () => { try { const r = await api.get('/settings/imap'); if (r.data.success && r.data.value) setEmail(r.data.value.user || ''); } catch { } };
    const saveSettings = async () => { if (!email || !pass) { alert('Vui lòng nhập đầy đủ'); return; } setSaving(true); try { await api.post('/settings/imap', { key: 'imap', value: { host: 'imap.gmail.com', port: 993, user: email, password: pass } }); alert('Đã lưu!'); setShowSettings(false); window.location.reload(); } catch (e: any) { alert('Lỗi: ' + e.message); } finally { setSaving(false); } };
    const loadMsgs = async () => { setLoading(true); try { const r = await api.get('/mailbox' + (tab ? '?status=' + tab : '')); if (r.data.success) setMsgs(r.data.data); } catch { } finally { setLoading(false); } };
    const sync = async (silent = false) => { if (!silent) setSyncing(true); try { await api.get('/mailbox/sync'); loadMsgs(); } catch { } finally { if (!silent) setSyncing(false); } };
    const sendReply = async () => { if (!sel || !reply.trim()) return; try { const r = await api.post('/mailbox/reply', { messageId: sel._id, body: reply }); if (r.data.success) { alert('Đã gửi!'); setReply(''); loadMsgs(); setSel(null); setFullScreen(false); } else alert(r.data.message); } catch (e: any) { alert(e.message); } };
    const sendCompose = async () => { if (!to || !subj || !body) { alert('Vui lòng điền đầy đủ'); return; } try { await api.post('/mailbox/compose', { to, subject: subj, body }); alert('Đã gửi!'); setShowCompose(false); setTo(''); setSubj(''); setBody(''); setFiles([]); } catch (e: any) { alert(e.message); } };
    const updateStatus = async (id: string, s: string) => { try { await api.put('/mailbox/' + id, { status: s }); loadMsgs(); } catch { } };
    const openFull = (m: IMessage) => { setSel(m); setReply(m.ai_draft || ''); setFullScreen(true); };
    const tc: any = { 'Kinh doanh': '#0071E3', 'Bảo hành': '#D32F2F', 'Gia hạn': '#D27B00', 'Hỗ trợ': '#5856D6', 'Đã gửi': '#34C759' };
    const fs = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
    const tbStyle: React.CSSProperties = { border: '1px solid #D2D2D7', background: '#FFF', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 28 };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                    <h1 className="gradient-title" style={{ marginBottom: 2, fontSize: '1.3rem' }}>📬 Mail Box</h1>
                    {email && <span style={{ fontSize: 11, color: '#8E8E93' }}>{email} · Tự động đồng bộ 60s</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {!email && <button onClick={() => setShowSettings(true)} style={{ border: 'none', background: '#0071E3', color: '#FFF', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>🔗 Kết nối Gmail</button>}
                    <button onClick={() => setShowCompose(true)} style={{ border: 'none', background: '#34C759', color: '#FFF', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><FiPlus /> Soạn mail</button>
                    <button onClick={() => sync(false)} disabled={syncing} style={{ border: 'none', background: '#F5F5F7', color: '#1D1D1F', padding: '8px 12px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}><FiRefreshCw /></button>
                </div>
            </div>

            {!email && (
                <div style={{ background: '#FFF5E6', borderRadius: 12, padding: '1rem', marginBottom: '1rem', border: '1px solid #FFE0B2', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <FiAlertCircle style={{ color: '#D27B00', fontSize: 20 }} />
                    <div style={{ flex: 1, minWidth: 200 }}><strong style={{ color: '#D27B00' }}>Chưa kết nối Gmail</strong><p style={{ margin: '2px 0 0', fontSize: 13, color: '#515154' }}>Nhập Email và App Password để đồng bộ mail.</p></div>
                    <button onClick={() => setShowSettings(true)} style={{ border: 'none', background: '#0071E3', color: '#FFF', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cấu hình IMAP</button>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '450px', maxWidth: '95vw' }}>
                        <div className="modal-header"><h2><FiSettings style={{ marginRight: 6 }} /> Cấu hình IMAP Gmail</h2><button onClick={() => setShowSettings(false)} className="modal-close-btn">&times;</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label>Email Gmail</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com" /></div>
                            <div className="form-group"><label>App Password</label><input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="..." /><p style={{ fontSize: 11, color: '#8E8E93', marginTop: 4 }}>Google Account → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng</p></div>
                        </div>
                        <div className="modal-footer"><button type="button" className="btn-cancel" onClick={() => setShowSettings(false)}>Hủy</button><button type="button" className="btn-save" onClick={saveSettings} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu & Kết nối'}</button></div>
                    </div>
                </div>
            )}

            {/* Compose Modal */}
            {showCompose && (
                <div className="modal-overlay" onClick={() => setShowCompose(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '700px', maxWidth: '95vw' }}>
                        <div className="modal-header"><h2><FiEdit3 style={{ marginRight: 6 }} /> Soạn mail mới</h2><button onClick={() => setShowCompose(false)} className="modal-close-btn">&times;</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label>Đến (To)</label><input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="khachhang@gmail.com" /></div>
                            <div className="form-group"><label>Tiêu đề</label><input type="text" value={subj} onChange={e => setSubj(e.target.value)} placeholder="Tiêu đề mail..." /></div>
                            <div className="form-group">
                                <label>Nội dung</label>
                                <div style={{ border: '1px solid #D2D2D7', borderRadius: 8 }}>
                                    <div style={{ display: 'flex', gap: 2, padding: '5px 8px', borderBottom: '1px solid #EEE', background: '#FAFAFC', flexWrap: 'wrap' }}>
                                        <button type="button" onClick={() => execCmd('bold')} style={tbStyle}><FiBold /></button>
                                        <button type="button" onClick={() => execCmd('italic')} style={tbStyle}><FiItalic /></button>
                                        <button type="button" onClick={() => execCmd('underline')} style={tbStyle}><FiUnderline /></button>
                                        <button type="button" onClick={() => execCmd('strikeThrough')} style={{ ...tbStyle, fontWeight: 700 }}><s>S</s></button>
                                        <span style={{ width: 1, background: '#DDD', margin: '0 4px' }} />
                                        <button type="button" onClick={() => execCmd('insertUnorderedList')} style={tbStyle}><FiList /></button>
                                        <button type="button" onClick={() => execCmd('insertOrderedList')} style={tbStyle}>1.</button>
                                        <button type="button" onClick={() => execCmd('justifyLeft')} style={tbStyle}><FiAlignLeft /></button>
                                        <button type="button" onClick={() => execCmd('justifyCenter')} style={tbStyle}><FiAlignCenter /></button>
                                        <button type="button" onClick={() => execCmd('justifyRight')} style={tbStyle}><FiAlignRight /></button>
                                        <span style={{ width: 1, background: '#DDD', margin: '0 4px' }} />
                                        <button type="button" onClick={() => { const u = prompt('Nhập URL:'); if (u) execCmd('createLink', u); }} style={tbStyle}><FiLink /></button>
                                        <select onChange={e => execCmd('fontSize', e.target.value)} style={{ border: '1px solid #D2D2D7', borderRadius: 4, fontSize: 11, padding: '2px 4px' }}>
                                            <option value="1">Nhỏ</option><option value="3">Vừa</option><option value="5">Lớn</option><option value="7">Rất lớn</option>
                                        </select>
                                        <input type="color" onChange={e => execCmd('foreColor', e.target.value)} style={{ width: 24, height: 24, border: '1px solid #D2D2D7', borderRadius: 4, padding: 1, cursor: 'pointer' }} />
                                    </div>
                                    <div contentEditable dangerouslySetInnerHTML={{ __html: body }} onInput={(e: any) => setBody(e.currentTarget.innerHTML)} style={{ minHeight: 200, padding: '0.8rem', fontSize: 13, outline: 'none' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Đính kèm tệp</label>
                                <input type="file" multiple onChange={(e: any) => setFiles(Array.from(e.target.files || []))} style={{ fontSize: 12 }} />
                                {files.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{files.map((f, i) => <span key={i} style={{ padding: '4px 10px', borderRadius: 8, background: '#EBF5FF', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><FiPaperclip style={{ fontSize: 11 }} />{f.name} ({fs(f.size)})</span>)}</div>}
                            </div>
                        </div>
                        <div className="modal-footer"><button type="button" className="btn-cancel" onClick={() => setShowCompose(false)}>Hủy</button><button type="button" className="btn-save" onClick={sendCompose}><FiSend style={{ marginRight: 4 }} /> Gửi mail</button></div>
                    </div>
                </div>
            )}

            {/* Full-screen modal */}
            {fullScreen && sel && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '90vw', maxWidth: 1000, height: '90vh', background: '#FFF', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFC' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{sel.subject}</h2>
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8E8E93' }}>{(sel.from_name || sel.from) + ' <' + sel.from + '>'} · {new Date(sel.date).toLocaleString('vi-VN')}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <select value={sel.status} onChange={e => updateStatus(sel._id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D2D2D7', fontSize: 11 }}>
                                    <option value="new">Mới</option><option value="pending">Đang xử lý</option><option value="resolved">Đã xong</option>
                                </select>
                                <button onClick={() => { setFullScreen(false); setSel(null); }} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', padding: 4, color: '#8E8E93' }}><FiX /></button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', fontSize: 14, lineHeight: 1.75, color: '#222' }} dangerouslySetInnerHTML={{ __html: sel.body_html || (sel.body_text || '').replace(/\n/g, '<br>') }} />
                        {sel.attachments && sel.attachments.length > 0 && (
                            <div style={{ padding: '0.8rem 1.5rem', borderTop: '1px solid #EEE', background: '#FAFAFC' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📎 Tệp đính kèm ({sel.attachments.length})</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{sel.attachments.map((a: any, i: number) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFF', padding: '6px 14px', borderRadius: 8, border: '1px solid #E5E5EA', fontSize: 12 }}><FiPaperclip style={{ color: '#0071E3' }} />{a.filename} <span style={{ color: '#8E8E93', fontSize: 11 }}>({fs(a.size)})</span></div>)}</div>
                            </div>
                        )}
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEE', background: '#FAFAFC' }}>
                            {sel.ai_draft && !reply && <div style={{ marginBottom: 8, background: '#EBF5FF', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#0071E3', display: 'flex', alignItems: 'center', gap: 8 }}><span>🤖 AI đã soạn sẵn</span><button onClick={() => setReply(sel.ai_draft)} style={{ marginLeft: 'auto', border: 'none', background: '#0071E3', color: '#FFF', padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Dùng bản nháp</button></div>}
                            <div style={{ border: '1px solid #D2D2D7', borderRadius: 8, background: '#FFF' }}>
                                <div style={{ display: 'flex', gap: 2, padding: '5px 8px', borderBottom: '1px solid #EEE', background: '#FAFAFC', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={() => execCmd('bold')} style={tbStyle}><FiBold /></button>
                                    <button type="button" onClick={() => execCmd('italic')} style={tbStyle}><FiItalic /></button>
                                    <button type="button" onClick={() => execCmd('underline')} style={tbStyle}><FiUnderline /></button>
                                    <span style={{ width: 1, background: '#DDD', margin: '0 4px' }} />
                                    <button type="button" onClick={() => execCmd('insertUnorderedList')} style={tbStyle}><FiList /></button>
                                    <button type="button" onClick={() => execCmd('justifyLeft')} style={tbStyle}><FiAlignLeft /></button>
                                    <select onChange={e => execCmd('fontSize', e.target.value)} style={{ border: '1px solid #D2D2D7', borderRadius: 4, fontSize: 11, padding: '2px 4px' }}>
                                        <option value="1">Nhỏ</option><option value="3">Vừa</option><option value="5">Lớn</option>
                                    </select>
                                </div>
                                <div contentEditable dangerouslySetInnerHTML={{ __html: reply }} onInput={(e: any) => setReply(e.currentTarget.innerHTML)} style={{ minHeight: 100, padding: '0.6rem 0.8rem', fontSize: 13, outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <button onClick={sendReply} style={{ border: 'none', background: '#0071E3', color: '#FFF', padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><FiSend /> Gửi trả lời</button>
                                <button onClick={() => setReply('Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất.<br><br>Trân trọng,<br>Beegadget.net')} style={{ border: 'none', background: '#F5F5F7', color: '#1D1D1F', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Mẫu</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3-column layout */}
            <div style={{ display: 'flex', gap: '0.75rem', height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
                <div style={{ width: 160, minWidth: 150, background: '#F8F9FC', borderRadius: 12, padding: '0.6rem', border: '1px solid #EEE', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => { setTab(t.key); setSel(null); }} style={{ border: 'none', background: tab === t.key ? '#0071E3' : 'transparent', color: tab === t.key ? '#FFF' : '#1D1D1F', padding: '7px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, minWidth: 0, background: '#FFF', borderRadius: 12, border: '1px solid #EEE', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#8E8E93' }}>Đang tải...</div> :
                            msgs.length > 0 ? msgs.map(m => (
                                <div key={m._id} onDoubleClick={() => openFull(m)} onClick={() => setSel(m)}
                                    style={{ cursor: 'pointer', background: sel && sel._id === m._id && !fullScreen ? '#E8F0FE' : m.is_read ? '#FFF' : '#FFFDF0', borderBottom: '1px solid #F0F0F5', padding: '10px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.tags && m.tags[0] ? (tc[m.tags[0]] || '#888') : '#DDD', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
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
                                            <div style={{ fontWeight: m.is_read ? 400 : 600, fontSize: 12.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.subject}</div>
                                            <div style={{ fontSize: 11, color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                                                {(m.body_text || '').substring(0, 100)}
                                                {m.attachments && m.attachments.length > 0 && <span style={{ color: '#0071E3' }}> <FiPaperclip style={{ verticalAlign: 'middle', fontSize: 10 }} />{m.attachments.length}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {m.tags && m.tags.length > 0 && <div style={{ display: 'flex', gap: 4, marginTop: 4, marginLeft: 44 }}>
                                        {m.tags.map((t: string) => <span key={t} style={{ padding: '1px 6px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: (tc[t] || '#888') + '15', color: tc[t] || '#888' }}>{t}</span>)}
                                    </div>}
                                </div>
                            )) : <div style={{ textAlign: 'center', padding: '3rem', color: '#8E8E93' }}>{email ? 'Chưa có mail nào. Hệ thống tự động đồng bộ mỗi 60s.' : 'Vui lòng kết nối Gmail.'}</div>}
                    </div>
                </div>

                <div style={{ flex: 1.5, minWidth: 350, background: '#FFF', borderRadius: 12, border: '1px solid #EEE', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {sel ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #EEE', background: '#FAFAFC' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{sel.subject}</h3>
                                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#8E8E93' }}>{(sel.from_name || sel.from) + ' <' + sel.from + '>'}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#AEAEB2' }}>{new Date(sel.date).toLocaleString('vi-VN')}</p>
                                    </div>
                                    <button onDoubleClick={() => openFull(sel)} title="Mở rộng" style={{ border: 'none', background: 'none', color: '#8E8E93', cursor: 'pointer', padding: 4, fontSize: 16 }}>⛶</button>
                                </div>
                                {sel.tags && sel.tags.length > 0 && <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>{sel.tags.map(t => <span key={t} style={{ padding: '1px 6px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: (tc[t] || '#888') + '15', color: tc[t] || '#888' }}>{t}</span>)}</div>}
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0.8rem 1rem', fontSize: 12.5, lineHeight: 1.6, color: '#333' }} dangerouslySetInnerHTML={{ __html: sel.body_html || (sel.body_text || '').replace(/\n/g, '<br>') }} />
                            {sel.attachments && sel.attachments.length > 0 && (
                                <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid #EEE', background: '#FAFAFC' }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>📎 Tệp đính kèm ({sel.attachments.length})</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{sel.attachments.map((a: any, i: number) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FFF', padding: '4px 10px', borderRadius: 6, border: '1px solid #E5E5EA', fontSize: 11 }}><FiPaperclip style={{ color: '#0071E3', fontSize: 11 }} />{a.filename} <span style={{ color: '#8E8E93', fontSize: 10 }}>({fs(a.size)})</span></div>)}</div>
                                </div>
                            )}
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