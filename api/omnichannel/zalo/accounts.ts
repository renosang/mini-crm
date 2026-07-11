/**
 * GET    /api/omnichannel/zalo/accounts        → Danh sách tài khoản Zalo
 * DELETE /api/omnichannel/zalo/accounts?id=... → Ngắt kết nối tài khoản
 */
import dbConnect from '../../_lib/dbConnect.ts';
import ZaloAccount from '../../_models/ZaloAccount.ts';
import { zaloManager } from '../../_lib/zaloSessionManager.ts';

export default async function handler(req: any, res: any) {
  await dbConnect();
  const method = req.method;

  if (method === 'GET') {
    try {
      const accounts = await ZaloAccount.find({}).sort({ connectedAt: -1 }).lean();

      // Gắn thêm trạng thái live từ session manager
      const enriched = accounts.map((acc: any) => ({
        accountId: acc.accountId,
        displayName: acc.displayName || `Tài khoản ${acc.accountId}`,
        avatar: acc.avatar || '',
        phone: acc.phone || '',
        status: acc.status,
        isLive: zaloManager.isAccountActive(acc.accountId),
        connectedAt: acc.connectedAt,
        createdAt: acc.createdAt
      }));

      return res.status(200).json({ success: true, data: enriched });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tài khoản', error: err.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const accountId = req.query?.id as string;
      if (!accountId) {
        return res.status(400).json({ success: false, message: 'Thiếu accountId' });
      }

      await zaloManager.disconnectAccount(accountId);
      return res.status(200).json({ success: true, message: 'Đã ngắt kết nối tài khoản Zalo' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Lỗi ngắt kết nối', error: err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
}
