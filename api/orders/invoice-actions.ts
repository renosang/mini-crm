import dbConnect from '../_lib/dbConnect.ts';
import Order from '../_models/Order.ts';
import Account from '../_models/Account.ts';
import { sendInvoiceEmail } from '../_lib/emailService.ts';

export default async function handler(req: any, res: any) {
    const id = req.query.id;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu ID' });
    await dbConnect();
    const action = req.query.action || (req.body && req.body.action);
    if (!action) return res.status(400).json({ success: false });

    try {
        if (action === 'deliver') {
            const order = await Order.findById(id);
            if (!order) return res.status(404).json({ success: false });

            // Gather deliver keys from accounts
            let keys: any[] = [];
            let keyCount = 0;
            if (order.accounts && order.accounts.length > 0) {
                const accs = await Account.find({ _id: { $in: order.accounts } });
                keys = accs.map(function (a: any) {
                    const k = (a.account_details && a.account_details.license_key) || (a.account_details && a.account_details.username) || '';
                    if (k) keyCount++;
                    return { key: k, product_name: a.product_type || '', delivered_at: new Date() };
                });
            }
            // Fallback: if no accounts but has items with product_name
            if (keys.length === 0 && (order.product_name || (order.items && order.items.length > 0))) {
                const names = order.product_name || order.items?.map((i: any) => i.name).join(', ') || '';
                keys = [{ key: names, product_name: names, delivered_at: new Date() }];
                keyCount = 1;
            }

            await Order.updateOne({ _id: id }, {
                $set: { delivery_status: 'delivered', delivered_keys: keys, sla_warning: false },
                $push: { logs: { timestamp: new Date(), action: 'delivered', detail: 'Bàn giao ' + (keyCount || '') + ' qua email' } }
            });

            // Gửi email bàn giao thực tế qua SMTP
            let emailResult = { success: false };
            try {
                emailResult = await sendInvoiceEmail({ orderId: id, isPreview: false });
            } catch (e) {
                console.error('Email delivery failed:', e);
            }

            return res.status(200).json({
                success: true,
                successEmail: emailResult.success,
                emailMessage: (emailResult as any).message || '',
                message: 'Đã bàn giao thành công' + (emailResult.success ? ' và gửi email cho khách' : ' (không gửi được email, vui lòng kiểm tra SMTP)')
            });
        }

        if (action === 'refund') {
            var reason = (req.body && req.body.reason) || '';
            var order = await Order.findById(id);
            if (!order) return res.status(404).json({ success: false });
            var revokedKeys = (order.delivered_keys || []).map(function (k: any) {
                return { key: k.key, product_name: k.product_name, revoked_at: new Date(), reason: reason || 'Hoàn tiền' };
            });
            await Order.updateOne({ _id: id }, {
                $set: { refund_status: 'refunded', refund_reason: reason, revoked_keys: revokedKeys, status: 'cancelled', delivery_status: 'error' },
                $push: { logs: { timestamp: new Date(), action: 'refunded', detail: reason } }
            });
            if (order.accounts && order.accounts.length > 0) {
                await Account.updateMany({ _id: { $in: order.accounts } }, { $set: { status: 'available', customer_id: null } });
            }
            return res.status(200).json({ success: true });
        }

        if (action === 'logs') {
            var order = await Order.findById(id).select('logs');
            return res.status(200).json({ success: true, data: (order && order.logs) || [] });
        }

        return res.status(400).json({ success: false });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
}