import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const method = req.method;

    if (method === 'GET') {
        try {
            const setting = await Setting.findOne({ key: 'email_templates' });
            if (!setting) {
                return res.status(200).json({
                    success: true,
                    data: {
                        handover: {
                            subject: '🎉 Bàn giao tài khoản - {{customer_name}}',
                            body: `Xin chào {{customer_name}},\n\nCảm ơn bạn đã mua hàng tại {{store_name}}.\n\nDưới đây là thông tin tài khoản của bạn:\n- Tài khoản: {{account_info}}\n- Hạn sử dụng: {{expiry_date}}\n\nVui lòng liên hệ ngay nếu bạn cần hỗ trợ thêm.\n\nTrân trọng,\n{{store_name}}`
                        },
                        renewal_reminder: {
                            subject: '⚠️ Nhắc gia hạn - {{customer_name}}',
                            body: `Xin chào {{customer_name}},\n\nTài khoản của bạn sắp hết hạn vào ngày {{expiry_date}}.\n\nVui lòng gia hạn để tiếp tục sử dụng dịch vụ.\n\nTrân trọng,\n{{store_name}}`
                        },
                        thank_you: {
                            subject: '🙏 Cảm ơn - {{customer_name}}',
                            body: `Xin chào {{customer_name}},\n\nCảm ơn bạn đã tin tưởng và sử dụng dịch vụ của {{store_name}}.\n\nChúng tôi hy vọng được tiếp tục phục vụ bạn trong thời gian tới.\n\nTrân trọng,\n{{store_name}}`
                        }
                    }
                });
            }
            res.status(200).json({ success: true, data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lấy mẫu email', error: err.message });
        }
    } else if (method === 'POST') {
        try {
            const { handover, renewal_reminder, thank_you } = req.body;

            if (!handover || !renewal_reminder || !thank_you) {
                return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ các mẫu email' });
            }

            const config = { handover, renewal_reminder, thank_you };

            const setting = await Setting.findOneAndUpdate(
                { key: 'email_templates' },
                { value: config },
                { new: true, upsert: true }
            );
            res.status(200).json({ success: true, message: 'Lưu mẫu email thành công!', data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lưu mẫu email', error: err.message });
        }
    } else {
        res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
    }
}
