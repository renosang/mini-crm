import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const method = req.method;

    if (method === 'GET') {
        try {
            const setting = await Setting.findOne({ key: 'renewal' });
            if (!setting) {
                return res.status(200).json({
                    success: true,
                    data: {
                        warningDays: 7,
                        autoRemind: true,
                        maxReminders: 3,
                        autoSuspend: true,
                        suspendAfterDays: 3,
                        defaultRenewalFee: 0,
                        promoMessage: ''
                    }
                });
            }
            res.status(200).json({ success: true, data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lấy cấu hình gia hạn', error: err.message });
        }
    } else if (method === 'POST') {
        try {
            const { warningDays, autoRemind, maxReminders, autoSuspend, suspendAfterDays, defaultRenewalFee, promoMessage } = req.body;
            const config = {
                warningDays: Number(warningDays),
                autoRemind: Boolean(autoRemind),
                maxReminders: Number(maxReminders),
                autoSuspend: Boolean(autoSuspend),
                suspendAfterDays: Number(suspendAfterDays),
                defaultRenewalFee: Number(defaultRenewalFee),
                promoMessage: promoMessage || ''
            };

            const setting = await Setting.findOneAndUpdate(
                { key: 'renewal' },
                { value: config },
                { new: true, upsert: true }
            );
            res.status(200).json({ success: true, message: 'Lưu cấu hình gia hạn thành công!', data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lưu cấu hình gia hạn', error: err.message });
        }
    } else {
        res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
    }
}
