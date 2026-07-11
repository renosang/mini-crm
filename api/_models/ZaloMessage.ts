import mongoose from 'mongoose';

const ZaloMessageSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },   // Tài khoản CRM nhận tin
  threadId: { type: String, required: true, index: true },     // ID cuộc hội thoại
  msgId: { type: String, index: true },                        // ID tin nhắn Zalo
  fromId: { type: String, default: '' },                       // Người gửi (Zalo UID)
  fromName: { type: String, default: '' },
  fromAvatar: { type: String, default: '' },
  toId: { type: String, default: '' },                         // Người nhận
  content: { type: String, default: '' },
  msgType: { type: String, default: 'text' },
  timestamp: { type: Number, index: true },
  isSelf: { type: Boolean, default: false },                   // Tin nhắn do chính mình gửi
  direction: { type: String, enum: ['in', 'out'], default: 'in' }
}, { timestamps: true });

// Tránh duplicate khi upsert
ZaloMessageSchema.index({ msgId: 1, accountId: 1 }, { unique: true, sparse: true });

export default mongoose.models.ZaloMessage || mongoose.model('ZaloMessage', ZaloMessageSchema);
