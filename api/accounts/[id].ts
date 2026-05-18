import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../_lib/dbConnect.ts';
import Account from '../_models/Account.ts';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query: { id }, method } = req;

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
  }

  await dbConnect();

  switch (method) {
    case 'PUT':
      try {
        const account = await Account.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        });
        if (!account) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy tài nguyên' });
        }
        res.status(200).json({ success: true, data: account });
      } catch (error: any) {
        res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', error: error.message });
      }
      break;

    case 'DELETE':
      try {
        const deletedAccount = await Account.deleteOne({ _id: id });
        if (deletedAccount.deletedCount === 0) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy tài nguyên' });
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
