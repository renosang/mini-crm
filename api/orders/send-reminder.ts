import { sendInvoiceEmail } from '../_lib/emailService.ts';

export default async function handler(req: any, res: any) {
  const id = req.query.id || req.params?.id;
  const accountId = req.query.account_id || req.body?.account_id;
  const customerId = req.query.customer_id || req.body?.customer_id;
  const isPreview = req.query.preview === 'true' || req.body?.preview === true;
  
  if (!id && !accountId) {
    return res.status(400).json({ success: false, message: 'Thiếu ID đơn hàng hoặc ID tài khoản để gửi nhắc nhở' });
  }

  try {
    const result = await sendInvoiceEmail({ orderId: id, accountId, customerId, isPreview });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi email', error: err.message });
  }
}
