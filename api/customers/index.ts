// import type { NextApiRequest, NextApiResponse } from 'next'; // <-- XÓA DÒNG NÀY
import dbConnect from '../_lib/dbConnect.ts';
import Customer from '../_models/Customer.ts';

// SỬA LỖI: Xóa type 'NextApiRequest' và 'NextApiResponse'
export default async function handler(req: any, res: any) {
  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const customers = await Customer.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: customers });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
      }
      break;

    case 'POST':
      try {
        const customer = await Customer.create(req.body);
        res.status(201).json({ success: true, data: customer });
      } catch (error: any) {
        res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      break;
  }
}