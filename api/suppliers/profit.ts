import dbConnect from '../_lib/dbConnect.ts';
import Account from '../_models/Account.ts';
import Order from '../_models/Order.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();

    try {
        const { supplier_id, from, to } = req.query;

        // Filter: chỉ lấy tài khoản đã bán (sold) có supplier
        const matchStage: any = {
            status: 'sold',
            supplier: { $ne: null },
        };

        if (supplier_id) {
            matchStage.supplier = supplier_id;
        }

        if (from || to) {
            matchStage.sold_at = {};
            if (from) matchStage.sold_at.$gte = new Date(from as string);
            if (to) matchStage.sold_at.$lte = new Date(to as string);
        }

        const soldAccounts = await Account.find(matchStage)
            .populate('supplier')
            .populate('customer_id')
            .sort({ sold_at: -1 })
            .lean();

        // Lấy thông tin giá bán từ Order để tính lợi nhuận
        const accountIds = soldAccounts.map((a: any) => a._id);
        const orders = await Order.find({ accounts: { $in: accountIds } })
            .populate('customer_id')
            .lean();

        // Map order_id -> order
        const orderMap: Record<string, any> = {};
        for (const order of orders) {
            for (const accId of order.accounts) {
                const idStr = accId.toString();
                if (!orderMap[idStr]) {
                    orderMap[idStr] = order;
                }
            }
        }

        // Tính lợi nhuận từng tài khoản
        const profitData = soldAccounts.map((acc: any) => {
            const order = orderMap[acc._id.toString()];
            const sellingPrice = order?.total_amount || 0;
            // Phân bổ giá bán theo tỷ lệ (nếu đơn hàng có nhiều account)
            const accountCount = order?.accounts?.length || 1;
            const allocatedPrice = accountCount > 0 ? sellingPrice / accountCount : 0;
            const profit = allocatedPrice - (acc.cost || 0);

            return {
                accountId: acc._id,
                product_type: acc.product_type,
                supplier: acc.supplier ? { _id: acc.supplier._id, name: acc.supplier.name } : null,
                costPrice: acc.cost || 0,
                sellingPrice: allocatedPrice,
                profit: profit,
                profitPercent: acc.cost > 0 ? ((profit / acc.cost) * 100).toFixed(1) : 0,
                customer: acc.customer_id
                    ? { _id: acc.customer_id._id, name: acc.customer_id.name }
                    : null,
                soldAt: acc.sold_at,
            };
        });

        // Tổng hợp lợi nhuận
        const totalCost = profitData.reduce((sum, p) => sum + p.costPrice, 0);
        const totalRevenue = profitData.reduce((sum, p) => sum + p.sellingPrice, 0);
        const totalProfit = profitData.reduce((sum, p) => sum + p.profit, 0);
        const totalItems = profitData.length;

        // Lợi nhuận theo từng supplier
        const profitBySupplier: Record<string, any> = {};
        for (const item of profitData) {
            const key = item.supplier?._id || 'unknown';
            if (!profitBySupplier[key]) {
                profitBySupplier[key] = {
                    supplier: item.supplier,
                    totalCost: 0,
                    totalRevenue: 0,
                    totalProfit: 0,
                    count: 0,
                };
            }
            profitBySupplier[key].totalCost += item.costPrice;
            profitBySupplier[key].totalRevenue += item.sellingPrice;
            profitBySupplier[key].totalProfit += item.profit;
            profitBySupplier[key].count += 1;
        }

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalItems,
                    totalCost,
                    totalRevenue,
                    totalProfit,
                    profitPercent: totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(1) : 0,
                },
                profitBySupplier: Object.values(profitBySupplier),
                details: profitData,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
}
