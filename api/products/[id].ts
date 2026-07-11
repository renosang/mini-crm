import dbConnect from '../_lib/dbConnect.ts';
import Product from '../_models/Product.ts';
import mongoose from 'mongoose';

export default async function handler(req: any, res: any) {
  const { query: { id }, method } = req;

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ' });
  }

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const product = await Product.findById(id);
        if (!product) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        res.status(200).json({ success: true, data: product });
      } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
      }
      break;

    case 'PUT':
      try {
        const product = await Product.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        });
        if (!product) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        res.status(200).json({ success: true, data: product });
      } catch (error: any) {
        res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', error: error.message });
      }
      break;

    case 'DELETE':
      try {
        const deletedProduct = await Product.deleteOne({ _id: id });
        if (deletedProduct.deletedCount === 0) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        res.status(200).json({ success: true, data: {} });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa sản phẩm' });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      break;
  }
}
