import dbConnect from '../_lib/dbConnect.ts';
import Product from '../_models/Product.ts';

export default async function handler(req: any, res: any) {
  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const products = await Product.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: products });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách sản phẩm' });
      }
      break;

    case 'POST':
      try {
        const product = await Product.create(req.body);
        res.status(201).json({ success: true, data: product });
      } catch (error: any) {
        res.status(400).json({ success: false, message: 'Dữ liệu sản phẩm không hợp lệ', error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      break;
  }
}
