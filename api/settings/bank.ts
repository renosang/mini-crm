import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';

export default async function handler(req: any, res: any) {
  await dbConnect();
  
  const method = req.method;

  if (method === 'GET') {
    try {
      const setting = await Setting.findOne({ key: 'bank' });
      if (!setting) {
        // Trả về cấu hình mặc định (Sacombank - Nguyễn Thanh Sang)
        return res.status(200).json({
          success: true,
          data: {
            bank_id: 'Sacombank',
            account_no: '060233251669',
            account_name: 'Nguyễn Thanh Sang',
            bank_name: 'Sacombank',
            bank_logo: 'https://api.vietqr.io/img/STB.png'
          }
        });
      }
      res.status(200).json({ success: true, data: setting.value });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy cấu hình tài khoản chuyển khoản', error: err.message });
    }
  } else if (method === 'POST') {
    try {
      const { bank_id, account_no, account_name, bank_name, bank_logo } = req.body;
      
      if (!bank_id || !account_no || !account_name) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin ngân hàng' });
      }

      const bankConfig = {
        bank_id,
        account_no: String(account_no).trim(),
        account_name: String(account_name).trim(),
        bank_name: (bank_name || bank_id).trim(),
        bank_logo: (bank_logo || '').trim()
      };

      const setting = await Setting.findOneAndUpdate(
        { key: 'bank' },
        { value: bankConfig },
        { new: true, upsert: true }
      );

      res.status(200).json({ success: true, message: 'Lưu cấu hình tài khoản chuyển khoản thành công!', data: setting.value });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật cấu hình tài khoản chuyển khoản', error: err.message });
    }
  } else {
    res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
  }
}
