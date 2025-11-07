import dbConnect from '../_lib/dbConnect.ts';
import Account from '../_models/Account.ts';
// import { protect, admin } from '../_lib/authMiddleware'; // Middleware xác thực

export default async function handler(req, res) {
  await dbConnect();
  // await protect(req, res); // Áp dụng cho cả hai
  
  switch (req.method) {
    case 'GET':
      // await admin(req, res); // Chỉ admin mới được xem tất cả
      try {
        const accounts = await Account.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: accounts });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
      }
      break;

    case 'POST':
      // await admin(req, res); // Chỉ admin mới được tạo
      try {
        const account = await Account.create(req.body);
        res.status(201).json({ success: true, data: account });
      } catch (error) {
        res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      break;
  }
}