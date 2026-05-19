import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên nhà cung cấp'],
      trim: true,
    },
    contact_name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    telegram: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);
