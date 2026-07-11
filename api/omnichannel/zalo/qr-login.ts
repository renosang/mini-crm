/**
 * POST /api/omnichannel/zalo/qr-start  → Bắt đầu QR flow, trả về slotId
 * GET  /api/omnichannel/zalo/qr-stream/:slotId → SSE stream: QR image + status updates
 */
import { randomBytes } from 'crypto';
import { zaloManager } from '../../_lib/zaloSessionManager.ts';

export default async function handler(req: any, res: any) {
  const method = req.method;
  const slotId = (req.query?.slotId || req.params?.slotId) as string;

  // POST: Khởi tạo QR login slot
  if (method === 'POST') {
    const newSlotId = randomBytes(8).toString('hex');

    // Bắt đầu QR flow bất đồng bộ (không await — sẽ gửi QR qua SSE)
    zaloManager.startQRLogin(newSlotId).catch(err => {
      console.error('[Zalo QR] startQRLogin error:', err.message);
    });

    return res.status(200).json({ success: true, slotId: newSlotId });
  }

  // GET: SSE stream cho slotId đã tạo
  if (method === 'GET' && slotId) {
    const slot = zaloManager.getSlot(slotId);
    if (!slot) {
      // Slot có thể chưa được tạo nếu POST và GET gần nhau — retry sau 1s
      // Trả về SSE với timeout để client retry
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ type: 'init', status: 'initializing' })}\n\n`);

      // Thử add vào slot sau 500ms
      setTimeout(() => {
        const found = zaloManager.addSSEClient(slotId, res);
        if (!found) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Slot không tồn tại' })}\n\n`);
          res.end();
        }
      }, 500);
    } else {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Gửi ping để giữ kết nối
      const pingInterval = setInterval(() => {
        try { res.write(':ping\n\n'); } catch { clearInterval(pingInterval); }
      }, 20000);

      zaloManager.addSSEClient(slotId, res);

      // Cleanup khi client ngắt kết nối
      req.on('close', () => {
        clearInterval(pingInterval);
        zaloManager.removeSSEClient(slotId, res);
      });
    }
    return;
  }

  return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
}
