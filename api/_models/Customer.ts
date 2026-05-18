import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên khách hàng'],
    },
    email: {
      type: String,
      // Bỏ unique để linh hoạt hơn, nhiều khách có thể không có email
      // unique: true, 
      // sparse: true,
    },
    phone: {
      type: String,
    },
    source: {
      type: String, // Nguồn khách hàng (Facebook, Zalo, v.v.)
    },
    facebook: {
      type: String, // Trang cá nhân Facebook
    },
    telegram: {
      type: String, // Telegram username/link
    },
    zalo: {
      type: String, // Zalo SĐT/link
    },
    status: {
      type: String, // Nhãn/Trạng thái (VIP, Tiềm năng, Bình thường, Cảnh báo)
      default: 'Bình thường',
    },
    notes: {
      type: String, // Ghi chú thêm
    },
    privateNotes: {
      type: String, // Thông tin cá nhân/bảo mật (Proxy, tài khoản bàn giao, v.v.)
    }
  },
  { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);