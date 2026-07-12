import dbConnect from '../_lib/dbConnect.ts';
import Order from '../_models/Order.ts';
import Customer from '../_models/Customer.ts';
import { generateInvoicePDF } from '../_lib/generateInvoicePDF.ts';

export default async function handler(req: any, res: any) {
    const id = req.query.id || req.params?.id;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu ID đơn hàng' });

    try {
        await dbConnect();
        const order = await Order.findById(id).populate('customer_id').populate('accounts');
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

        const customer = order.customer_id || { name: 'Khách lẻ', phone: '', email: '' };
        const accounts = order.accounts || [];
        const isUnpaid = order.status !== 'paid';

        const extra: any = {};
        if (order.product_name) {
            extra.product_name = order.product_name;
            extra.quantity = order.quantity || 1;
            extra.selling_price = order.selling_price || 0;
            extra.cost_price = order.cost_price || 0;
            extra.expiry_date = order.expiry_date;
            extra.discount_amount = order.discount_amount || 0;
            extra.recurring_invoice = order.recurring_invoice;
            extra.payment_method = order.payment_method;
            extra.customer_note = order.customer_note;
        }

        const pdfBuffer = await generateInvoicePDF(
            customer,
            accounts,
            order.total_amount,
            isUnpaid,
            order._id,
            false,
            extra
        );

        const invId = order.invoice_id || order._id.toString().substring(18).toUpperCase();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="hoa-don-' + invId + '.pdf"');
        res.send(pdfBuffer);
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}