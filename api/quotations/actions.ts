import dbConnect from '../_lib/dbConnect.ts';
import Quotation from '../_models/Quotation.ts';
import Order from '../_models/Order.ts';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
    const id = req.query.id;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu ID' });
    await dbConnect();
    const action = req.query.action || req.body?.action;
    if (!action) return res.status(400).json({ success: false, message: 'Thiếu action' });

    try {
        if (action === 'clone') {
            const original = await Quotation.findById(id);
            if (!original) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
            const cloned = await Quotation.create({
                customer_id: original.customer_id, items: original.items, validity_days: original.validity_days,
                subtotal: original.subtotal, discount_type: original.discount_type, discount_value: original.discount_value,
                discount_amount: original.discount_amount, tax_rate: original.tax_rate, tax_amount: original.tax_amount,
                activation_fee: original.activation_fee, grand_total: original.grand_total,
                customer_note: original.customer_note, internal_note: original.internal_note, terms: original.terms,
                status: 'draft', tracking_token: crypto.randomBytes(24).toString('hex'),
            });
            const populated = await Quotation.findById(cloned._id).populate('customer_id').populate('items.product_id');
            return res.status(201).json({ success: true, data: populated });
        }
        if (action === 'convert') {
            const quotation = await Quotation.findById(id);
            if (!quotation) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
            if (quotation.status === 'converted') return res.status(400).json({ success: false, message: 'Đã chuyển' });
            const orderItems = quotation.items.map((it: any) => ({ product_id: it.product_id, name: it.name, price: it.unit_price, quantity: it.quantity, package_id: '' }));
            const order = await Order.create({ customer_id: quotation.customer_id, total_amount: quotation.grand_total, status: 'pending', discount_amount: quotation.discount_amount, items: orderItems });
            quotation.status = 'converted'; quotation.converted_order_id = order._id; await quotation.save();
            return res.status(200).json({ success: true, data: order });
        }
        res.status(400).json({ success: false, message: 'Action không hợp lệ' });
    } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
}
