/**
 * GET  /api/omnichannel/zalo/messages?threadId=...&accountId=... → Lấy tin nhắn trong thread
 * POST /api/omnichannel/zalo/send → Gửi tin nhắn qua tài khoản Zalo
 */
import dbConnect from '../../_lib/dbConnect.ts';
import ZaloMessage from '../../_models/ZaloMessage.ts';
import { zaloManager } from '../../_lib/zaloSessionManager.ts';

export default async function handler(req: any, res: any) {
  await dbConnect();

  // GET: Lấy tin nhắn trong một thread cụ thể
  if (req.method === 'GET') {
    try {
      const { threadId, accountId } = req.query as { threadId: string; accountId: string };
      if (!threadId || !accountId) {
        return res.status(400).json({ success: false, message: 'Thiếu threadId hoặc accountId' });
      }

      const messages = await ZaloMessage
        .find({ threadId, accountId })
        .sort({ timestamp: 1 })
        .limit(100)
        .lean();

      const formatted = messages.map((m: any) => ({
        id: m._id.toString(),
        sender: m.isSelf ? 'admin' : 'customer',
        text: m.content || '',
        time: new Date(m.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }));

      return res.status(200).json({ success: true, data: formatted });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy tin nhắn', error: err.message });
    }
  }

  // POST: Gửi tin nhắn
  if (req.method === 'POST') {
    try {
      const { accountId, toId, message, threadType = 0 } = req.body;
      if (!accountId || !toId || !message) {
        return res.status(400).json({ success: false, message: 'Thiếu accountId, toId hoặc message' });
      }

      if (!zaloManager.isAccountActive(accountId)) {
        return res.status(400).json({ success: false, message: `Tài khoản ${accountId} chưa kết nối hoặc đã hết session` });
      }

      const result = await zaloManager.sendMessage(accountId, toId, message, threadType);

      // Lưu tin nhắn vừa gửi vào DB
      await ZaloMessage.create({
        accountId,
        threadId: toId,
        msgId: result?.msgId || `sent_${Date.now()}`,
        fromId: accountId,
        fromName: 'Admin',
        toId,
        content: message,
        msgType: 'text',
        timestamp: Date.now(),
        isSelf: true,
        direction: 'out'
      });

      return res.status(200).json({ success: true, message: 'Đã gửi tin nhắn', data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn: ' + err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
}
