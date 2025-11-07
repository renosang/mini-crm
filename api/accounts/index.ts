import dbConnect from '../_lib/dbConnect.ts';
import Account from '../_models/Account.ts';

// SỬA LỖI: Thêm : any vào req và res
export default async function handler(req: any, res: any) {
  await dbConnect();
  
  switch (req.method) {
    case 'GET':
      try {
        const accounts = await Account.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: accounts });
      } catch (error: any) { // SỬA LỖI: Thêm : any vào error
        res.status(500).json({ success: false, message: 'Lỗi server' });
      }
      break;

    case 'POST':
      try {
        const account = await Account.create(req.body);
        res.status(201).json({ success: true, data: account });
      } catch (error: any) { // SỬA LỖI: Thêm : any vào error
        res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      break;
  }
}