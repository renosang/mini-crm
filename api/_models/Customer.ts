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
    notes: {
      type: String, // Ghi chú thêm
    }
  },
  { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);