import dbConnect from '../_lib/dbConnect.ts';
import Discount from '../_models/Discount.ts';

export default async function handler(req: any, res: any) {
  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const { code } = req.query;
        if (code) {
          // Validate discount code
          const discount = await Discount.findOne({ code: code.toUpperCase() });
          if (!discount) {
            return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại' });
          }
          if (!discount.active) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá không còn hoạt động' });
          }
          if (discount.valid_until && new Date(discount.valid_until) < new Date()) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn sử dụng' });
          }
          return res.status(200).json({ success: true, data: discount });
        }

        // Get all discounts
        const discounts = await Discount.find({}).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: discounts });
      } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy mã giảm giá', error: error.message });
      }

    case 'POST':
      try {
        const { code, discount_type, value, active, valid_until } = req.body;
        if (!code || !discount_type || value === undefined) {
          return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ code, loại giảm giá và giá trị' });
        }

        const discount = await Discount.create({
          code: code.toUpperCase(),
          discount_type,
          value: Number(value),
          active: active !== undefined ? active : true,
          valid_until: valid_until ? new Date(valid_until) : null
        });

        return res.status(201).json({ success: true, data: discount });
      } catch (error: any) {
        return res.status(400).json({ success: false, message: 'Mã giảm giá không hợp lệ hoặc đã tồn tại', error: error.message });
      }

    default:
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
}
