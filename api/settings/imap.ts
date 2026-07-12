import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                const setting = await Setting.findOne({ key: 'imap' });
                return res.status(200).json({ success: true, value: setting?.value || null });
            } catch (err: any) {
                return res.status(500).json({ success: false, message: err.message });
            }

        case 'POST':
            try {
                await Setting.findOneAndUpdate(
                    { key: 'imap' },
                    { key: 'imap', value: req.body.value },
                    { upsert: true, new: true }
                );
                return res.status(200).json({ success: true, message: 'Đã lưu cấu hình IMAP' });
            } catch (err: any) {
                return res.status(500).json({ success: false, message: err.message });
            }

        default:
            return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
}