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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
    },
    resource_type: {
      type: String,
      enum: ['id_pass', 'key', 'slot'],
      default: 'id_pass',
    },
    total_slots: {
      type: Number,
      default: 1,
    },
    used_slots: {
      type: Number,
      default: 0,
    },
    slots_assigned: [
      {
        customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
        assigned_email: String,
        assigned_at: { type: Date, default: Date.now }
      }
    ],
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