import dbConnect from '../_lib/dbConnect.ts';
import Supplier from '../_models/Supplier.ts';
import mongoose from 'mongoose';

export default async function handler(req: any, res: any) {
  const { query: { id }, method } = req;

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'ID nhà cung cấp không hợp lệ' });
  }

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const supplier = await Supplier.findById(id);
        if (!supplier) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }
        res.status(200).json({ success: true, data: supplier });
      } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
      }
      break;

    case 'PUT':
      try {
        const supplier = await Supplier.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        });
        if (!supplier) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }
        res.status(200).json({ success: true, data: supplier });
      } catch (error: any) {
        res.status(400).json({ success: false, message: 'Cập nhật thất bại', error: error.message });
      }
      break;

    case 'DELETE':
      try {
        const deletedSupplier = await Supplier.deleteOne({ _id: id });
        if (deletedSupplier.deletedCount === 0) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }
        res.status(200).json({ success: true, data: {} });
      } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      break;
  }
}
