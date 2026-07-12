import dbConnect from './dbConnect.ts';
import Setting from '../_models/Setting.ts';
import { google } from 'googleapis';
import EmailMessage from '../_models/EmailMessage.ts';
import Customer from '../_models/Customer.ts';

const OAUTH_CONFIG = {
    clientId: process.env.GMAIL_CLIENT_ID || '',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    redirectUri: process.env.GMAIL_REDIRECT_URI || 'https://crm.beegadget.net/api/mailbox/oauth-callback',
};

function createOAuth2Client() {
    return new google.auth.OAuth2(OAUTH_CONFIG.clientId, OAUTH_CONFIG.clientSecret, OAUTH_CONFIG.redirectUri);
}

async function getAuthClient() {
    await dbConnect();
    const setting = await Setting.findOne({ key: 'gmail_tokens' });
    if (!setting?.value?.refresh_token) throw new Error('Chưa cấu hình Gmail OAuth. Vui lòng kết nối Gmail.');

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
        refresh_token: setting.value.refresh_token,
        access_token: setting.value.access_token,
    });

    // Auto refresh if needed
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token || tokens.refresh_token) {
            await Setting.findOneAndUpdate({ key: 'gmail_tokens' }, {
                key: 'gmail_tokens',
                value: {
                    ...setting.value,
                    access_token: tokens.access_token || setting.value.access_token,
                    refresh_token: tokens.refresh_token || setting.value.refresh_token,
                }
            }, { upsert: true });
        }
    });

    return oauth2Client;
}

export function getOAuthUrl(): string {
    const oauth2Client = createOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
    });
}

export async function handleOAuthCallback(code: string): Promise<{ success: boolean; message: string; email?: string }> {
    await dbConnect();
    try {
        const oauth2Client = createOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user email
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        const email = profile.data.emailAddress || '';

        await Setting.findOneAndUpdate({ key: 'gmail_tokens' }, {
            key: 'gmail_tokens',
            value: {
                email,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            }
        }, { upsert: true });

        // Also save as IMAP for backward compat with mailbox page that reads `imap` key
        await Setting.findOneAndUpdate({ key: 'imap' }, {
            key: 'imap',
            value: {
                host: 'gmail-api',
                port: 443,
                user: email,
                password: 'oauth-token',
                oauth: true,
            }
        }, { upsert: true });

        return { success: true, message: 'Đã kết nối Gmail: ' + email, email };
    } catch (err: any) {
        return { success: false, message: 'Lỗi xác thực: ' + err.message };
    }
}

export async function syncGmailEmails(): Promise<{ success: boolean; count: number; message: string }> {
    try {
        const auth = await getAuthClient();
        const gmail = google.gmail({ version: 'v1', auth });

        // Get 20 most recent message IDs
        const listRes = await gmail.users.messages.list({ userId: 'me', maxResults: 20, q: 'in:inbox' });
        const messages = listRes.data.messages || [];
        if (!messages.length) return { success: true, count: 0, message: 'Không có mail mới' };

        let count = 0;
        for (const msg of messages) {
            try {
                const id = msg.id;
                if (!id) continue;

                // Check duplicate
                const existing = await EmailMessage.findOne({ message_id: id });
                if (existing) continue;

                // Get full message
                const detail = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
                const headers = detail.data.payload?.headers || [];
                const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
                const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
                const toHeader = headers.find((h: any) => h.name === 'To')?.value || '';
                const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';

                // Extract from name and email
                let fromName = fromHeader;
                let fromEmail = fromHeader;
                const match = fromHeader.match(/(.*?)\s*<(.+?)>/);
                if (match) {
                    fromName = match[1].trim().replace(/"/g, '');
                    fromEmail = match[2].trim();
                }

                // Get body
                const parts = detail.data.payload?.parts || [];
                let bodyHtml = '';
                let bodyText = '';
                if (detail.data.payload?.body?.data) {
                    bodyText = Buffer.from(detail.data.payload.body.data, 'base64').toString('utf8');
                }
                if (parts.length > 0) {
                    for (const part of parts) {
                        if (part.mimeType === 'text/plain' && part.body?.data) {
                            bodyText = Buffer.from(part.body.data, 'base64').toString('utf8');
                        }
                        if (part.mimeType === 'text/html' && part.body?.data) {
                            bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf8');
                        }
                    }
                }

                // Auto-tagging
                const tags: string[] = [];
                const combined = (subject + ' ' + bodyText).toLowerCase();
                if (/báo giá|mua sỉ|tư vấn|đặt hàng/i.test(combined)) tags.push('Kinh doanh');
                if (/lỗi|không đăng nhập|bị đổi pass|die acc|sai mk|bảo hành/i.test(combined)) tags.push('Bảo hành');
                if (/gia hạn|hết hạn|renew/i.test(combined)) tags.push('Gia hạn');

                // Auto-link customer
                let linkedId = null;
                if (fromEmail) {
                    const cust = await Customer.findOne({ email: { $regex: new RegExp(fromEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } });
                    if (cust) linkedId = cust._id;
                }

                let aiDraft = '';
                if (linkedId) {
                    const cust = await Customer.findById(linkedId);
                    const name = cust?.name || fromName || 'Quý khách';
                    if (/lỗi|không đăng nhập|sai mk|bảo hành/i.test(subject.toLowerCase())) {
                        aiDraft = `Chào ${name},\n\nShop đã nhận được phản hồi của bạn. Shop sẽ kiểm tra và gửi lại thông tin tài khoản mới ngay.\n\nTrân trọng,\nBeegadget.net`;
                    }
                }

                await EmailMessage.create({
                    message_id: id,
                    email_account: fromEmail,
                    from: fromEmail,
                    from_name: fromName,
                    to: toHeader,
                    subject,
                    body_text: bodyText,
                    body_html: bodyHtml,
                    date: new Date(dateHeader),
                    tags,
                    linked_customer_id: linkedId,
                    ai_draft: aiDraft,
                    status: 'new',
                    is_read: false,
                });
                count++;
            } catch { }
        }

        return { success: true, count, message: `Đã đồng bộ ${count} mail` };
    } catch (err: any) {
        return { success: false, count: 0, message: 'Lỗi Gmail API: ' + err.message };
    }
}

export async function sendGmailEmail({ to, subject, body }: { to: string; subject: string; body: string }): Promise<{ success: boolean; message: string }> {
    try {
        const auth = await getAuthClient();
        const gmail = google.gmail({ version: 'v1', auth });
        const raw = Buffer.from(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
        return { success: true, message: 'Đã gửi mail qua Gmail' };
    } catch (err: any) {
        return { success: false, message: 'Lỗi gửi mail: ' + err.message };
    }
}