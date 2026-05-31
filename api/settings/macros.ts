import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const method = req.method;

    if (method === 'GET') {
        try {
            const setting = await Setting.findOne({ key: 'chat-macros' });
            if (!setting) {
                const defaultMacros = [
                    { shortcut: '/payment', text: 'Bạn vui lòng chuyển khoản qua thông tin ngân hàng hiển thị trên hóa đơn. Sau khi thanh toán, hệ thống sẽ tự động kích hoạt trong vòng 1-3 phút.' },
                    { shortcut: '/proxy', text: 'Chào bạn, đối với dịch vụ Proxy, bạn có thể cấu hình HTTP Proxy trực tiếp vào trình duyệt Antidetect hoặc ứng dụng proxy với định dạng IP:PORT:USER:PASS.' },
                    { shortcut: '/support', text: 'Chào bạn, tôi là kỹ thuật viên hỗ trợ. Bạn vui lòng gửi giúp tôi Mã đơn hàng hoặc Số điện thoại mua hàng để tôi kiểm tra trạng thái dịch vụ nhé!' },
                    { shortcut: '/renewal', text: 'Dịch vụ của bạn sắp hết hạn. Bạn có thể bấm nút "Gia Hạn" trên trang cá nhân hoặc quét mã VietQR gia hạn để tránh bị ngắt kết nối gián đoạn.' }
                ];
                return res.status(200).json({ success: true, data: defaultMacros });
            }
            res.status(200).json({ success: true, data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách câu trả lời nhanh', error: err.message });
        }
    } else if (method === 'POST') {
        try {
            const { macros } = req.body;
            if (!Array.isArray(macros)) {
                return res.status(400).json({ success: false, message: 'Danh sách macros không hợp lệ' });
            }

            const setting = await Setting.findOneAndUpdate(
                { key: 'chat-macros' },
                { value: macros },
                { new: true, upsert: true }
            );
            res.status(200).json({ success: true, message: 'Lưu câu trả lời nhanh thành công!', data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lưu câu trả lời nhanh', error: err.message });
        }
    } else {
        res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
    }
}
