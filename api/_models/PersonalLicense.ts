import mongoose from 'mongoose';

const PersonalLicenseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên tài nguyên / bản quyền cá nhân'],
    },
    category: {
      type: String, // e.g. "Premium Account", "WordPress Plugin/Theme", "SEO Tool", "VPS/Server", "Khác"
      required: true,
      default: 'Premium Account'
    },
    account_details: {
      username: { type: String, default: '' },
      password_acc: { type: String, default: '' },
      license_key: { type: String, default: '' },
      pin: { type: String, default: '' },
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
    },
    valid_until: {
      type: Date,
      default: null
    },
    supplier: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended'],
      default: 'active',
    },
    notes: {
      type: String,
      default: ''
    },
  },
  { timestamps: true }
);

export default mongoose.models.PersonalLicense || mongoose.model('PersonalLicense', PersonalLicenseSchema);
