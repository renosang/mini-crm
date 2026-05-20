import dbConnect from '../../_lib/dbConnect.ts';
import SupplierPayment from '../../_models/SupplierPayment.ts';
import SupplierImport from '../../_models/SupplierImport.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();

    const id = req.query.id || req.params?.id;
    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                if (id) {
                    const payment = await SupplierPayment.findById(id)
                        .populate('supplier_id')
                        .populate('import_id');
                    if (!payment) {
                        return res.status(404).json({ success: false, message: 'Không tìm thấy khoản thanh toán' });
                    }
                    return res.status(200).json({ success: true, data: payment });
                }

                const filter: any = {};
                if (req.query.supplier_id) {
                    filter.supplier_id = req.query.supplier_id;
                }

                const payments = await SupplierPayment.find(filter)
                    .populate('supplier_id')
                    .populate('import_id')
                    .sort({ payment_date: -1 });
                res.status(200).json({ success: true, data: payments });
            } catch (error: any) {
                res.status(500).json({ success: false, message: 'Lỗi tải thanh toán', error: error.message });
            }
            break;

        case 'POST':
            try {
                const { supplier_id, import_id, amount, payment_date, method: payMethod, reference, notes } = req.body;

                if (!supplier_id || !amount) {
                    return res.status(400).json({
                        success: false,
                        message: 'Thiếu thông tin: nhà cung cấp và số tiền thanh toán',
                    });
                }

                const payment = await SupplierPayment.create({
                    supplier_id,
                    import_id: import_id || null,
                    amount,
                    payment_date: payment_date ? new Date(payment_date) : new Date(),
                    method: payMethod || 'bank_transfer',
                    reference: reference || '',
                    notes: notes || '',
                });

                // Nếu có gắn với phiếu nhập cụ thể, cập nhật payment_status và paid_amount
                if (import_id) {
                    const importRecord = await SupplierImport.findById(import_id);
                    if (importRecord) {
                        const newPaidAmount = (importRecord.paid_amount || 0) + amount;
                        const newStatus =
                            newPaidAmount >= importRecord.total_cost
                                ? 'paid'
                                : newPaidAmount > 0
                                    ? 'partial'
                                    : 'pending';
                        await SupplierImport.findByIdAndUpdate(import_id, {
                            paid_amount: newPaidAmount,
                            payment_status: newStatus,
                        });
                    }
                }

                const populated = await SupplierPayment.findById(payment._id)
                    .populate('supplier_id')
                    .populate('import_id');

                res.status(201).json({ success: true, data: populated });
            } catch (error: any) {
                res.status(400).json({ success: false, message: 'Lỗi tạo thanh toán', error: error.message });
            }
            break;

        case 'DELETE':
            try {
                if (!id) {
                    return res.status(400).json({ success: false, message: 'Thiếu ID thanh toán' });
                }

                const payment = await SupplierPayment.findById(id);
                if (!payment) {
                    return res.status(404).json({ success: false, message: 'Không tìm thấy thanh toán' });
                }

                // Hoàn tiền: cập nhật lại paid_amount cho import nếu có
                if (payment.import_id) {
                    const importRecord = await SupplierImport.findById(payment.import_id);
                    if (importRecord) {
                        const newPaidAmount = Math.max(0, (importRecord.paid_amount || 0) - payment.amount);
                        const newStatus =
                            importRecord.total_cost <= 0
                                ? 'pending'
                                : newPaidAmount >= importRecord.total_cost
                                    ? 'paid'
                                    : newPaidAmount > 0
                                        ? 'partial'
                                        : 'pending';
                        await SupplierImport.findByIdAndUpdate(payment.import_id, {
                            paid_amount: newPaidAmount,
                            payment_status: newStatus,
                        });
                    }
                }

                await SupplierPayment.findByIdAndDelete(id);
                res.status(200).json({ success: true, data: {} });
            } catch (error: any) {
                res.status(500).json({ success: false, message: 'Lỗi xóa thanh toán', error: error.message });
            }
            break;

        default:
            res.status(405).json({ success: false, message: 'Method Not Allowed' });
            break;
    }
}
