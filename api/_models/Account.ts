// File: api/_models/Account.ts
import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema(
  {
    product_type: {
      type: String,
      required: [true, 'Vui lòng nhập loại sản phẩm'],
    },
    account_details: {
      username: String,
      password_acc: String,
      license_key: String,
      pin: String,
    },
    supplier: {
      type: String,
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['available', 'sold', 'expired', 'banned'],
      default: 'available',
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    sold_at: {
      type: Date,
    },
    valid_until: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Account || mongoose.model('Account', AccountSchema);