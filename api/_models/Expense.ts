import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema(
    {
        supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
        category: { type: String, enum: ['recurring', 'risk', 'funding', 'other'], default: 'other' },
        amount: { type: Number, required: true, default: 0 },
        description: { type: String, default: '' },
        status: { type: String, enum: ['pending', 'paid'], default: 'paid' },
        // Recurring expense config
        recurring_config: {
            enabled: { type: Boolean, default: false },
            interval_days: { type: Number, default: 30 },
            next_due_date: { type: Date, default: null },
        },
        // Linked entities
        linked_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
        linked_product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
        expense_date: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Schema methods: check and auto-generate next recurring
ExpenseSchema.statics.generateRecurring = async function () {
    const now = new Date();
    const dueExpenses = await this.find({
        'recurring_config.enabled': true,
        'recurring_config.next_due_date': { $lte: now },
    });

    for (const exp of dueExpenses) {
        // Create new expense
        await this.create({
            supplier_id: exp.supplier_id,
            category: 'recurring',
            amount: exp.amount,
            description: exp.description + ' (Định kỳ ' + new Date().toLocaleDateString('vi-VN') + ')',
            status: 'paid',
            recurring_config: {
                enabled: true,
                interval_days: exp.recurring_config.interval_days,
                next_due_date: new Date(now.getTime() + exp.recurring_config.interval_days * 24 * 60 * 60 * 1000),
            },
            linked_product_id: exp.linked_product_id,
            expense_date: new Date(),
        });
        // Update old expense next_due_date
        exp.recurring_config.next_due_date = new Date(now.getTime() + exp.recurring_config.interval_days * 24 * 60 * 60 * 1000);
        await exp.save();
    }
};

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);