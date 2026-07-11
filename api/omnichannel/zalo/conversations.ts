/**
 * GET /api/omnichannel/zalo/conversations
 * Lấy danh sách hội thoại với tin nhắn cuối cùng từ DB.
 * Query: ?accountId=all|specificId&limit=50
 */
import dbConnect from '../../_lib/dbConnect.ts';
import ZaloMessage from '../../_models/ZaloMessage.ts';
import ZaloAccount from '../../_models/ZaloAccount.ts';
import { zaloManager } from '../../_lib/zaloSessionManager.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ GET' });
  }

  try {
    await dbConnect();

    const accountIdFilter = req.query?.accountId as string || 'all';
    const limit = parseInt(req.query?.limit as string || '50', 10);

    // Build filter
    const filter: any = {};
    if (accountIdFilter && accountIdFilter !== 'all') {
      filter.accountId = accountIdFilter;
    }

    // Lấy tin nhắn cuối cùng cho mỗi threadId
    const lastMessages = await ZaloMessage.aggregate([
      { $match: filter },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: { accountId: '$accountId', threadId: '$threadId' },
          lastMsg: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [{ $eq: ['$direction', 'in'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { 'lastMsg.timestamp': -1 } },
      { $limit: limit }
    ]);

    // Lấy thông tin tài khoản để hiển thị
    const accountIds = [...new Set(lastMessages.map((m: any) => m._id.accountId))];
    const accounts = await ZaloAccount.find({ accountId: { $in: accountIds } }).lean();
    const accountMap = new Map(accounts.map((a: any) => [a.accountId, a]));

    // Lấy thông tin User Profile (Avatar, Name) và Group Info từ Zalo API
    const userProfiles: Record<string, any> = {};
    const groupProfiles: Record<string, any> = {};

    for (const accId of accountIds) {
      const session = zaloManager.getActiveSessions().find(s => s.accountId === accId);
      if (session && session.api) {
        const accMessages = lastMessages.filter((m: any) => m._id.accountId === accId);
        
        const userIds: string[] = [];
        const groupIds: string[] = [];
        
        for (const m of accMessages) {
          const tId = m._id.threadId;
          const isGroup = m.lastMsg.threadType === 1;
          if (isGroup) {
            groupIds.push(tId);
          } else {
            userIds.push(tId);
            if (m.lastMsg.fromId) userIds.push(m.lastMsg.fromId);
          }
        }

        const uniqueUserIds = [...new Set(userIds)].filter(id => id && id !== '0');
        const uniqueGroupIds = [...new Set(groupIds)].filter(id => id && id !== '0');

        if (uniqueUserIds.length > 0) {
          try {
            const userInfoRes = await session.api.getUserInfo(uniqueUserIds);
            Object.assign(userProfiles, userInfoRes.changed_profiles || {});
          } catch (e) {
            console.error('[Zalo] Error fetching user info:', e);
          }
        }

        for (const gId of uniqueGroupIds) {
          try {
            const groupInfoRes = await session.api.getGroupInfo(gId);
            const groupData = groupInfoRes?.changed_groups?.[gId] || groupInfoRes?.gridInfoMap?.[gId];
            if (groupData) {
              groupProfiles[gId] = {
                displayName: groupData.name || `Nhóm ${gId}`,
                avatar: groupData.avt || ''
              };
            }
          } catch (e) {
            console.error('[Zalo] Error fetching group info:', e);
          }
        }
      }
    }

    const threads = lastMessages.map((item: any) => {
      const lm = item.lastMsg;
      const account = accountMap.get(item._id.accountId);
      const socialId = lm.fromId || item._id.threadId;
      const isGroup = lm.threadType === 1;

      let name = `Zalo ${socialId}`;
      let avatar = '';

      if (isGroup) {
        const gp = groupProfiles[item._id.threadId];
        name = gp?.displayName || `Nhóm ${item._id.threadId}`;
        avatar = gp?.avatar || '';
      } else {
        const profile = userProfiles[socialId];
        name = profile?.displayName || lm.fromName || `Zalo ${socialId}`;
        avatar = profile?.avatar || lm.fromAvatar || '';
      }

      if (!avatar) {
        avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${isGroup ? '34C759' : '0071E3'}&color=fff`;
      }

      return {
        id: `${item._id.accountId}_${item._id.threadId}`,
        threadId: item._id.threadId,
        accountId: item._id.accountId,
        accountName: account?.displayName || item._id.accountId,
        senderName: name,
        senderAvatar: avatar,
        lastMessage: lm.content || '(Tin nhắn)',
        time: formatTimestamp(lm.timestamp),
        unreadCount: lm.isSelf ? 0 : item.unreadCount,
        channel: 'zalo' as const,
        senderSocialId: lm.fromId || item._id.threadId,
        customerProfile: null,
        assigneeName: 'Chưa phân công',
        waitingTimeMinutes: Math.floor((Date.now() - lm.timestamp) / 60000),
        threadType: lm.threadType || 0,
        messages: [] // Load riêng khi click vào thread
      };
    });

    return res.status(200).json({ success: true, data: threads });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy hội thoại', error: err.message });
  }
}

function formatTimestamp(ts: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}
