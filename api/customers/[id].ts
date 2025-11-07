import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../_lib/dbConnect.ts';
import Customer from '../_models/Customer.ts';
import Order from '../_models/Order.ts'; // Import model Order
import Account from '../_models/Account.ts'; // Import model Account
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query: { id }, method } = req;

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
  }

  await dbConnect();

  switch (method) {
    // === CHỨC NĂNG MỚI ĐỂ LẤY CHI TIẾT ===
    case 'GET':
      try {
        // 1. Lấy thông tin khách hàng
        const customer = await Customer.findById(id);
        if (!customer) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        }

        // 2. Lấy Lịch sử mua hàng (Orders)
        const orders = await Order.find({ customer_id: id }).sort({ createdAt: -1 });

        // 3. Lấy Tài khoản đang sở hữu (Accounts)
        const accounts = await Account.find({ customer_id: id, status: 'sold' });

        // 4. Tính toán thống kê nhanh
        const totalSpent = orders.reduce((acc, order) => acc + (order.total_amount || 0), 0);
        
        res.status(200).json({
          success: true,
          data: {
            customer,
            orders,
            accounts,
            stats: {
              totalSpent,
              totalOrders: orders.length,
              activeAccounts: accounts.length,
            }
          }
        });

      } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
      }
      break;

    // === CHỨC NĂNG SỬA (GIỮ NGUYÊN) ===
    case 'PUT':
      try {
        const customer = await Customer.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        });
        if (!customer) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        }
        res.status(200).json({ success: true, data: customer });
      } catch (error: any) {
        res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', error: error.message });
      }
      break;

    // === CHỨC NĂNG XÓA (GIỮ NGUYÊN) ===
    case 'DELETE':
      try {
        const deletedCustomer = await Customer.deleteOne({ _id: id });
        if (deletedCustomer.deletedCount === 0) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        }
        res.status(200).json({ success: true, data: {} });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      break;
  }
}