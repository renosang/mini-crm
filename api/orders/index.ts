import dbConnect from '../_lib/dbConnect.ts';
import Order from '../_models/Order.ts';
import Account from '../_models/Account.ts';
import Customer from '../_models/Customer.ts';

export default async function handler(req: any, res: any) {
  await dbConnect();
  
  // Hỗ trợ cả req.query.id từ mapParams hoặc req.params.id
  const id = req.query.id || req.params?.id;
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          // Lấy chi tiết một đơn hàng
          const order = await Order.findById(id).populate('customer_id').populate('accounts');
          if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
          }
          return res.status(200).json({ success: true, data: order });
        }
        
        // Lấy tất cả đơn hàng
        const orders = await Order.find({})
          .populate('customer_id')
          .populate('accounts')
          .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
      } catch (err: any) {
        res.status(500).json({ success: false, message: 'Lỗi tải đơn hàng', error: err.message });
      }
      break;

    case 'POST':
      try {
        const { customer_id, total_amount, status, accountsData, existingAccountIds } = req.body;

        if (!customer_id || total_amount === undefined) {
          return res.status(400).json({ success: false, message: 'Thiếu thông tin khách hàng hoặc tổng tiền' });
        }

        const finalAccountIds: string[] = [];

        // 1. Xử lý các tài khoản đã tồn tại trong kho (nếu có)
        if (existingAccountIds && existingAccountIds.length > 0) {
          const accountsToSell = await Account.find({ _id: { $in: existingAccountIds } });
          
          for (const acc of accountsToSell) {
            if (acc.resource_type === 'slot') {
              const newUsed = (acc.used_slots || 0) + 1;
              const isFull = newUsed >= (acc.total_slots || 1);
              
              await Account.updateOne(
                { _id: acc._id },
                { 
                  $set: { 
                    used_slots: newUsed, 
                    status: isFull ? 'sold' : 'available'
                  },
                  $push: {
                    slots_assigned: {
                      customer_id,
                      assigned_email: acc.account_details?.username || '',
                      assigned_at: new Date()
                    }
                  }
                }
              );
            } else {
              // ID:Pass hoặc Key
              await Account.updateOne(
                { _id: acc._id },
                { $set: { status: 'sold', customer_id, sold_at: new Date() } }
              );
            }
          }
          finalAccountIds.push(...existingAccountIds);
        }

        // 2. Xử lý tạo mới tài khoản trực tiếp từ đơn hàng (ví dụ: cấp license hoặc proxy trực tiếp)
        if (accountsData && accountsData.length > 0) {
          for (const acc of accountsData) {
            const createdAcc = await Account.create({
              product_type: acc.product_type || 'Dịch vụ MMO',
              account_details: {
                username: acc.username || '',
                password_acc: acc.password_acc || '',
                license_key: acc.license_key || '',
                pin: acc.pin || ''
              },
              cost: acc.cost || 0,
              status: 'sold',
              customer_id,
              sold_at: new Date(),
              valid_until: acc.valid_until ? new Date(acc.valid_until) : null,
              notes: acc.notes || ''
            });
            finalAccountIds.push(createdAcc._id);
          }
        }

        // 3. Tạo Đơn hàng
        const order = await Order.create({
          customer_id,
          total_amount,
          status: status || 'pending',
          accounts: finalAccountIds
        });

        // Populate đơn hàng để trả về giao diện hiển thị ngay
        const populatedOrder = await Order.findById(order._id)
          .populate('customer_id')
          .populate('accounts');

        res.status(201).json({ success: true, data: populatedOrder });
      } catch (err: any) {
        res.status(400).json({ success: false, message: 'Lỗi tạo đơn hàng', error: err.message });
      }
      break;

    case 'DELETE':
      try {
        if (!id) {
          return res.status(400).json({ success: false, message: 'Thiếu ID đơn hàng' });
        }
        
        // Tìm đơn hàng để lấy danh sách tài khoản cần hoàn kho
        const order = await Order.findById(id);
        if (!order) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        // Đổi trạng thái tài khoản liên quan về available và gỡ customer_id
        if (order.accounts && order.accounts.length > 0) {
          await Account.updateMany(
            { _id: { $in: order.accounts } },
            { $set: { status: 'available', customer_id: null, sold_at: null } }
          );
        }

        // Xóa đơn hàng
        await Order.deleteOne({ _id: id });
        res.status(200).json({ success: true, data: {} });
      } catch (err: any) {
        res.status(500).json({ success: false, message: 'Lỗi xóa đơn hàng', error: err.message });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      break;
  }
}
