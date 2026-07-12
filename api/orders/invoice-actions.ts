import dbConnect from '../_lib/dbConnect.ts';
import Order from '../_models/Order.ts';
import Account from '../_models/Account.ts';

export default async function handler(req: any, res: any) {
    const id = req.query.id;
    if (!id) return res.status(400).json({ success: false, message: 'Thieu ID' });
    await dbConnect();
    const action = req.query.action || (req.body && req.body.action);
    if (!action) return res.status(400).json({ success: false });
    try {
        if (action === 'deliver') {
            const order = await Order.findById(id);
            if (!order) return res.status(404).json({ success: false });
            if (order.accounts && order.accounts.length > 0) {
                const accs = await Account.find({ _id: { $in: order.accounts } });
                const keys = accs.map(function (a: any) {
                    return {
                        key: (a.account_details && a.account_details.license_key) || (a.account_details && a.account_details.username) || '',
                        product_name: a.product_type || '',
                        delivered_at: new Date()
                    };
                });
                await Order.updateOne({ _id: id }, {
                    $set: { delivery_status: 'delivered', delivered_keys: keys, sla_warning: false },
                    $push: { logs: { timestamp: new Date(), action: 'delivered', detail: 'Giao ' + accs.length + ' key' } }
                });
            } else {
                await Order.updateOne({ _id: id }, {
                    $set: { delivery_status: 'delivered', sla_warning: false },
                    $push: { logs: { timestamp: new Date(), action: 'delivered', detail: 'Giao key' } }
                });
            }
            return res.status(200).json({ success: true });
        }
        if (action === 'refund') {
            var reason = (req.body && req.body.reason) || '';
            var order = await Order.findById(id);
            if (!order) return res.status(404).json({ success: false });
            var revokedKeys = (order.delivered_keys || []).map(function (k: any) {
                return { key: k.key, product_name: k.product_name, revoked_at: new Date(), reason: reason || 'Hoan tien' };
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