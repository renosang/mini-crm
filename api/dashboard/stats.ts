// import type { NextApiRequest, NextApiResponse } from 'next'; // <-- XÓA DÒNG NÀY
import dbConnect from '../_lib/dbConnect.ts';
import Customer from '../_models/Customer.ts';

// SỬA LỖI: Xóa type 'NextApiRequest' và 'NextApiResponse'
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  await dbConnect();

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCustomers, newCustomersThisMonth, sourceBreakdown] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({
        createdAt: { $gte: startOfMonth },
      }),
      Customer.aggregate([
        // SỬA LỖI: Dùng $nin (not in) thay vì hai $ne
        { $match: { source: { $nin: [null, ""] } } }, 
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        newCustomersThisMonth,
        sourceBreakdown,
      },
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
}