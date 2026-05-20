import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const method = req.method;

    if (method === 'GET') {
        try {
            const setting = await Setting.findOne({ key: 'invoice_template' });
            if (!setting) {
                return res.status(200).json({
                    success: true,
                    data: {
                        title: 'HÓA ĐƠN BÁN HÀNG',
                        footer: 'Cảm ơn quý khách đã mua hàng!',
                        primaryColor: '#0071E3',
                        showLogo: true,
                        showSignature: false,
                        signature: '',
                        notes: ''
                    }
                });
            }
            res.status(200).json({ success: true, data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lấy mẫu hóa đơn', error: err.message });
        }
    } else if (method === 'POST') {
        try {
            const { title, footer, primaryColor, showLogo, showSignature, signature, notes } = req.body;
            const config = { title, footer, primaryColor, showLogo, showSignature, signature, notes };

            const setting = await Setting.findOneAndUpdate(
                { key: 'invoice_template' },
                { value: config },
                { new: true, upsert: true }
            );
            res.status(200).json({ success: true, message: 'Lưu mẫu hóa đơn thành công!', data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lưu mẫu hóa đơn', error: err.message });
        }
    } else {
        res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
    }
}
