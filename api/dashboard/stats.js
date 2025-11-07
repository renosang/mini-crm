import dbConnect from '../_lib/dbConnect';
import Account from '../_models/Account';
import Customer from '../_models/Customer';
import Order from '../_models/Order';
// Bạn cần thêm file authMiddleware này
// import { protect } from '../_lib/authMiddleware'; 

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  
  // TODO: Thêm bước xác thực người dùng (authMiddleware) ở đây
  // await protect(req, res);

  await dbConnect();

  try {
    // Tính toán ngày bắt đầu của tháng
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Tổng Khách Hàng
    const totalCustomers = await Customer.countDocuments();

    // 2. Tài Khoản Khả Dụng
    const availableAccounts = await Account.countDocuments({ status: 'available' });

    // 3. Đơn Hàng Tháng Này
    const monthlyOrders = await Order.countDocuments({
      status: 'paid',
      order_date: { $gte: startOfMonth },
    });

    // 4. Doanh Thu Tháng Này
    const monthlyRevenueResult = await Order.aggregate([
      {
        $match: {
          status: 'paid',
          order_date: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total_amount' },
        },
      },
    ]);

    const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].total : 0;

    // Trả về dữ liệu
    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        availableAccounts,
        monthlyOrders,
        monthlyRevenue,
      },
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}