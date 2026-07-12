import dbConnect from '../_lib/dbConnect.ts';
import EmailMessage from '../_models/EmailMessage.ts';
import { syncEmails } from '../_lib/imapService.ts';
import Setting from '../_models/Setting.ts';
import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const url = (req.url || req.originalUrl || '').toString();
    const id = req.query.id || req.params?.id
        || (url.includes('/sync') ? 'sync' : undefined)
        || (url.includes('/compose') ? 'compose' : undefined)
        || (url.includes('/reply') ? 'reply' : undefined)
        || (url.includes('/stats') ? 'stats' : undefined);
    const { method } = req;

    switch (method) {
        case 'GET':
            if (id === 'sync') {
                try { const result = await syncEmails(); return res.status(200).json(result); }
                catch (err: any) { return res.status(500).json({ success: false, message: err.message }); }
            }
            if (id === 'stats') {
                const s = { new: await EmailMessage.countDocuments({ status: 'new' }), pending: await EmailMessage.countDocuments({ status: 'pending' }), resolved: await EmailMessage.countDocuments({ status: 'resolved' }), sent: await EmailMessage.countDocuments({ status: 'sent' }) };
                return res.status(200).json({ success: true, data: s });
            }
            try {
                const { status, tag } = req.query;
                const filter: any = {};
                if (status) filter.status = status;
                if (tag) filter.tags = tag;
                const messages = await EmailMessage.find(filter).populate('linked_customer_id').sort({ date: -1 }).limit(100);
                return res.status(200).json({ success: true, data: messages });
            } catch (err: any) { return res.status(500).json({ success: false, message: err.message }); }

        case 'POST':
            if (id === 'compose') {
                const { to, subject, body } = req.body;
                if (!to || !subject || !body) return res.status(400).json({ success: false, message: 'Thieu thong tin' });
                const smtpSetting = await Setting.findOne({ key: 'smtp' });
                let smtpHost = process.env.SMTP_HOST, smtpPort = process.env.SMTP_PORT, smtpUser = process.env.SMTP_USER;
                let smtpPass = process.env.SMTP_PASS, smtpFrom = process.env.SMTP_FROM || smtpUser;
                if (smtpSetting?.value?.smtp_host && smtpSetting.value.smtp_user && smtpSetting.value.smtp_pass) {
                    smtpHost = smtpSetting.value.smtp_host; smtpPort = String(smtpSetting.value.smtp_port);
                    smtpUser = smtpSetting.value.smtp_user; smtpPass = smtpSetting.value.smtp_pass;
                    smtpFrom = smtpSetting.value.smtp_from || smtpUser;
                }
                if (!smtpHost || !smtpUser || !smtpPass) return res.status(400).json({ success: false, message: 'Chua cau hinh SMTP' });
                try {
                    const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(smtpPort || 587), secure: Number(smtpPort) === 465, auth: { user: smtpUser, pass: smtpPass } });
                    await transporter.sendMail({ from: smtpFrom, to, subject, text: body });
                    await EmailMessage.create({ from: smtpFrom, from_name: 'Toi', to, subject, body_text: body, body_html: body, date: new Date(), status: 'sent', is_read: true, tags: ['Da gui'], email_account: smtpFrom || '' });
                    return res.status(200).json({ success: true, message: 'Da gui mail' });
                } catch (e: any) { return res.status(500).json({ success: false, message: 'Loi SMTP: ' + e.message }); }
            }

            if (id === 'reply') {
                const { messageId, body } = req.body;
                if (!messageId || !body) return res.status(400).json({ success: false, message: 'Thieu du lieu' });
                const msg = await EmailMessage.findOne({ _id: messageId });
                if (!msg) return res.status(404).json({ success: false, message: 'Khong tim thay mail' });
                const smtpSetting = await Setting.findOne({ key: 'smtp' });
                let smtpHost = process.env.SMTP_HOST, smtpPort = process.env.SMTP_PORT, smtpUser = process.env.SMTP_USER;
                let smtpPass = process.env.SMTP_PASS, smtpFrom = process.env.SMTP_FROM || smtpUser;
                if (smtpSetting?.value?.smtp_host && smtpSetting.value.smtp_user && smtpSetting.value.smtp_pass) {
                    smtpHost = smtpSetting.value.smtp_host; smtpPort = String(smtpSetting.value.smtp_port);
                    smtpUser = smtpSetting.value.smtp_user; smtpPass = smtpSetting.value.smtp_pass;
                    smtpFrom = smtpSetting.value.smtp_from || smtpUser;
                }
                if (!smtpHost || !smtpUser || !smtpPass) return res.status(400).json({ success: false, message: 'Chua cau hinh SMTP' });
                try {
                    const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(smtpPort || 587), secure: Number(smtpPort) === 465, auth: { user: smtpUser, pass: smtpPass } });
                    await transporter.sendMail({ from: smtpFrom, to: msg.from, subject: 'Re: ' + msg.subject, text: body });
                    await EmailMessage.updateOne({ _id: messageId }, { $set: { status: 'resolved', is_read: true }, $push: { reply_history: { from: 'me', body, date: new Date() } } });
                    await EmailMessage.create({ from: smtpFrom, from_name: 'Toi', to: msg.from, subject: 'Re: ' + msg.subject, body_text: body, body_html: body, date: new Date(), status: 'sent', is_read: true, tags: ['Da gui'], email_account: smtpFrom || '', linked_customer_id: msg.linked_customer_id });
                    return res.status(200).json({ success: true, message: 'Da gui tra loi' });
                } catch (err: any) { return res.status(500).json({ success: false, message: err.message }); }
            }
            return res.status(400).json({ success: false });

        case 'PUT':
            if (!id) return res.status(400).json({ success: false });
            try { const msg = await EmailMessage.findByIdAndUpdate(id, req.body, { new: true }); return res.status(200).json({ success: true, data: msg }); }
            catch (err: any) { return res.status(400).json({ success: false, message: err.message }); }
        default: return res.status(405).json({ success: false });
    }
}