import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiMail, FiRefreshCw, FiSend, FiUser, FiClock, FiCheckCircle, FiInbox, FiEdit3, FiSettings, FiPlus, FiAlertCircle, FiPaperclip, FiX, FiBold, FiItalic, FiUnderline, FiList } from 'react-icons/fi';

interface IMessage { _id: string; from: string; from_name: string; subject: string; body_text: string; body_html: string; date: string; status: string; tags: string[]; is_read: boolean; ai_draft: string; linked_customer_id?: any; attachments?: { filename: string; content_type: string; size: number }[]; }

const tabs = [{ key: '', label: 'Tất cả', icon: <FiMail /> }, { key: 'new', label: 'Mới', icon: <FiInbox /> }, { key: 'pending', label: 'Đang xử lý', icon: <FiClock /> }, { key: 'resolved', label: 'Đã xong', icon: <FiCheckCircle /> }];

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

    const sendReply = async () => { if (!sel || !reply.trim()) return; try { const r = await api.post('/mailbox/reply', { messageId: sel._id, body: reply }); if (r.data.success) { alert('Đã gửi!'); setReply(''); loadMsgs(); setSel(null); setFullScreen(false); } else alert('Lỗi: ' + r.data.message); } catch (e: any) { alert('Lỗi: ' + e.message); } };
    const sendCompose = async () => { if (!to || !subj || !body) { alert('Vui lòng điền đầy đủ'); return; } try { const fd = new FormData(); fd.append('to', to); fd.append('subject', subj); fd.append('body', body); files.forEach(f => fd.append('attachments', f)); await api.post('/mailbox/compose', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); alert('Đã gửi!'); setShowCompose(false); setTo(''); setSubj(''); setBody(''); setFiles([]); } catch (e: any) { alert('Lỗi: ' + e.message); } };

    const openFull = (m: IMessage) => { setSel(m); setReply(m.ai_draft || ''); setFullScreen(true); };
    const tc: any = { 'Kinh doanh': '#0071E3', 'Bảo hành': '#D32F2F', 'Gia hạn': '#D27B00', 'Hỗ trợ': '#5856D6' };
    const fs = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
    const tbb = (cmd: string, icon: any) => React.createElement('button', { type: 'button', onClick: () => execCmd(cmd), style: { border: '1px solid #D2D2D7', background: '#FFF', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', fontSize: 12 } }, icon);

    return React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' } },
            React.createElement('div', null,
                React.createElement('h1', { className: 'gradient-title', style: { marginBottom: 2, fontSize: '1.3rem' } }, 'Mail Box'),
                email ? React.createElement('span', { style: { fontSize: 11, color: '#8E8E93' } }, email + ' . Tự động đồng bộ 60s') : null
            ),
            React.createElement('div', { style: { display: 'flex', gap: 6 } },
                !email ? React.createElement('button', { onClick: () => setShowSettings(true), style: { border: 'none', background: '#0071E3', color: '#FFF', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' } }, 'Kết nối Gmail') : null,
                React.createElement('button', { onClick: () => setShowCompose(true), style: { border: 'none', background: '#34C759', color: '#FFF', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 } }, React.createElement(FiPlus, null), ' Soạn mail'),
                React.createElement('button', { onClick: () => sync(false), disabled: syncing, style: { border: 'none', background: '#F5F5F7', color: '#1D1D1F', padding: '8px 12px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' } }, React.createElement(FiRefreshCw, null))
            )
        ),
        !email ? React.createElement('div', { style: { background: '#FFF5E6', borderRadius: 12, padding: '1rem', marginBottom: '1rem', border: '1px solid #FFE0B2', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
            React.createElement(FiAlertCircle, { style: { color: '#D27B00', fontSize: 20 } }),
            React.createElement('div', { style: { flex: 1, minWidth: 200 } },
                React.createElement('strong', { style: { color: '#D27B00' } }, 'Chưa kết nối Gmail'),
                React.createElement('p', { style: { margin: '2px 0 0', fontSize: 13, color: '#515154' } }, 'Nhập Email và App Password để đồng bộ.')
            ),
            React.createElement('button', { onClick: () => setShowSettings(true), style: { border: 'none', background: '#0071E3', color: '#FFF', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' } }, 'Cấu hình IMAP')
        ) : null,

        // Settings modal
        showSettings ? React.createElement('div', { className: 'modal-overlay', onClick: () => setShowSettings(false) },
            React.createElement('div', { className: 'modal-content', onClick: (e: any) => e.stopPropagation(), style: { width: '450px', maxWidth: '95vw' } },
                React.createElement('div', { className: 'modal-header' }, React.createElement('h2', null, 'Cấu hình IMAP'), React.createElement('button', { onClick: () => setShowSettings(false), className: 'modal-close-btn' }, '\u00d7')),
                React.createElement('div', { className: 'modal-body' },
                    React.createElement('div', { className: 'form-group' }, React.createElement('label', null, 'Email Gmail'), React.createElement('input', { type: 'email', value: email, onChange: (e: any) => setEmail(e.target.value), placeholder: 'you@gmail.com' })),
                    React.createElement('div', { className: 'form-group' }, React.createElement('label', null, 'App Password'), React.createElement('input', { type: 'password', value: pass, onChange: (e: any) => setPass(e.target.value), placeholder: '...' }), React.createElement('p', { style: { fontSize: 11, color: '#8E8E93', marginTop: 4 } }, 'Google Account - Bảo mật - Xác minh 2 bước - Mật khẩu ứng dụng'))
                ),
                React.createElement('div', { className: 'modal-footer' }, React.createElement('button', { type: 'button', className: 'btn-cancel', onClick: () => setShowSettings(false) }, 'Hủy'), React.createElement('button', { type: 'button', className: 'btn-save', onClick: saveSettings, disabled: saving }, saving ? 'Đang lưu...' : 'Lưu & Kết nối'))
            )
        ) : null,

        // Compose modal  
        showCompose ? React.createElement('div', { className: 'modal-overlay', onClick: () => setShowCompose(false) },
            React.createElement('div', { className: 'modal-content', onClick: (e: any) => e.stopPropagation(), style: { width: '650px', maxWidth: '95vw' } },
                React.createElement('div', { className: 'modal-header' }, React.createElement('h2', null, 'Soạn mail mới'), React.createElement('button', { onClick: () => setShowCompose(false), className: 'modal-close-btn' }, '\u00d7')),
                React.createElement('div', { className: 'modal-body' },
                    React.createElement('div', { className: 'form-group' }, React.createElement('label', null, 'Đến (To)'), React.createElement('input', { type: 'email', value: to, onChange: (e: any) => setTo(e.target.value), placeholder: 'khachhang@gmail.com' })),
                    React.createElement('div', { className: 'form-group' }, React.createElement('label', null, 'Tiêu đề'), React.createElement('input', { type: 'text', value: subj, onChange: (e: any) => setSubj(e.target.value), placeholder: 'Tiêu đề...' })),
                    React.createElement('div', { className: 'form-group' }, React.createElement('label', null, 'Nội dung'),
                        React.createElement('div', { style: { border: '1px solid #D2D2D7', borderRadius: 6 } },
                            React.createElement('div', { style: { display: 'flex', gap: 2, padding: '4px 6px', borderBottom: '1px solid #EEE', background: '#FAFAFC' } }, tbb('bold', React.createElement(FiBold, null)), tbb('italic', React.createElement(FiItalic, null)), tbb('underline', React.createElement(FiUnderline, null)), tbb('insertUnorderedList', React.createElement(FiList, null))),
                            React.createElement('div', { contentEditable: true, dangerouslySetInnerHTML: { __html: body }, onInput: (e: any) => setBody(e.currentTarget.innerHTML), style: { minHeight: 150, padding: '0.6rem', fontSize: 13, outline: 'none' } })
                        )
                    ),
                    React.createElement('div', { className: 'form-group' }, React.createElement('label', null, 'Đính kèm tệp'), React.createElement('input', { type: 'file', multiple: true, onChange: (e: any) => setFiles(Array.from(e.target.files || [])), style: { fontSize: 12 } }), files.length > 0 ? React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 } }, ...files.map((f: any, i: number) => React.createElement('span', { key: i, style: { padding: '2px 8px', borderRadius: 6, background: '#EBF5FF', fontSize: 11 } }, React.createElement(FiPaperclip, { style: { marginRight: 3, verticalAlign: 'middle' } }), f.name + ' (' + fs(f.size) + ')'))) : null)
                ),
                React.createElement('div', { className: 'modal-footer' }, React.createElement('button', { type: 'button', className: 'btn-cancel', onClick: () => setShowCompose(false) }, 'Hủy'), React.createElement('button', { type: 'button', className: 'btn-save', onClick: sendCompose }, React.createElement(FiSend, { style: { marginRight: 4 } }), 'Gửi mail'))
            )
        ) : null,

        // Full screen email view
        fullScreen && sel ? React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#FFF', zIndex: 9999, display: 'flex', flexDirection: 'column' } },
            React.createElement('div', { style: { padding: '0.8rem 1.5rem', borderBottom: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFC' } },
                React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('h2', { style: { margin: 0, fontSize: '1.15rem', fontWeight: 600 } }, sel.subject),
                    React.createElement('p', { style: { margin: '4px 0 0', fontSize: 12, color: '#8E8E93' } }, (sel.from_name || sel.from) + ' <' + sel.from + '> . ' + new Date(sel.date).toLocaleString('vi-VN'))
                ),
                React.createElement('button', { onClick: () => { setFullScreen(false); setSel(null); }, style: { border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', padding: 8, color: '#8E8E93' } }, React.createElement(FiX, null))
            ),
            React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '1.5rem 2.5rem', fontSize: 14, lineHeight: 1.75, color: '#222', maxWidth: 900, margin: '0 auto', width: '100%' }, dangerouslySetInnerHTML: { __html: sel.body_html || (sel.body_text || '').replace(/\n/g, '<br>') } }),
            sel.attachments && sel.attachments.length > 0 ? React.createElement('div', { style: { padding: '0.8rem 1.5rem', borderTop: '1px solid #EEE', background: '#FAFAFC' } },
                React.createElement('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 8 } }, 'Tệp đính kèm (' + sel.attachments.length + ')'),
                React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, ...sel.attachments.map((a: any, i: number) => React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, background: '#FFF', padding: '6px 14px', borderRadius: 8, border: '1px solid #E5E5EA', fontSize: 12 } }, React.createElement(FiPaperclip, { style: { color: '#0071E3' } }), a.filename, React.createElement('span', { style: { color: '#8E8E93', fontSize: 11 } }, '(' + fs(a.size) + ')'))))
            ) : null,
            React.createElement('div', { style: { padding: '1rem 1.5rem', borderTop: '1px solid #EEE', background: '#FAFAFC' } },
                sel.ai_draft && !reply ? React.createElement('div', { style: { marginBottom: 8, background: '#EBF5FF', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#0071E3', display: 'flex', alignItems: 'center', gap: 8 } }, React.createElement('span', null, 'AI đã soạn sẵn'), React.createElement('button', { onClick: () => setReply(sel.ai_draft), style: { marginLeft: 'auto', border: 'none', background: '#0071E3', color: '#FFF', padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontWeight: 600 } }, 'Dùng bản nháp')) : null,
                React.createElement('div', { style: { border: '1px solid #D2D2D7', borderRadius: 6, background: '#FFF' } },
                    React.createElement('div', { style: { display: 'flex', gap: 2, padding: '4px 8px', borderBottom: '1px solid #EEE', background: '#FAFAFC' } }, tbb('bold', React.createElement(FiBold, null)), tbb('italic', React.createElement(FiItalic, null)), tbb('underline', React.createElement(FiUnderline, null)), tbb('insertUnorderedList', React.createElement(FiList, null))),
                    React.createElement('div', { contentEditable: true, dangerouslySetInnerHTML: { __html: reply }, onInput: (e: any) => setReply(e.currentTarget.innerHTML), style: { minHeight: 120, padding: '0.6rem 0.8rem', fontSize: 13, outline: 'none' } })
                ),
                React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
                    React.createElement('button', { onClick: sendReply, style: { border: 'none', background: '#0071E3', color: '#FFF', padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 } }, React.createElement(FiSend, null), 'Gửi trả lời'),
                    React.createElement('button', { onClick: () => setReply('Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất.<br><br>Trân trọng,<br>Beegadget.net'), style: { border: 'none', background: '#F5F5F7', color: '#1D1D1F', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' } }, 'Mẫu')
                )
            )
        ) : null,

        // Main 2-column layout
        React.createElement('div', { style: { display: 'flex', gap: '0.75rem', height: 'calc(100vh - 140px)', overflow: 'hidden' } },
            React.createElement('div', { style: { width: 160, minWidth: 150, background: '#F8F9FC', borderRadius: 12, padding: '0.6rem', border: '1px solid #EEE', display: 'flex', flexDirection: 'column', gap: '0.2rem' } },
                ...tabs.map(t => React.createElement('button', { key: t.key, onClick: () => { setTab(t.key); setSel(null); }, style: { border: 'none', background: tab === t.key ? '#0071E3' : 'transparent', color: tab === t.key ? '#FFF' : '#1D1D1F', padding: '7px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5 } }, t.icon, ' ', t.label))
            ),
            React.createElement('div', { style: { flex: 1, minWidth: 0, background: '#FFF', borderRadius: 12, border: '1px solid #EEE', overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
                loading ? React.createElement('div', { style: { textAlign: 'center', padding: '2rem', color: '#8E8E93' } }, 'Đang tải...') :
                    msgs.length > 0 ? React.createElement('div', { style: { overflowY: 'auto', flex: 1 } }, ...msgs.map((m: IMessage) => React.createElement('div', { key: m._id, onDoubleClick: () => openFull(m), style: { cursor: 'pointer', background: sel && sel._id === m._id && !fullScreen ? '#E8F0FE' : m.is_read ? '#FFF' : '#FFFDF0', borderBottom: '1px solid #F0F0F5', padding: '10px 16px' } },
                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                            React.createElement('div', { style: { width: 36, height: 36, borderRadius: '50%', background: m.tags && m.tags[0] ? (tc[m.tags[0]] || '#888') : '#DDD', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 } }, (m.from_name || m.from || '?')[0].toUpperCase()),
                            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
                                    React.createElement('span', { style: { fontWeight: m.is_read ? 400 : 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, m.from_name || m.from, m.linked_customer_id ? React.createElement('span', { style: { marginLeft: 6, fontSize: 10, color: '#30D158' } }, React.createElement(FiUser, { style: { verticalAlign: 'middle' } })) : null),
                                    React.createElement('span', { style: { fontSize: 11, color: '#8E8E93', whiteSpace: 'nowrap', marginLeft: 8 } }, new Date(m.date).toLocaleDateString('vi-VN'))
                                ),
                                React.createElement('div', { style: { fontWeight: m.is_read ? 400 : 600, fontSize: 12.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, m.subject),
                                React.createElement('div', { style: { fontSize: 11, color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 } }, (m.body_text || '').substring(0, 100), m.attachments && m.attachments.length ? React.createElement('span', { style: { color: '#0071E3' } }, ' ', React.createElement(FiPaperclip, { style: { verticalAlign: 'middle', fontSize: 10 } }), m.attachments.length) : null)
                            )
                        ),
                        m.tags && m.tags.length > 0 ? React.createElement('div', { style: { display: 'flex', gap: 4, marginTop: 4, marginLeft: 44 } }, ...m.tags.map((t: string) => React.createElement('span', { key: t, style: { padding: '1px 6px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: (tc[t] || '#888') + '15', color: tc[t] || '#888' } }, t))) : null
                    ))) : React.createElement('div', { style: { textAlign: 'center', padding: '3rem', color: '#8E8E93' } }, email ? 'Chưa có mail nào. Hệ thống tự động đồng bộ mỗi 60s.' : 'Vui lòng kết nối Gmail.')
            )
        )
    );
};

export default Mailbox;