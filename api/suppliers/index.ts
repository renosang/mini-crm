import dbConnect from '../_lib/dbConnect.ts';
import Supplier from '../_models/Supplier.ts';

export default async function handler(req: any, res: any) {
  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const suppliers = await Supplier.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: suppliers });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tải danh sách nhà cung cấp' });
      }
      break;

    case 'POST':
      try {
        const supplier = await Supplier.create(req.body);
        res.status(201).json({ success: true, data: supplier });
      } catch (error: any) {
        res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      break;
  }
}
