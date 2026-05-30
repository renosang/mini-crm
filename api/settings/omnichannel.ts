import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const method = req.method;

    if (method === 'GET') {
        try {
            const setting = await Setting.findOne({ key: 'omnichannel' });
            if (!setting) {
                return res.status(200).json({
                    success: true,
                    data: {
                        zaloEnabled: false,
                        zaloAccountType: 'oa',
                        zaloAppId: '',
                        zaloSecretKey: '',
                        zaloAccessToken: '',
                        zaloRefreshToken: '',
                        zaloCookie: '',
                        telegramEnabled: false,
                        telegramAccountType: 'bot',
                        telegramBotToken: '',
                        telegramBotUsername: '',
                        telegramApiId: '',
                        telegramApiHash: '',
                        telegramSession: '',
                        facebookEnabled: false,
                        facebookPageId: '',
                        facebookPageAccessToken: '',
                        facebookAppSecret: '',
                        facebookVerifyToken: 'minicrm_omnichannel_verify_token_123'
                    }
                });
            }
            res.status(200).json({ success: true, data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lấy cài đặt Omnichannel', error: err.message });
        }
    } else if (method === 'POST') {
        try {
            const {
                zaloEnabled, zaloAccountType, zaloAppId, zaloSecretKey, zaloAccessToken, zaloRefreshToken, zaloCookie,
                telegramEnabled, telegramAccountType, telegramBotToken, telegramBotUsername, telegramApiId, telegramApiHash, telegramSession,
                facebookEnabled, facebookPageId, facebookPageAccessToken, facebookAppSecret, facebookVerifyToken
            } = req.body;

            const config = {
                zaloEnabled: !!zaloEnabled,
                zaloAccountType: zaloAccountType || 'oa',
                zaloAppId: zaloAppId || '',
                zaloSecretKey: zaloSecretKey || '',
                zaloAccessToken: zaloAccessToken || '',
                zaloRefreshToken: zaloRefreshToken || '',
                zaloCookie: zaloCookie || '',
                telegramEnabled: !!telegramEnabled,
                telegramAccountType: telegramAccountType || 'bot',
                telegramBotToken: telegramBotToken || '',
                telegramBotUsername: telegramBotUsername || '',
                telegramApiId: telegramApiId || '',
                telegramApiHash: telegramApiHash || '',
                telegramSession: telegramSession || '',
                facebookEnabled: !!facebookEnabled,
                facebookPageId: facebookPageId || '',
                facebookPageAccessToken: facebookPageAccessToken || '',
                facebookAppSecret: facebookAppSecret || '',
                facebookVerifyToken: facebookVerifyToken || 'minicrm_omnichannel_verify_token_123'
            };

            const setting = await Setting.findOneAndUpdate(
                { key: 'omnichannel' },
                { value: config },
                { new: true, upsert: true }
            );
            res.status(200).json({ success: true, message: 'Lưu cài đặt Omnichannel thành công!', data: setting.value });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lưu cài đặt Omnichannel', error: err.message });
        }
    } else {
        res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
    }
}
