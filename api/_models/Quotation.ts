import mongoose from 'mongoose';

const QuotationItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    product_type: { type: String, default: '' }, // 'key', 'account', 'service'
    quantity: { type: Number, required: true, default: 1 },
    unit_price: { type: Number, required: true, default: 0 },
    stock_available: { type: Number, default: 0 },
}, { _id: false });

const QuotationSchema = new mongoose.Schema(
    {
        customer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
        },
        items: [QuotationItemSchema],
        status: {
            type: String,
            enum: ['draft', 'sent', 'viewed', 'confirmed', 'converted', 'expired', 'cancelled'],
            default: 'draft',
        },
        validity_days: { type: Number, default: 7 },
        expires_at: { type: Date, default: null },
        // Pricing breakdown
        subtotal: { type: Number, default: 0 },
        discount_type: { type: String, enum: ['', 'percentage', 'fixed'], default: '' },
        discount_value: { type: Number, default: 0 },
        discount_amount: { type: Number, default: 0 },
        tax_rate: { type: Number, default: 0 },     // VAT percentage, e.g. 8 = 8%
        tax_amount: { type: Number, default: 0 },
        activation_fee: { type: Number, default: 0 }, // Phí kích hoạt
        grand_total: { type: Number, default: 0 },
        // Notes
        customer_note: { type: String, default: '' },
        internal_note: { type: String, default: '' },
        terms: { type: String, default: '' },         // Điều khoản sử dụng & bảo hành
        // Email tracking
        tracking_token: { type: String, default: '', unique: true, sparse: true },
        email_sent_at: { type: Date, default: null },
        email_opened_at: { type: Date, default: null },
        email_clicked_at: { type: Date, default: null },
        // Conversion
        converted_order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
        },
        created_by: { type: String, default: '' },
    },
    { timestamps: true }
);

// Auto expire: set expires_at before save if not set
QuotationSchema.pre('save', function (next) {
    if (!this.expires_at && this.validity_days > 0) {
        this.expires_at = new Date(Date.now() + this.validity_days * 24 * 60 * 60 * 1000);
    }
    next();
});

export default mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);