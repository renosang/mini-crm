import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const method = req.method;

    if (method === 'GET') {
        try {
            const setting = await Setting.findOne({ key: 'general' });
            if (!setting) {
                return res.status(200).json({
                    success: true,
                    data: {
                        storeName: 'Mini CRM',
                        taxCode: '',
                        address: '',
                        phone: '',
                        email: '',
                        logo: '',
                        timezone: 'Asia/Ho_Chi_Minh',
                        currency: 'VND'
                    }
                });
            }
            res.status(200).json({ success: true, data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lấy cài đặt chung', error: err.message });
        }
    } else if (method === 'POST') {
        try {
            const { storeName, taxCode, address, phone, email, logo, timezone, currency } = req.body;
            const generalConfig = { storeName, taxCode, address, phone, email, logo, timezone, currency };

            const setting = await Setting.findOneAndUpdate(
                { key: 'general' },
                { value: generalConfig },
                { new: true, upsert: true }
            );
            res.status(200).json({ success: true, message: 'Lưu cài đặt chung thành công!', data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lưu cài đặt chung', error: err.message });
        }
    } else {
        res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
    }
}
