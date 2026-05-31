import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';
import axios from 'axios';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const method = req.method;

    if (method === 'POST') {
        try {
            const { eventType, eventData } = req.body;
            // eventType can be: 'order_paid', 'renewal_warning', 'customer_waiting'
            
            // Load omnichannel settings to check if Telegram alert is enabled
            const setting = await Setting.findOne({ key: 'omnichannel' });
            const isTelegramEnabled = setting?.value?.telegramEnabled;
            const botToken = setting?.value?.telegramBotToken;
            
            // For testing/alerts, we can have a default group chat ID from env or fallback
            // In a real setup, they might specify a chat_id in the payload or settings.
            const telegramChatId = process.env.TELEGRAM_ALERT_CHAT_ID || '-1002148789324'; // default mock/env group ID

            let messageText = '';
            if (eventType === 'order_paid') {
                messageText = `🛒 *Đơn Hàng Mới Được Thanh Toán* \n\n` +
                              `• *Khách hàng:* ${eventData.customerName || 'Khách ẩn danh'}\n` +
                              `• *Số tiền:* ${eventData.amount?.toLocaleString('vi-VN')} ₫\n` +
                              `• *Sản phẩm:* ${eventData.productName || 'Dịch vụ'}\n` +
                              `• *Mã hóa đơn:* #${eventData.invoiceId || 'N/A'}\n` +
                              `• *Thời gian:* ${new Date().toLocaleString('vi-VN')}\n\n` +
                              `⚡ _Hệ thống đã tự động kích hoạt tài nguyên._`;
            } else if (eventType === 'renewal_warning') {
                messageText = `⚠️ *Cảnh Báo Sắp Hết Hạn Dịch Vụ* \n\n` +
                              `• *Khách hàng:* ${eventData.customerName}\n` +
                              `• *Dịch vụ:* ${eventData.productName}\n` +
                              `• *Hạn dùng còn lại:* *${eventData.daysLeft} ngày* (Hết hạn ngày: ${eventData.expiryDate})\n` +
                              `• *Số điện thoại:* ${eventData.phone || 'N/A'}\n\n` +
                              `🔔 _Đã gửi email nhắc gia hạn tự động tới khách hàng._`;
            } else if (eventType === 'customer_waiting') {
                messageText = `🔥 *Khách Hàng Chờ Phản Hồi Quá Hạn* \n\n` +
                              `• *Nguồn chat:* [${eventData.channel?.toUpperCase()}] - ${eventData.customerName}\n` +
                              `• *Thời gian chờ:* *${eventData.waitingTime} phút*\n` +
                              `• *Tin nhắn cuối:* "${eventData.lastMessage}"\n\n` +
                              `👉 _Vui lòng truy cập Omnichannel Inbox của CRM để phản hồi ngay!_`;
            } else {
                messageText = `🔔 *CRM Thông Báo:* ${JSON.stringify(eventData)}`;
            }

            let sentToTelegram = false;
            let telegramResponse = null;

            if (isTelegramEnabled && botToken && telegramChatId) {
                try {
                    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        chat_id: telegramChatId,
                        text: messageText,
                        parse_mode: 'Markdown'
                    });
                    sentToTelegram = true;
                    telegramResponse = response.data;
                } catch (teleErr: any) {
                    console.error('Lỗi khi gửi tin nhắn Telegram Bot:', teleErr.message);
                }
            }

            res.status(200).json({
                success: true,
                message: 'Kích hoạt cảnh báo thành công!',
                sentToTelegram,
                simulated: !sentToTelegram,
                messageText,
                telegramResponse
            });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi kích hoạt cảnh báo', error: err.message });
        }
    } else {
        res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
    }
}
