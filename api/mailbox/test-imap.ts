import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';
import Imap from 'imap';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const setting = await Setting.findOne({ key: 'imap' });
    if (!setting?.value?.host || !setting.value.user || !setting.value.password) {
        return res.status(200).json({ success: false, message: 'Chưa cấu hình IMAP. Vui lòng nhập Email và App Password.' });
    }
    const config = setting.value;

    // Test connection
    try {
        const result = await new Promise((resolve) => {
            const imap = new Imap({
                user: config.user,
                password: config.password,
                host: config.host || 'imap.gmail.com',
                port: Number(config.port) || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            });
            const timer = setTimeout(() => { try { imap.end(); } catch { } resolve({ success: false, message: '⏰ Hết thời gian kết nối (15s). Gmail có thể đang chặn kết nối từ máy chủ Vercel.' }); }, 15000);

            imap.once('ready', () => {
                clearTimeout(timer);
                imap.openBox('INBOX', false, (err: any, box: any) => {
                    if (err) {
                        try { imap.end(); } catch { }
                        resolve({ success: false, message: 'Lỗi mở hộp thư: ' + err.message });
                        return;
                    }
                    const totalMessages = box.messages?.total || 0;
                    try { imap.end(); } catch { }
                    resolve({ success: true, message: '✅ Kết nối thành công! Hộp thư có ' + totalMessages + ' mail.', totalMessages });
                });
            });

            imap.once('error', (err: any) => {
                clearTimeout(timer);
                try { imap.end(); } catch { }
                resolve({ success: false, message: '❌ Lỗi kết nối: ' + (err.message || err) });
            });

            imap.connect();
        });

        return res.status(200).json(result);
    } catch (err: any) {
        return res.status(200).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}