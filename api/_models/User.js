import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema(
  {
    product_type: {
      type: String,
      required: [true, 'Vui lòng nhập loại sản phẩm'], // Ví dụ: "Netflix Premium"
    },
    account_details: {
      // Object linh hoạt để chứa thông tin tài khoản
      username: String,
      password_acc: String, // Đặt tên khác 'password' để tránh xung đột
      license_key: String,
      pin: String,
    },
    supplier: {
      type: String, // Nguồn nhập hàng
    },
    cost: {
      type: Number,
      required: true,
      default: 0, // Giá nhập
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
      type: Date, // Ngày hết hạn của tài khoản
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true } // Tự động thêm createdAt và updatedAt
);

export default mongoose.models.Account || mongoose.model('Account', AccountSchema);