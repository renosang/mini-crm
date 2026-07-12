import { syncEmails } from '../_lib/imapService.ts';

export default async function handler(req: any, res: any) {
    try {
        const result = await syncEmails();
        return res.status(200).json(result);
    } catch (err: any) {
        return res.status(500).json({ success: false, count: 0, message: 'Lỗi server: ' + err.message });
    }
}