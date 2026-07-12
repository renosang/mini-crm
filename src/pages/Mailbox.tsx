import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiMail, FiRefreshCw, FiSend, FiUser, FiClock, FiCheckCircle, FiInbox, FiEdit3 } from 'react-icons/fi';

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

    useEffect(function () { loadMessages(); }, [activeTab]);
    useEffect(function () { if (selected) markRead(selected._id); }, [selected]);

    async function loadMessages() {
        setLoading(true);
        try {
            var url = '/mailbox' + (activeTab ? '?status=' + activeTab : '');
            var res = await api.get(url);
            if (res.data.success) setMessages(res.data.data);
        } catch (e) { } finally { setLoading(false); }
    }

    async function syncEmails() {
        setSyncing(true);
        try {
            var res = await api.get('/mailbox/sync');
            alert(res.data.message || 'Da dong bo');
            loadMessages();
        } catch (e) { } finally { setSyncing(false); }
    }

    async function markRead(id: string) {
        try { await api.put('/mailbox/' + id, { is_read: true }); } catch (e) { }
    }

    async function updateStatus(id: string, status: string) {
        try { await api.put('/mailbox/' + id, { status: status }); loadMessages(); } catch (e) { }
    }

    async function handleSendReply() {
        if (!selected || !replyText.trim()) return;
        try {
            var res = await api.post('/mailbox/reply', { messageId: selected._id, body: replyText });
            if (res.data.success) { alert('Da gui tra loi!'); setReplyText(''); loadMessages(); setSelected(null); }
            else { alert('Loi: ' + (res.data.message || '')); }
        } catch (err: any) { alert('Loi: ' + err.message); }
    }

    function useAiDraft() {
        if (selected && selected.ai_draft) setReplyText(selected.ai_draft);
    }

    var tagColor: any = { 'Kinh doanh': '#0071E3', 'Bao hanh': '#D32F2F', 'Gia han': '#D27B00', 'Ho tro': '#5856D6' };

    return React.createElement('div', { style: { display: 'flex', gap: '1rem', height: 'calc(100vh - 120px)', overflow: 'hidden' } },

        React.createElement('div', { style: { width: 220, minWidth: 180, background: '#F8F9FC', borderRadius: 14, padding: '1rem', border: '1px solid #EEE', display: 'flex', flexDirection: 'column', gap: '0.3rem' } },
            React.createElement('div', { style: { fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem', color: '#1D1D1F' } }, 'Mailbox'),
            tabFilters.map(function (t) {
                return React.createElement('button', {
                    key: t.key,
                    onClick: function () { setActiveTab(t.key); setSelected(null); },
                    style: { border: 'none', background: activeTab === t.key ? '#0071E3' : 'transparent', color: activeTab === t.key ? '#FFF' : '#1D1D1F', padding: '8px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }
                }, t.icon, ' ', t.label);
            }),
            React.createElement('div', { style: { flex: 1 } }),
            React.createElement('button', {
                onClick: syncEmails, disabled: syncing,
                style: { border: 'none', background: '#0071E3', color: '#FFF', padding: '10px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }
            }, React.createElement(FiRefreshCw, null), ' ', syncing ? 'Dang dong bo...' : 'Dong bo Gmail')
        ),

        React.createElement('div', { style: { flex: 1, minWidth: 280, background: '#FFF', borderRadius: 14, border: '1px solid #EEE', overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
            React.createElement('div', { className: 'table-container widget', style: { boxShadow: 'none', border: 'none' } },
                React.createElement('table', { className: 'styled-table' },
                    React.createElement('thead', null, React.createElement('tr', null,
                        React.createElement('th', null, 'Tu'), React.createElement('th', null, 'Tieu de'), React.createElement('th', null, 'Tag'), React.createElement('th', null, 'Ngay')
                    )),
                    React.createElement('tbody', null,
                        loading ? React.createElement('tr', null, React.createElement('td', { colSpan: 4, style: { textAlign: 'center', padding: '2rem' } }, 'Dang tai...'))
                            : messages.length > 0 ? messages.map(function (m) {
                                return React.createElement('tr', {
                                    key: m._id,
                                    onClick: function () { setSelected(m); setReplyText(m.ai_draft || ''); },
                                    style: { cursor: 'pointer', background: selected && selected._id === m._id ? '#EBF5FF' : m.is_read ? '#FFF' : '#FFFDF0', fontWeight: m.is_read ? 400 : 600 }
                                },
                                    React.createElement('td', { className: 'nowrap', style: { fontSize: 13 } }, m.from_name || m.from),
                                    React.createElement('td', { style: { fontSize: 13 } }, m.subject),
                                    React.createElement('td', { className: 'nowrap' }, (m.tags || []).map(function (t) { return React.createElement('span', { key: t, style: { padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: (tagColor[t] || '#888') + '15', color: tagColor[t] || '#888', marginRight: 4 } }, t); })),
                                    React.createElement('td', { className: 'nowrap', style: { fontSize: 11, color: '#8E8E93' } }, new Date(m.date).toLocaleString('vi-VN'))
                                );
                            }) : React.createElement('tr', null, React.createElement('td', { colSpan: 4, style: { textAlign: 'center', padding: '2rem', color: '#8E8E93' } }, 'Chua co mail nao'))
                    )
                )
            )
        ),

        React.createElement('div', { style: { flex: 1.5, minWidth: 350, background: '#FFF', borderRadius: 14, border: '1px solid #EEE', overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
            selected ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
                React.createElement('div', { style: { padding: '1rem', borderBottom: '1px solid #EEE', background: '#FAFAFC' } },
                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
                        React.createElement('div', null,
                            React.createElement('h3', { style: { margin: 0, fontSize: '1rem' } }, selected.subject),
                            React.createElement('p', { style: { margin: '4px 0 0', fontSize: 12, color: '#8E8E93' } }, selected.from_name || selected.from, ' <' + selected.from + '>')
                        ),
                        React.createElement('div', { style: { display: 'flex', gap: 4 } },
                            React.createElement('select', { value: selected.status, onChange: function (e: any) { updateStatus(selected._id, e.target.value); }, style: { padding: '4px 8px', borderRadius: 6, border: '1px solid #D2D2D7', fontSize: 11 } },
                                React.createElement('option', { value: 'new' }, 'Moi'), React.createElement('option', { value: 'pending' }, 'Dang xu ly'), React.createElement('option', { value: 'resolved' }, 'Da xong')
                            )
                        )
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: 4, marginTop: 6 } },
                        (selected.tags || []).map(function (t) { return React.createElement('span', { key: t, style: { padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: (tagColor[t] || '#888') + '15', color: tagColor[t] || '#888' } }, t); })
                    )
                ),
                React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '1rem', fontSize: 13, lineHeight: 1.6 }, dangerouslySetInnerHTML: { __html: selected.body_html || (selected.body_text || '').replace(/\n/g, '<br>') } }),
                React.createElement('div', { style: { padding: '1rem', borderTop: '1px solid #EEE', background: '#FAFAFC' } },
                    selected.ai_draft && !replyText ? React.createElement('div', { style: { marginBottom: 8, background: '#EBF5FF', borderRadius: 8, padding: 8, fontSize: 12, color: '#0071E3', display: 'flex', alignItems: 'center', gap: 6 } },
                        React.createElement('span', null, 'AI da soan san cau tra loi'),
                        React.createElement('button', { onClick: useAiDraft, style: { marginLeft: 'auto', border: 'none', background: '#0071E3', color: '#FFF', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 } }, 'Dung ban nhap')
                    ) : null,
                    React.createElement('textarea', { value: replyText, onChange: function (e: any) { setReplyText(e.target.value); }, rows: 4, placeholder: 'Soan cau tra loi...', style: { width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13, resize: 'vertical' } }),
                    React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
                        React.createElement('button', { onClick: handleSendReply, style: { border: 'none', background: '#0071E3', color: '#FFF', padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 } },
                            React.createElement(FiSend, null), ' Gui Tra Loi'
                        ),
                        React.createElement('button', { onClick: function () { setReplyText('Cam on ban da lien he. Chung toi se phan hoi som nhat.'); }, style: { border: 'none', background: '#F5F5F7', color: '#1D1D1F', padding: '8px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' } },
                            React.createElement(FiEdit3, { style: { marginRight: 4, verticalAlign: 'middle' } }), ' Mau'
                        )
                    )
                )
            ) : React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8E8E93', flexDirection: 'column', gap: 8 } },
                React.createElement(FiMail, { style: { fontSize: 40 } }),
                React.createElement('p', null, 'Chon mot email de xem chi tiet')
            )
        )
    );
};

export default Mailbox;