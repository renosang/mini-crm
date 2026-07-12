import dbConnect from '../_lib/dbConnect.ts';
import Expense from '../_models/Expense.ts';
import Order from '../_models/Order.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const id = req.query.id || req.params?.id;
    const { method } = req;
    await (Expense as any).generateRecurring();

    switch (method) {
        case 'GET':
            try {
                if (id === 'pnl') {
                    const paidOrders = await Order.find({ status: 'paid' });
                    const totalRevenue = paidOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
                    const expenses = await Expense.find({ status: 'paid' });
                    const costByCategory: any = { recurring: 0, risk: 0, funding: 0, other: 0 };
                    let totalCost = 0;
                    for (const e of expenses) { costByCategory[e.category] = (costByCategory[e.category] || 0) + e.amount; totalCost += e.amount; }
                    let cogs = 0;
                    for (const o of paidOrders) { cogs += (o.cost_price || 0) * (o.quantity || 1); }
                    const profit = totalRevenue - totalCost - cogs;
                    return res.status(200).json({ success: true, data: { totalRevenue, cogs, totalCost, costByCategory, profit, expenseCount: expenses.length, orderCount: paidOrders.length } });
                }
                const { category, supplier_id } = req.query;
                const filter: any = {};
                if (category) filter.category = category;
                if (supplier_id) filter.supplier_id = supplier_id;
                const expenses = await Expense.find(filter).populate('supplier_id').populate('linked_order_id').sort({ expense_date: -1 });
                res.status(200).json({ success: true, data: expenses });
            } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
            break;
        case 'POST':
            try {
                const { supplier_id, category, amount, description, recurring_config } = req.body;
                const exp = await Expense.create({
                    supplier_id: supplier_id || null, category: category || 'other', amount: Number(amount) || 0,
                    description: description || '', status: 'paid',
                    recurring_config: recurring_config || { enabled: false, interval_days: 30, next_due_date: null },
                    expense_date: new Date(),
                });
                res.status(201).json({ success: true, data: exp });
            } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
            break;
        case 'PUT':
            if (!id) return res.status(400).json({ success: false });
            try { const e = await Expense.findByIdAndUpdate(id, req.body, { new: true }); res.status(200).json({ success: true, data: e }); }
            catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
            break;
        case 'DELETE':
            if (!id) return res.status(400).json({ success: false });
            try { await Expense.findByIdAndDelete(id); res.status(200).json({ success: true }); }
            catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
            break;
        default: res.status(405).json({ success: false });
    }
}
