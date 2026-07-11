/**
 * ZaloSessionManager — Singleton quản lý toàn bộ Zalo sessions
 * Hỗ trợ: QR login, multi-account, session persistence, real-time message listener
 */
import { Zalo, LoginQRCallbackEventType } from 'zca-js';
import type { LoginQRCallbackEvent } from 'zca-js';
import QRCode from 'qrcode';
import dbConnect from './dbConnect.ts';
import ZaloAccount from '../_models/ZaloAccount.ts';
import ZaloMessage from '../_models/ZaloMessage.ts';

// Kiểu dữ liệu session đang hoạt động
interface ActiveSession {
  accountId: string;
  api: any;                // zca-js API instance
  displayName: string;
  avatar: string;
}

// Kiểu SSE client
interface SSEClient {
  res: any;
  slotId: string;
}

// Trạng thái một slot QR đang chờ
interface QRSlot {
  slotId: string;
  status: 'initializing' | 'waiting_scan' | 'scanned' | 'confirmed' | 'expired' | 'error';
  qrBase64?: string;
  errorMsg?: string;
  scannedBy?: { name: string; avatar: string };
  sseClients: Set<any>;
}

class ZaloSessionManager {
  private sessions = new Map<string, ActiveSession>();
  private qrSlots = new Map<string, QRSlot>();
  private restored = false;

  // =====================
  // QR LOGIN FLOW
  // =====================

