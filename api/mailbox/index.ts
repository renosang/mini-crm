import dbConnect from '../_lib/dbConnect.ts';
import EmailMessage from '../_models/EmailMessage.ts';
import { syncEmails, sendReplyMail } from '../_lib/imapService.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const id = req.query.id || req.params?.id;
    const { method } = req;

    switch (method) {
        case 'GET':
            if (id === 'sync') {
                try {
                    const result = await syncEmails();
                    return res.status(200).json(result);
                } catch (err: any) {
                    return res.status(500).json({ success: false, message: err.message });
                }
            }
            if (id === 'stats') {
                const stats = { new: await EmailMessage.countDocuments({ status: 'new' }), pending: await EmailMessage.countDocuments({ status: 'pending' }), resolved: await EmailMessage.countDocuments({ status: 'resolved' }) };
                return res.status(200).json({ success: true, data: stats });
            }
            try {
                const { status, tag } = req.query;
                const filter: any = {};
                if (status) filter.status = status;
                if (tag) filter.tags = tag;
                const messages = await EmailMessage.find(filter).populate('linked_customer_id').sort({ date: -1 }).limit(100);
                return res.status(200).json({ success: true, data: messages });
            } catch (err: any) {
                return res.status(500).json({ success: false, message: err.message });
            }

        case 'POST':
            if (id === 'reply') {
                const { messageId, body } = req.body;
                if (!messageId || !body) return res.status(400).json({ success: false, message: 'Thiếu dữ liệu' });
                const msg = await EmailMessage.findOne({ _id: messageId });
                if (!msg) return res.status(404).json({ success: false, message: 'Không tìm thấy mail' });
                const result = await sendReplyMail({ to: msg.from, subject: msg.subject, body });
                if (result.success) {
                    await EmailMessage.updateOne({ _id: messageId }, { $set: { status: 'resolved', is_read: true }, $push: { reply_history: { from: 'me', body, date: new Date() } } });
                    return res.status(200).json(result);
                }
                return res.status(500).json(result);
            }

        case 'PUT':
            if (!id) return res.status(400).json({ success: false });
            try {
                const update = { ...req.body };
                const msg = await EmailMessage.findByIdAndUpdate(id, update, { new: true });
                return res.status(200).json({ success: true, data: msg });
            } catch (err: any) {
                return res.status(400).json({ success: false, message: err.message });
            }

        default:
            return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
}