import dbConnect from '../_lib/dbConnect.ts';
import Account from '../_models/Account.ts';
import Order from '../_models/Order.ts';
import { sendInvoiceEmail } from '../_lib/emailService.ts';
import mongoose from 'mongoose';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  await dbConnect();

  const id = req.query.id || req.params?.id;
  const { newExpiryDate, renewalFee, notes } = req.body;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'ID tài khoản không hợp lệ' });
  }

  if (!newExpiryDate || renewalFee === undefined) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin ngày gia hạn mới hoặc chi phí gia hạn' });
  }

  try {
    // 1. Tìm tài khoản
    const account = await Account.findById(id).populate('customer_id');
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài nguyên' });
    }

    if (!account.customer_id) {
      return res.status(400).json({ success: false, message: 'Tài nguyên chưa được gán cho khách hàng nào để thực hiện gia hạn' });
    }

    // 2. Cập nhật tài khoản
    account.valid_until = new Date(newExpiryDate);
    // Nếu ngày gia hạn mới lớn hơn hiện tại, set trạng thái thành 'sold'
    if (new Date(newExpiryDate).getTime() > Date.now()) {
      account.status = 'sold';
    } else {
      account.status = 'expired';
    }
    
    if (notes) {
      account.notes = (account.notes ? `${account.notes}\n` : '') + `[Gia hạn] ${notes}`;
    }

    await account.save();

    // 3. Tạo Đơn hàng mới (Hóa đơn gia hạn - đã thanh toán)
    const newOrder = await Order.create({
      customer_id: account.customer_id._id,
      accounts: [account._id],
      total_amount: Number(renewalFee),
      status: 'paid', // Khách đã thanh toán trước → admin mới ấn gia hạn
      order_date: new Date()
    });

    // 4. Gửi email hóa đơn mới cập nhật ngày sử dụng cho khách hàng
    // Gọi hàm sendInvoiceEmail. Nếu chưa cấu hình SMTP, nó sẽ trả về simulation preview
    const emailResult = await sendInvoiceEmail({
      orderId: newOrder._id.toString(),
      isPreview: false // Thực hiện gửi thật (hoặc trả về simulation nếu thiếu config SMTP)
    });

    return res.status(200).json({
      success: true,
      message: 'Gia hạn gói dịch vụ thành công và đã tạo hóa đơn mới.',
      data: {
        account,
        order: newOrder,
        emailResult
      }
    });

  } catch (err: any) {
    console.error('Error during renewal:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gia hạn dịch vụ', error: err.message });
  }
}
