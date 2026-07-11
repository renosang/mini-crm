import mongoose from 'mongoose';

const DiscountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Vui lòng nhập mã giảm giá'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    discount_type: {
      type: String,
      enum: ['fixed', 'percentage'],
      required: [true, 'Vui lòng chọn loại giảm giá'],
      default: 'fixed',
    },
    value: {
      type: Number,
      required: [true, 'Vui lòng nhập giá trị giảm'],
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    valid_until: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Discount || mongoose.model('Discount', DiscountSchema);
