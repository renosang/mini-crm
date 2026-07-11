import dbConnect from '../_lib/dbConnect.ts';
import Quotation from '../_models/Quotation.ts';
import Account from '../_models/Account.ts';
import Product from '../_models/Product.ts';
import Customer from '../_models/Customer.ts';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const id = req.query.id || req.params?.id;
    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                if (id) {
                    const quotation = await Quotation.findById(id)
                        .populate('customer_id')
                        .populate('items.product_id')
                        .populate('converted_order_id');
                    if (!quotation) return res.status(404).json({ success: false, message: 'Không tìm thấy báo giá' });
                    return res.status(200).json({ success: true, data: quotation });
                }

                const { status, search } = req.query;
                const filter: any = {};
                if (status && status !== 'all') filter.status = status;

                let query = Quotation.find(filter).populate('customer_id').sort({ createdAt: -1 });

                // Optional search by customer name
                if (search) {
                    const customers = await Customer.find({ name: { $regex: search, $options: 'i' } }).select('_id');
                    const customerIds = customers.map((c: any) => c._id);
                    query = Quotation.find({ ...filter, customer_id: { $in: customerIds } }).populate('customer_id').sort({ createdAt: -1 });
                }

                const quotations = await query;
                // Check expired
                const now = new Date();
                for (const q of quotations) {
                    if (q.status === 'sent' && q.expires_at && new Date(q.expires_at) < now) {
                        q.status = 'expired';
                        await q.save();
                    }
                }

                res.status(200).json({ success: true, data: quotations });
            } catch (err: any) {
                res.status(500).json({ success: false, message: 'Lỗi tải báo giá', error: err.message });
            }
            break;

        case 'POST':
            try {
                const { customer_id, items, validity_days, discount_type, discount_value, tax_rate, activation_fee, customer_note, internal_note, terms } = req.body;
                if (!customer_id || !items || items.length === 0) {
                    return res.status(400).json({ success: false, message: 'Thiếu thông tin khách hàng hoặc sản phẩm' });
                }

                // Enrich items with product info & stock
                const enrichedItems = [];
                for (const item of items) {
                    let stock = 0;
                    let name = item.name || '';
                    let productType = item.product_type || '';
                    if (item.product_id) {
                        const product = await Product.findById(item.product_id);
                        if (product) {
                            name = name || product.name;
                            productType = productType || product.productType || '';
                            const stockAccounts = await Account.countDocuments({ product_id: product._id, status: 'available' });
                            stock = stockAccounts;
                        }
                    }
                    enrichedItems.push({
                        product_id: item.product_id || null,
                        name,
                        product_type: productType,
                        quantity: item.quantity || 1,
                        unit_price: item.unit_price || 0,
                        stock_available: stock,
                    });
                }

                // Calculate pricing
                const subtotal = enrichedItems.reduce((sum: number, it: any) => sum + it.unit_price * it.quantity, 0);
                let discountAmount = 0;
                if (discount_type === 'percentage') {
                    discountAmount = Math.round(subtotal * (discount_value || 0) / 100);
                } else if (discount_type === 'fixed') {
                    discountAmount = discount_value || 0;
                }
                const taxAmount = Math.round((subtotal - discountAmount) * (tax_rate || 0) / 100);
                const fee = activation_fee || 0;
                const grandTotal = subtotal - discountAmount + taxAmount + fee;

                const quotation = await Quotation.create({
                    customer_id,
                    items: enrichedItems,
                    validity_days: validity_days || 7,
                    subtotal,
                    discount_type: discount_type || '',
                    discount_value: discount_value || 0,
                    discount_amount: discountAmount,
                    tax_rate: tax_rate || 0,
                    tax_amount: taxAmount,
                    activation_fee: fee,
                    grand_total: grandTotal,
                    customer_note: customer_note || '',
                    internal_note: internal_note || '',
                    terms: terms || '',
                    tracking_token: crypto.randomBytes(24).toString('hex'),
                });

                const populated = await Quotation.findById(quotation._id).populate('customer_id').populate('items.product_id');
                res.status(201).json({ success: true, data: populated });
            } catch (err: any) {
                res.status(400).json({ success: false, message: 'Lỗi tạo báo giá', error: err.message });
            }
            break;

        case 'PUT':
            try {
                if (!id) return res.status(400).json({ success: false, message: 'Thiếu ID' });
                const { status, ...rest } = req.body;
                const update: any = { ...rest };
                if (status) update.status = status;
                const quotation = await Quotation.findByIdAndUpdate(id, update, { new: true })
                    .populate('customer_id').populate('items.product_id');
                res.status(200).json({ success: true, data: quotation });
            } catch (err: any) {
                res.status(400).json({ success: false, message: 'Lỗi cập nhật', error: err.message });
            }
            break;

        case 'DELETE':
            try {
                if (!id) return res.status(400).json({ success: false, message: 'Thiếu ID' });
                await Quotation.findByIdAndDelete(id);
                res.status(200).json({ success: true, data: {} });
            } catch (err: any) {
                res.status(500).json({ success: false, message: 'Lỗi xóa', error: err.message });
            }
            break;

        default:
            res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
}