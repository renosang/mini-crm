import dbConnect from '../_lib/dbConnect.ts';
import Account from '../_models/Account.ts';
import Customer from '../_models/Customer.ts';
import Order from '../_models/Order.ts';

// SỬA LỖI: Thêm : any vào req và res
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  
  await dbConnect();

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalCustomers = await Customer.countDocuments();
    const availableAccounts = await Account.countDocuments({ status: 'available' });
    const monthlyOrders = await Order.countDocuments({
      status: 'paid',
      order_date: { $gte: startOfMonth },
    });

    const monthlyRevenueResult = await Order.aggregate([
      { $match: { status: 'paid', order_date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ]);

    const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].total : 0;

    res.status(200).json({
      success: true,
      data: { totalCustomers, availableAccounts, monthlyOrders, monthlyRevenue },
    });

  } catch (error: any) { // SỬA LỖI: Thêm : any vào error
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}