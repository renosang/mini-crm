import mongoose from 'mongoose';

const EmailMessageSchema = new mongoose.Schema(
    {
        email_account: { type: String, default: '' },
        message_id: { type: String, default: '', unique: true, sparse: true },
        folder: { type: String, default: 'INBOX' },
        from: { type: String, default: '' },
        from_name: { type: String, default: '' },
        to: { type: String, default: '' },
        subject: { type: String, default: '' },
        body_text: { type: String, default: '' },
        body_html: { type: String, default: '' },
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['new', 'pending', 'resolved', 'archived'], default: 'new' },
        tags: [{ type: String }],
        attachments: [{ filename: String, content_type: String, size: Number }],
        linked_customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
        linked_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
        reply_history: [{ from: String, body: String, date: Date }],
        ai_draft: { type: String, default: '' },
        is_read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.models.EmailMessage || mongoose.model('EmailMessage', EmailMessageSchema);