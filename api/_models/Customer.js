import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên khách hàng'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Cho phép nhiều giá trị null, nhưng chỉ 1 email duy nhất
    },
    phone: {
      type: String,
    },
    source: {
      type: String, // Nguồn khách hàng
    },
  },
  { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);