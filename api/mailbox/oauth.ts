import { getOAuthUrl, handleOAuthCallback, syncGmailEmails, sendGmailEmail } from '../_lib/gmailService.ts';

export default async function handler(req: any, res: any) {
    try {
        // GET /api/mailbox/oauth — get auth URL
        if (req.method === 'GET') {
            const url = getOAuthUrl();
            return res.status(200).json({ success: true, url });
        }
        res.status(405).json({ success: false });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}