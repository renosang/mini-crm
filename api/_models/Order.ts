import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    // Một mảng các tài khoản đã bán trong đơn hàng này
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
        package_id: {
          type: String,
        },
        name: String, // Tên sản phẩm + gói
        price: {
          type: Number,
        },
        quantity: {
          type: Number,
          default: 1,
        }
      }
    ],
    // === Trường mới cho modal đơn giản ===
    product_name: { type: String, default: '' },       // Tên sản phẩm tùy chỉnh
    quantity: { type: Number, default: 1 },              // Số lượng
    cost_price: { type: Number, default: 0 },            // Giá gốc
    selling_price: { type: Number, default: 0 },         // Giá bán
    expiry_date: { type: Date, default: null },          // Hạn sử dụng
    recurring_invoice: {                                 // Gửi hóa đơn định kỳ
      enabled: { type: Boolean, default: false },
      interval_months: { type: Number, default: 1 },
      custom_interval: { type: String, default: '' },
    },
    discount_code: {
      type: String,
      default: '',
    },
    discount_reason: {
      type: String,
      default: '',
    },
    discount_amount: {
      type: Number,
      default: 0,
    },
    total_amount: {
      type: Number,
      required: true, // Tổng tiền bán
    },
    payment_method: {                                    // Hình thức thanh toán
      type: String,
      enum: ['bank_transfer', 'cash', ''],
      default: '',
    },
    customer_note: { type: String, default: '' },        // Note hiển thị với khách hàng
    internal_note: { type: String, default: '' },        // Note nội bộ
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
    },
    order_date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);