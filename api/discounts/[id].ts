import dbConnect from '../_lib/dbConnect.ts';
import Discount from '../_models/Discount.ts';
import mongoose from 'mongoose';

export default async function handler(req: any, res: any) {
  const { query: { id }, method } = req;

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'ID mã giảm giá không hợp lệ' });
  }

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const discount = await Discount.findById(id);
        if (!discount) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá' });
        }
        return res.status(200).json({ success: true, data: discount });
      } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
      }

    case 'PUT':
      try {
        const discount = await Discount.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        });
        if (!discount) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá' });
        }
        return res.status(200).json({ success: true, data: discount });
      } catch (error: any) {
        return res.status(400).json({ success: false, message: 'Lỗi cập nhật', error: error.message });
      }

    case 'DELETE':
      try {
        const deletedDiscount = await Discount.deleteOne({ _id: id });
        if (deletedDiscount.deletedCount === 0) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá' });
        }
        return res.status(200).json({ success: true, data: {} });
      } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Lỗi xóa mã giảm giá', error: error.message });
      }

    default:
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
}