  /**
   * Bắt đầu flow đăng nhập QR cho một slot.
   * Ngay khi QR được tạo, gửi qua SSE cho client đang chờ.
   */
  async startQRLogin(slotId: string): Promise<void> {
    // Tạo slot mới
    const slot: QRSlot = {
      slotId,
      status: 'initializing',
      sseClients: new Set()
    };
    this.qrSlots.set(slotId, slot);

    try {
      const zalo = new Zalo();

      // loginQR là promise chỉ resolve sau khi user quét + xác nhận
      zalo.loginQR(
        { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
        async (event: LoginQRCallbackEvent) => {
          if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
            // zca-js trả về raw base64 image (PNG) trong event.data.image.
            // Phải prefix 'data:image/png;base64,' để frontend render thẻ <img> được.
            const qrBase64 = event.data.image ? `data:image/png;base64,${event.data.image}` : '';
            slot.qrBase64 = qrBase64;
            slot.status = 'waiting_scan';
            this.broadcastToSlot(slotId, { type: 'qr', qrBase64, status: 'waiting_scan' });

          } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
            slot.status = 'expired';
            this.broadcastToSlot(slotId, { type: 'expired', status: 'expired' });

          } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
            slot.status = 'scanned';
            slot.scannedBy = {
              name: event.data.display_name,
              avatar: event.data.avatar
            };
            this.broadcastToSlot(slotId, {
              type: 'scanned',
              status: 'scanned',
              name: event.data.display_name,
              avatar: event.data.avatar
            });

          } else if (event.type === LoginQRCallbackEventType.QRCodeDeclined) {
            slot.status = 'error';
            slot.errorMsg = 'Người dùng từ chối đăng nhập';
            this.broadcastToSlot(slotId, { type: 'declined', status: 'error' });

          } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
            // Login info received — promise sắp resolve
            console.log('[Zalo] Got login info for slot:', slotId);
          }
        }
      ).then(async (api: any) => {
        if (!api) {
          this.broadcastToSlot(slotId, { type: 'error', status: 'error', message: 'Đăng nhập thất bại' });
          return;
        }
        await this.onLoginSuccess(slotId, api);
      }).catch((err: any) => {
        console.error('[Zalo] QR login error:', err.message);
        if (slot.status !== 'confirmed') {
          slot.status = 'error';
          slot.errorMsg = err.message;
          this.broadcastToSlot(slotId, { type: 'error', status: 'error', message: err.message });
        }
      });

    } catch (err: any) {
      slot.status = 'error';
      slot.errorMsg = err.message;
      this.broadcastToSlot(slotId, { type: 'error', status: 'error', message: err.message });
    }
  }

  // =====================
  // SAU KHI LOGIN THÀNH CÔNG
  // =====================

  private async onLoginSuccess(slotId: string, api: any) {
    try {
      await dbConnect();

      // Lấy thông tin user
      let displayName = `Zalo Account`;
      let avatar = '';
      let accountId = `zalo_${Date.now()}`;

      try {
        const selfInfo = await api.getSelfInfo?.();
        if (selfInfo) {
          accountId = selfInfo.userId || selfInfo.uid || accountId;
          displayName = selfInfo.name || selfInfo.displayName || displayName;
          avatar = selfInfo.avatar || selfInfo.avatarUrl || '';
        }
      } catch (e) {
        console.warn('[Zalo] Could not fetch self info:', e);
      }

      // Lấy credentials để lưu DB
      let sessionData = { cookie: null as any, imei: '', userAgent: '' };
      try {
        const ctx = (api as any)?.ctx || (api as any)?.context;
        if (ctx) {
          sessionData.cookie = ctx.cookie ? JSON.parse(JSON.stringify(ctx.cookie)) : null;
          sessionData.imei = ctx.imei || '';
          sessionData.userAgent = ctx.userAgent || '';
        }
      } catch (e) {
        console.warn('[Zalo] Could not extract session data:', e);
      }

      // Lưu vào MongoDB
      await ZaloAccount.findOneAndUpdate(
        { accountId },
        {
          accountId,
          displayName,
          avatar,
          sessionData,
          status: 'active',
          connectedAt: new Date()
        },
        { upsert: true, new: true }
      );

      // Đăng ký session
      this.sessions.set(accountId, { accountId, api, displayName, avatar });

      // Bắt đầu lắng nghe tin nhắn
      this.startListener(accountId, api);

      // Thông báo cho frontend
      const slot = this.qrSlots.get(slotId);
      if (slot) {
        slot.status = 'confirmed';
        this.broadcastToSlot(slotId, {
          type: 'confirmed',
          status: 'confirmed',
          accountId,
          displayName,
          avatar
        });
        // Cleanup slot sau 10s
        setTimeout(() => {
          this.qrSlots.delete(slotId);
        }, 10000);
      }

      console.log(`[Zalo] ✅ Account connected: ${displayName} (${accountId})`);
    } catch (err: any) {
      console.error('[Zalo] onLoginSuccess error:', err.message);
      this.broadcastToSlot(slotId, { type: 'error', message: 'Lỗi lưu session: ' + err.message });
    }
  }

  // =====================
  // MESSAGE LISTENER
  // =====================

  private startListener(accountId: string, api: any) {
    try {
      api.listener.on('message', async (msg: any) => {
        await this.saveMessage(accountId, msg);
      });

      // Lắng nghe sự kiện đồng bộ tin nhắn cũ
      api.listener.on('old_messages', async (messages: any[]) => {
        console.log(`[Zalo] 📥 Syncing ${messages?.length || 0} old messages for ${accountId}...`);
        if (Array.isArray(messages)) {
          for (const msg of messages) {
            await this.saveMessage(accountId, msg);
          }
        }
      });

      api.listener.on('closed', (code: any, reason: string) => {
        console.warn(`[Zalo] Listener closed for ${accountId}: ${code} - ${reason}`);
        // Nếu bị đẩy ra (duplicate connection, etc), mark expired
        if (code === 3000 || code === 3003) {
          ZaloAccount.findOneAndUpdate({ accountId }, { status: 'expired' }).catch(() => {});
          this.sessions.delete(accountId);
        }
      });

      api.listener.on('error', (err: any) => {
        console.error(`[Zalo] Listener error for ${accountId}:`, err);
      });

      api.listener.on('connected', () => {
        console.log(`[Zalo] 🔗 Listener connected for ${accountId}. Requesting sync...`);
        try {
          api.listener.requestOldMessages(0); // ThreadType.User
          api.listener.requestOldMessages(1); // ThreadType.Group
        } catch (e) {}
      });

      api.listener.start({ retryOnClose: true });
      console.log(`[Zalo] 🎧 Listener started for ${accountId}`);
    } catch (err: any) {
      console.error('[Zalo] Error starting listener:', err.message);
    }
  }

  private async saveMessage(accountId: string, msg: any) {
    try {
      await dbConnect();

      const data = msg.data || {};
      const msgId = data.msgId || data.cliMsgId || `${accountId}_${Date.now()}_${Math.random()}`;
      const threadId = msg.threadId || data.idTo || data.uidFrom || 'unknown';
      const fromId = data.uidFrom || '';
      const toId = data.idTo || '';
      const content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content || '');
      const timestamp = parseInt(data.ts || '0') || Date.now();

      await ZaloMessage.findOneAndUpdate(
        { msgId, accountId },
        {
          accountId,
          threadId,
          msgId,
          fromId,
          fromName: data.dName || '',
          fromAvatar: '',
          toId,
          content,
          msgType: data.msgType || 'text',
          timestamp,
          isSelf: msg.isSelf || false,
          direction: msg.isSelf ? 'out' : 'in'
        },
        { upsert: true, new: true }
      );
    } catch (err: any) {
      // Bỏ qua lỗi duplicate key
      if (!err.message?.includes('duplicate')) {
        console.error('[Zalo] Error saving message:', err.message);
      }
    }
  }

  // =====================
  // RESTORE SESSIONS
  // =====================

  async restoreAllSessions() {
    if (this.restored) return;
    this.restored = true;

    try {
      await dbConnect();
      const accounts = await ZaloAccount.find({ status: 'active' });
      console.log(`[Zalo] Restoring ${accounts.length} session(s)...`);

      for (const account of accounts) {
        try {
          const { cookie, imei, userAgent } = account.sessionData || {};
          if (!cookie) {
            console.warn(`[Zalo] No cookie for ${account.accountId}, skipping`);
            continue;
          }

          const zalo = new Zalo();
          const api = await zalo.login({
            cookie,
            imei: imei || '',
            userAgent: userAgent || 'Mozilla/5.0'
          });

          this.sessions.set(account.accountId, {
            accountId: account.accountId,
            api,
            displayName: account.displayName,
            avatar: account.avatar
          });

          this.startListener(account.accountId, api);
          console.log(`[Zalo] ✅ Restored: ${account.displayName}`);
        } catch (err: any) {
          console.error(`[Zalo] ❌ Failed to restore ${account.displayName}:`, err.message);
          await ZaloAccount.findOneAndUpdate({ accountId: account.accountId }, { status: 'expired' });
        }
      }
    } catch (err: any) {
      console.error('[Zalo] Error in restoreAllSessions:', err.message);
    }
  }

  // =====================
  // SSE HELPERS
  // =====================

  getSlot(slotId: string): QRSlot | undefined {
    return this.qrSlots.get(slotId);
  }

  addSSEClient(slotId: string, res: any) {
    const slot = this.qrSlots.get(slotId);
    if (!slot) return false;

    slot.sseClients.add(res);

    // Gửi trạng thái hiện tại ngay lập tức nếu đã có QR
    if (slot.qrBase64 && slot.status === 'waiting_scan') {
      res.write(`data: ${JSON.stringify({ type: 'qr', qrBase64: slot.qrBase64, status: 'waiting_scan' })}\n\n`);
    } else if (slot.status === 'initializing') {
      res.write(`data: ${JSON.stringify({ type: 'init', status: 'initializing' })}\n\n`);
    }

    return true;
  }

  removeSSEClient(slotId: string, res: any) {
    this.qrSlots.get(slotId)?.sseClients.delete(res);
  }

  private broadcastToSlot(slotId: string, data: object) {
    const slot = this.qrSlots.get(slotId);
    if (!slot) return;
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    slot.sseClients.forEach(client => {
      try { client.write(msg); } catch {}
    });
  }

  // =====================
  // PUBLIC API
  // =====================

  async sendMessage(accountId: string, toId: string, content: string, threadType = 0) {
    const session = this.sessions.get(accountId);
    if (!session) throw new Error(`Không tìm thấy session cho tài khoản ${accountId}`);
    return await session.api.sendMessage({ msg: content }, toId, threadType);
  }

  async disconnectAccount(accountId: string) {
    const session = this.sessions.get(accountId);
    if (session) {
      try { session.api.listener?.stop(); } catch {}
      this.sessions.delete(accountId);
    }
    await dbConnect();
    await ZaloAccount.findOneAndUpdate({ accountId }, { status: 'expired' });
  }

  getActiveSessions(): ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  isAccountActive(accountId: string): boolean {
    return this.sessions.has(accountId);
  }
}

// Export singleton
export const zaloManager = new ZaloSessionManager();
