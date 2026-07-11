import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const method = req.method;

    if (method === 'GET') {
        try {
            const setting = await Setting.findOne({ key: 'email_templates' });
            const defaultTemplates = {
                welcome: {
                    subject: '🎉 Chào mừng thành viên mới - {{customer_name}}',
                    body: `Xin chào {{customer_name}},\n\nChào mừng bạn đã đăng ký thành viên thành công tại {{store_name}}.\n\nTài khoản của bạn đã được kích hoạt trên hệ thống.\n\nTrân trọng,\n{{store_name}}`
                },
                invoice: {
                    subject: '🧾 Hóa đơn thanh toán đơn hàng {{order_id}} - {{customer_name}}',
                    body: `Xin chào {{customer_name}},\n\nCảm ơn bạn đã mua hàng tại {{store_name}}.\n\nDưới đây là thông tin hóa đơn của bạn:\n- Mã đơn hàng: {{order_id}}\n- Tổng thanh toán: {{total_amount}}\n- Ngày thanh toán: {{payment_date}}\n\nTrân trọng,\n{{store_name}}`
                },
                renewal: {
                    subject: '🔄 Xác nhận gia hạn dịch vụ thành công - {{customer_name}}',
                    body: `Xin chào {{customer_name}},\n\nDịch vụ của bạn đã được gia hạn thành công.\n- Sản phẩm: {{product_name}}\n- Hạn sử dụng mới: {{expiry_date}}\n\nCảm ơn bạn đã tiếp tục đồng hành cùng {{store_name}}.\n\nTrân trọng,\n{{store_name}}`
                },
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
            };

            if (!setting) {
                return res.status(200).json({
                    success: true,
                    data: defaultTemplates
                });
            }

            // Merge with default values in case user has partial/legacy setting
            const merged = { ...defaultTemplates, ...setting.value };
            res.status(200).json({ success: true, data: merged });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lấy mẫu email', error: err.message });
        }
    } else if (method === 'POST') {
        try {
            const { welcome, invoice, renewal, renewal_reminder, handover, thank_you } = req.body;

            const config = { welcome, invoice, renewal, renewal_reminder, handover, thank_you };

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
