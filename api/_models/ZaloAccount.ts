import mongoose from 'mongoose';

const ZaloAccountSchema = new mongoose.Schema({
  accountId: { type: String, required: true, unique: true }, // Zalo UID
  displayName: { type: String, default: '' },
  avatar: { type: String, default: '' },
  phone: { type: String, default: '' },
  sessionData: {
    cookie: { type: mongoose.Schema.Types.Mixed },
    imei: { type: String },
    userAgent: { type: String }
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired'],
    default: 'pending'
  },
  connectedAt: { type: Date }
}, { timestamps: true });

export default mongoose.models.ZaloAccount || mongoose.model('ZaloAccount', ZaloAccountSchema);
