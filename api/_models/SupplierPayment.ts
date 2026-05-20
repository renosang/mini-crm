import mongoose from 'mongoose';

const SupplierPaymentSchema = new mongoose.Schema(
    {
        supplier_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Supplier',
            required: [true, 'Vui lòng chọn nhà cung cấp'],
        },
        import_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SupplierImport',
            default: null, // có thể gắn với 1 lần nhập hàng cụ thể hoặc thanh toán chung
        },
        amount: {
            type: Number,
            required: [true, 'Vui lòng nhập số tiền thanh toán'],
            min: 0,
        },
        payment_date: {
            type: Date,
            default: Date.now,
        },
        method: {
            type: String,
            enum: ['bank_transfer', 'crypto', 'cash', 'other'],
            default: 'bank_transfer',
        },
        reference: {
            type: String,
            default: '', // Mã giao dịch, proof link, etc.
        },
        notes: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

export default mongoose.models.SupplierPayment || mongoose.model('SupplierPayment', SupplierPaymentSchema);
