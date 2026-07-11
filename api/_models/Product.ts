import mongoose from 'mongoose';

const PackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên gói dịch vụ'],
  },
  price: {
    type: Number,
    required: [true, 'Vui lòng nhập giá gói dịch vụ'],
    default: 0,
  },
  durationDays: {
    type: Number,
    required: [true, 'Vui lòng nhập số ngày gia hạn/thời hạn gói'],
    default: 30,
  }
});

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên sản phẩm'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: 'FiLayers',
    },
    image: {
      type: String,
      default: '',
    },
    productType: {
      type: String,
      enum: ['share_slot', 'full_account', 'key'],
      default: 'share_slot',
    },
    packages: [PackageSchema]
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);

