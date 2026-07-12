import { handleOAuthCallback } from '../_lib/gmailService.ts';

export default async function handler(req: any, res: any) {
    try {
        const code = req.query.code;
        if (!code) return res.status(400).send('Thiếu authorization code');

        const result = await handleOAuthCallback(code);
        if (result.success) {
            // Redirect back to mailbox page with success
            res.redirect('/mailbox?gmail_connected=1&email=' + encodeURIComponent(result.email || ''));
        } else {
            res.status(400).send('Lỗi xác thực: ' + result.message);
        }
    } catch (err: any) {
        res.status(500).send('Lỗi server: ' + err.message);
    }
}