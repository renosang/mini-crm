import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    accounts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
    ],
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        package_id: { type: String },
        name: String,
        price: { type: Number },
        quantity: { type: Number, default: 1 },
      }
    ],
    product_name: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    cost_price: { type: Number, default: 0 },
    selling_price: { type: Number, default: 0 },
    expiry_date: { type: Date, default: null },
    recurring_invoice: {
      enabled: { type: Boolean, default: false },
      interval_months: { type: Number, default: 1 },
      custom_interval: { type: String, default: '' },
    },
    discount_code: { type: String, default: '' },
    discount_reason: { type: String, default: '' },
    discount_amount: { type: Number, default: 0 },
    total_amount: { type: Number, required: true },
    payment_method: { type: String, enum: ['bank_transfer', 'cash', ''], default: '' },
    customer_note: { type: String, default: '' },
    internal_note: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
    // === Invoice / Hóa đơn fields ===
    invoice_id: { type: String, default: '' },
    delivery_status: { type: String, enum: ['not_delivered', 'delivered', 'error'], default: 'not_delivered' },
    delivered_keys: [{
      key: { type: String, default: '' },
      product_name: { type: String, default: '' },
      delivered_at: { type: Date, default: Date.now },
    }],
    logs: [{
      timestamp: { type: Date, default: Date.now },
      action: { type: String, default: '' },
      detail: { type: String, default: '' },
    }],
    refund_status: { type: String, enum: ['none', 'requested', 'refunded'], default: 'none' },
    refund_reason: { type: String, default: '' },
    revoked_keys: [{
      key: { type: String, default: '' },
      product_name: { type: String, default: '' },
      revoked_at: { type: Date, default: Date.now },
      reason: { type: String, default: '' },
    }],
    sla_warning: { type: Boolean, default: false },
    order_date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);