import dbConnect from './dbConnect.ts';
import EmailMessage from '../_models/EmailMessage.ts';
import Customer from '../_models/Customer.ts';
import Setting from '../_models/Setting.ts';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

export async function syncEmails(): Promise<{ success: boolean; count: number; message: string }> {
    await dbConnect();
    const setting = await Setting.findOne({ key: 'imap' });
    if (!setting?.value?.host || !setting.value.user || !setting.value.password) {
        return { success: false, count: 0, message: 'Chưa cấu hình IMAP' };
    }
    const config = { host: setting.value.host, port: Number(setting.value.port) || 993, user: setting.value.user, password: setting.value.password, tls: true };

    return new Promise((resolve) => {
        const imap = new Imap({ user: config.user, password: config.password, host: config.host, port: config.port, tls: config.tls, tlsOptions: { rejectUnauthorized: false }, connTimeout: 15000 });
        let count = 0;
        let resolved = false;
        const safeResolve = (data: any) => { if (!resolved) { resolved = true; try { imap.end(); } catch { } resolve(data); } };
        setTimeout(() => safeResolve({ success: true, count, message: 'Đã đồng bộ ' + count + ' mail' }), 60000);

        imap.once('ready', () => {
            imap.openBox('INBOX', false, (err: any, box: any) => {
                if (err) { safeResolve({ success: false, count: 0, message: 'Lỗi mở hộp thư: ' + err.message }); return; }
                const total = box.messages.total;
                const start = Math.max(1, total - 19);
                const fetch = imap.seq.fetch(start + ':' + total, { bodies: '' });
                fetch.on('message', (msg: any) => {
                    let raw = '';
                    msg.on('body', (stream: any) => { let b = ''; stream.on('data', (c: any) => b += c.toString('utf8')); stream.once('end', () => raw = b); });
                    msg.once('end', async () => {
                        try {
                            const parsed = await simpleParser(raw);
                            const mid = parsed.messageId || '';
                            if (!mid) return;
                            const existing = await EmailMessage.findOne({ message_id: mid });
                            if (existing) return;
                            const fromText = parsed.from?.text || '';
                            const fromName = parsed.from?.value?.[0]?.name || '';
                            const fromEmail = fromText.match(/<([^>]+)>/) ? fromText.match(/<([^>]+)>/)![1] : fromText;
                            const tags: string[] = [];
                            const combined = ((parsed.subject || '') + ' ' + (parsed.text || '')).toLowerCase();
                            if (/báo giá|mua sỉ|tư vấn|đặt hàng/i.test(combined)) tags.push('Kinh doanh');
                            if (/lỗi|không đăng nhập|bị đổi pass|die acc|sai mk|bảo hành/i.test(combined)) tags.push('Bảo hành');
                            if (/gia hạn|hết hạn|renew/i.test(combined)) tags.push('Gia hạn');
                            let linkedId = null;
                            if (fromEmail) {
                                const cust = await Customer.findOne({ email: { $regex: new RegExp(fromEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } });
                                if (cust) linkedId = cust._id;
                            }
                            let aiDraft = '';
                            if (linkedId) {
                                const cust = await Customer.findById(linkedId);
                                const name = cust?.name || fromName || 'Quý khách';
                                if (/lỗi|không đăng nhập|sai mk|bảo hành/i.test((parsed.subject || '').toLowerCase())) {
                                    aiDraft = 'Chào ' + name + ',\n\nShop đã nhận được phản hồi của bạn. Shop sẽ kiểm tra và gửi lại thông tin tài khoản mới ngay.\n\nTrân trọng,\nBeegadget.net';
                                }
                            }
                            const atts = (parsed.attachments || []).map((a: any) => ({ filename: a.filename || '', content_type: a.contentType || '', size: a.size || 0 }));
                            await EmailMessage.create({
                                message_id: mid, email_account: config.user,
                                from: fromEmail, from_name: fromName || fromEmail,
                                to: parsed.to?.text || '', subject: parsed.subject || '',
                                body_text: parsed.text || '', body_html: parsed.html || '',
                                date: parsed.date || new Date(), tags,
                                linked_customer_id: linkedId, ai_draft: aiDraft,
                                status: 'new', is_read: false,
                                attachments: atts
                            });
                            count++;
                        } catch { }
                    });
                });
                fetch.once('error', () => safeResolve({ success: true, count, message: 'Đã đồng bộ ' + count + ' mail' }));
                fetch.once('end', () => safeResolve({ success: true, count, message: 'Đã đồng bộ ' + count + ' mail' }));
            });
        });
        imap.once('error', (err: any) => { safeResolve({ success: false, count: 0, message: 'Lỗi IMAP: ' + err.message }); });
        imap.connect();
    });
}

export async function sendReplyMail({ to, subject, body }: { to: string; subject: string; body: string }): Promise<{ success: boolean; message: string }> {
    await dbConnect();
    const smtpSetting = await Setting.findOne({ key: 'smtp' });
    let smtpHost = process.env.SMTP_HOST, smtpPort = process.env.SMTP_PORT, smtpUser = process.env.SMTP_USER;
    let smtpPass = process.env.SMTP_PASS, smtpFrom = process.env.SMTP_FROM || smtpUser;
    if (smtpSetting?.value?.smtp_host && smtpSetting.value.smtp_user && smtpSetting.value.smtp_pass) {
        smtpHost = smtpSetting.value.smtp_host; smtpPort = String(smtpSetting.value.smtp_port);
        smtpUser = smtpSetting.value.smtp_user; smtpPass = smtpSetting.value.smtp_pass;
        smtpFrom = smtpSetting.value.smtp_from || smtpUser;
    }
    if (!smtpHost || !smtpUser || !smtpPass) return { success: false, message: 'Chưa cấu hình SMTP' };
    try {
        const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(smtpPort || 587), secure: Number(smtpPort) === 465, auth: { user: smtpUser, pass: smtpPass } });
        await transporter.sendMail({ from: smtpFrom, to, subject: 'Re: ' + subject, text: body });
        return { success: true, message: 'Đã gửi' };
    } catch (err: any) { return { success: false, message: err.message }; }
}