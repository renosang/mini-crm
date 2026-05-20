import mongoose from 'mongoose';

const SupplierImportSchema = new mongoose.Schema(
    {
        supplier_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Supplier',
            required: [true, 'Vui lòng chọn nhà cung cấp'],
        },
        import_date: {
            type: Date,
            default: Date.now,
        },
        items: [
            {
                product_type: { type: String, required: true },
                quantity: { type: Number, required: true, min: 1 },
                unit_cost: { type: Number, required: true, min: 0 },
                total_cost: { type: Number, required: true },
            },
        ],
        total_cost: {
            type: Number,
            required: true,
            default: 0,
        },
        payment_status: {
            type: String,
            enum: ['pending', 'partial', 'paid'],
            default: 'pending',
        },
        paid_amount: {
            type: Number,
            default: 0,
        },
        notes: {
            type: String,
            default: '',
        },
        // Số lượng tài khoản đã được tự động tạo vào kho
        accounts_created: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

export default mongoose.models.SupplierImport || mongoose.model('SupplierImport', SupplierImportSchema);
