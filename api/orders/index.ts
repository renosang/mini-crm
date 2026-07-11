import dbConnect from '../_lib/dbConnect.ts';
import Order from '../_models/Order.ts';
import Account from '../_models/Account.ts';
import Customer from '../_models/Customer.ts';
import Product from '../_models/Product.ts';
import Discount from '../_models/Discount.ts';

export default async function handler(req: any, res: any) {
  await dbConnect();

  const id = req.query.id || req.params?.id;
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          const order = await Order.findById(id)
            .populate('customer_id')
            .populate('accounts')
            .populate('items.product_id');
          if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
          }
          return res.status(200).json({ success: true, data: order });
        }

        const orders = await Order.find({})
          .populate('customer_id')
          .populate('accounts')
          .populate('items.product_id')
          .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
      } catch (err: any) {
        res.status(500).json({ success: false, message: 'Lỗi tải đơn hàng', error: err.message });
      }
      break;

    case 'POST':
      try {
        const {
          customer_id,
          total_amount,
          status,
          accountsData,
          existingAccountIds,
          items,
          discount_code,
          discount_amount,
          discount_reason,
          // === Trường mới từ modal đơn giản ===
          product_name,
          quantity: qtyInput,
          cost_price,
          selling_price,
          expiry_date,
          recurring_invoice,
          payment_method,
          customer_note,
          internal_note,
        } = req.body;

        if (!customer_id) {
          return res.status(400).json({ success: false, message: 'Thiếu thông tin khách hàng' });
        }

        // === Nếu là luồng đơn giản (có product_name + selling_price), tính total từ đó ===
        let finalTotal = 0;
        let calculatedDiscount = 0;

        // Ưu tiên luồng sản phẩm tùy chỉnh
        if (product_name && selling_price) {
          const qty = Number(qtyInput) || 1;
          const sellPrice = Number(selling_price) || 0;
          const sub = sellPrice * qty;
          calculatedDiscount = Number(discount_amount) || 0;
          finalTotal = Math.max(0, sub - calculatedDiscount);
        } else {
          // Luồng cũ: tính từ items / gói sản phẩm
          if (discount_amount !== undefined && discount_amount !== null && !isNaN(Number(discount_amount))) {
            calculatedDiscount = Number(discount_amount);
          } else if (discount_code) {
            const discount = await Discount.findOne({ code: discount_code.toUpperCase(), active: true });
            if (discount) {
              if (!discount.valid_until || new Date(discount.valid_until) >= new Date()) {
                if (discount.discount_type === 'fixed') {
                  calculatedDiscount = discount.value;
                } else if (discount.discount_type === 'percentage') {
                  const subtotal = (items || []).reduce((acc: number, item: any) => acc + (item.price * (item.quantity || 1)), 0);
                  calculatedDiscount = Math.round((subtotal * discount.value) / 100);
                }
              }
            }
          }
          const subtotal = (items || []).reduce((acc: number, item: any) => acc + (item.price * (item.quantity || 1)), 0);
          finalTotal = subtotal > 0 ? Math.max(0, subtotal - calculatedDiscount) : Math.max(0, (total_amount || 0) - calculatedDiscount);
        }

        const customerObj = await Customer.findById(customer_id);
        const customerEmail = customerObj ? customerObj.email : '';

        const finalAccountIds: string[] = [];

        // Xử lý cấp phát kho tự động nếu trạng thái là 'paid' và có items
        const isPaid = status === 'paid';
        if (isPaid && items && items.length > 0) {
          for (const item of items) {
            const product = await Product.findById(item.product_id);
            if (!product) continue;

            const packageObj = product.packages.find((p: any) => String(p._id) === String(item.package_id) || p.name === item.package_id);
            const durationDays = packageObj ? packageObj.durationDays : 30;

            const qty = item.quantity || 1;

            if (product.productType === 'share_slot') {
              const availableAccounts = await Account.find({
                product_id: product._id,
                resource_type: 'slot',
                status: 'available',
                $expr: { $lt: ['$used_slots', '$total_slots'] }
              });

              let slotsAssignedCount = 0;
              for (const acc of availableAccounts) {
                if (slotsAssignedCount >= qty) break;

                const remainingSlotsInAcc = (acc.total_slots || 1) - (acc.used_slots || 0);
                const slotsToTake = Math.min(qty - slotsAssignedCount, remainingSlotsInAcc);

                const newUsedSlots = (acc.used_slots || 0) + slotsToTake;
                const isFull = newUsedSlots >= (acc.total_slots || 1);

                const newSlots = [];
                for (let i = 0; i < slotsToTake; i++) {
                  newSlots.push({
                    customer_id,
                    assigned_email: customerEmail || '',
                    assigned_at: new Date()
                  });
                }

                await Account.updateOne(
                  { _id: acc._id },
                  {
                    $set: {
                      used_slots: newUsedSlots,
                      status: isFull ? 'sold' : 'available',
                      valid_until: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
                    },
                    $push: {
                      slots_assigned: { $each: newSlots }
                    }
                  }
                );

                finalAccountIds.push(acc._id);
                slotsAssignedCount += slotsToTake;
              }
            } else {
              const availableAccounts = await Account.find({
                product_id: product._id,
                status: 'available',
                $expr: { $lt: ['$used_slots', '$total_slots'] }
              });

              let assignedCount = 0;
              for (const acc of availableAccounts) {
                if (assignedCount >= qty) break;

                const isReusable = (acc.total_slots || 1) > 1;

                if (isReusable) {
                  const remaining = (acc.total_slots || 1) - (acc.used_slots || 0);
                  const toTake = Math.min(qty - assignedCount, remaining);

                  const newUsed = (acc.used_slots || 0) + toTake;
                  const isFull = newUsed >= (acc.total_slots || 1);

                  const newSlots = [];
                  for (let i = 0; i < toTake; i++) {
                    newSlots.push({
                      customer_id,
                      assigned_email: customerEmail || '',
                      assigned_at: new Date()
                    });
                  }

                  await Account.updateOne(
                    { _id: acc._id },
                    {
                      $set: {
                        used_slots: newUsed,
                        status: isFull ? 'sold' : 'available',
                        valid_until: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
                      },
                      $push: {
                        slots_assigned: { $each: newSlots }
                      }
                    }
                  );

                  finalAccountIds.push(acc._id);
                  assignedCount += toTake;
                } else {
                  await Account.updateOne(
                    { _id: acc._id },
                    {
                      $set: {
                        status: 'sold',
                        customer_id,
                        used_slots: 1,
                        sold_at: new Date(),
                        valid_until: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
                      }
                    }
                  );
                  finalAccountIds.push(acc._id);
                  assignedCount += 1;
                }
              }
            }
          }
        }

        // 3. Hỗ trợ luồng cũ: Xử lý các tài khoản đã chọn thủ công từ kho (nếu có)
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
              await Account.updateOne(
                { _id: acc._id },
                { $set: { status: 'sold', customer_id, sold_at: new Date() } }
              );
            }
          }
          finalAccountIds.push(...existingAccountIds);
        }

        // 4. Hỗ trợ luồng cũ: Xử lý tạo mới tài khoản trực tiếp từ đơn hàng
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

        // 5. Tạo Đơn hàng
        const order = await Order.create({
          customer_id,
          items: items || [],
          discount_code: discount_code || '',
          discount_reason: discount_reason || '',
          discount_amount: calculatedDiscount,
          total_amount: finalTotal,
          status: status || 'pending',
          accounts: finalAccountIds,
          // === Trường mới cho modal đơn giản ===
          product_name: product_name || '',
          quantity: Number(qtyInput) || 1,
          cost_price: Number(cost_price) || 0,
          selling_price: Number(selling_price) || 0,
          expiry_date: expiry_date ? new Date(expiry_date) : null,
          recurring_invoice: recurring_invoice || { enabled: false, interval_months: 1, custom_interval: '' },
          payment_method: payment_method || '',
          customer_note: customer_note || '',
          internal_note: internal_note || '',
        });

        const populatedOrder = await Order.findById(order._id)
          .populate('customer_id')
          .populate('accounts')
          .populate('items.product_id');

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

        const order = await Order.findById(id);
        if (!order) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        if (order.accounts && order.accounts.length > 0) {
          // Hoàn lại trạng thái tài khoản
          for (const accId of order.accounts) {
            const acc = await Account.findById(accId);
            if (!acc) continue;

            const isReusable = (acc.total_slots || 1) > 1 || acc.resource_type === 'slot';
            if (isReusable) {
              // Xóa slot gán cho customer này
              const filteredSlots = acc.slots_assigned.filter((s: any) => String(s.customer_id) !== String(order.customer_id));
              const newUsed = Math.max(0, filteredSlots.length);
              await Account.updateOne(
                { _id: accId },
                {
                  $set: {
                    slots_assigned: filteredSlots,
                    used_slots: newUsed,
                    status: 'available'
                  }
                }
              );
            } else {
              await Account.updateOne(
                { _id: accId },
                { $set: { status: 'available', customer_id: null, sold_at: null, used_slots: 0 } }
              );
            }
          }
        }

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
