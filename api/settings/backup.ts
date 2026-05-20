import dbConnect from '../_lib/dbConnect.ts';
import Customer from '../_models/Customer.ts';
import Account from '../_models/Account.ts';
import Order from '../_models/Order.ts';
import Supplier from '../_models/Supplier.ts';
import PersonalLicense from '../_models/PersonalLicense.ts';
import Setting from '../_models/Setting.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const method = req.method;
    const action = req.query.action || req.body?.action;

    if (method === 'GET') {
        // ACTION: Export dữ liệu
        if (action === 'export') {
            try {
                const [customers, accounts, orders, suppliers, personalLicenses, settings] = await Promise.all([
                    Customer.find({}).lean(),
                    Account.find({}).lean(),
                    Order.find({}).lean(),
                    Supplier.find({}).lean(),
                    PersonalLicense.find({}).lean(),
                    Setting.find({}).lean()
                ]);

                const exportData = {
                    exportedAt: new Date().toISOString(),
                    version: '1.0',
                    data: {
                        customers,
                        accounts,
                        orders,
                        suppliers,
                        personalLicenses,
                        settings
                    }
                };

                res.status(200).json({ success: true, message: 'Xuất dữ liệu thành công!', data: exportData });
            } catch (err: any) {
                res.status(500).json({ success: false, message: 'Lỗi khi xuất dữ liệu', error: err.message });
            }
        } else {
            // Lấy cấu hình backup
            try {
                const setting = await Setting.findOne({ key: 'backup' });
                if (!setting) {
                    return res.status(200).json({
                        success: true,
                        data: { autoBackup: false, backupFrequency: 'weekly', lastBackup: null }
                    });
                }
                res.status(200).json({ success: true, data: setting.value });
            } catch (err: any) {
                res.status(500).json({ success: false, message: 'Lỗi khi lấy cấu hình backup', error: err.message });
            }
        }
    } else if (method === 'POST') {
        // ACTION: Lưu cấu hình backup
        if (!action || action === 'save-config') {
            try {
                const { autoBackup, backupFrequency } = req.body;
                const config = { autoBackup: Boolean(autoBackup), backupFrequency: backupFrequency || 'weekly', lastBackup: null };

                const setting = await Setting.findOneAndUpdate(
                    { key: 'backup' },
                    { value: config },
                    { new: true, upsert: true }
                );
                res.status(200).json({ success: true, message: 'Lưu cấu hình sao lưu thành công!', data: setting.value });
            } catch (err: any) {
                res.status(500).json({ success: false, message: 'Lỗi khi lưu cấu hình backup', error: err.message });
            }
        } else if (action === 'update-last-backup') {
            try {
                const setting = await Setting.findOne({ key: 'backup' });
                const config = setting?.value || { autoBackup: false, backupFrequency: 'weekly' };
                config.lastBackup = new Date().toISOString();

                await Setting.findOneAndUpdate(
                    { key: 'backup' },
                    { value: config },
                    { new: true, upsert: true }
                );
                res.status(200).json({ success: true, message: 'Đã cập nhật thời gian sao lưu!', data: config });
            } catch (err: any) {
                res.status(500).json({ success: false, message: 'Lỗi khi cập nhật backup', error: err.message });
            }
        } else {
            res.status(400).json({ success: false, message: 'Action không hợp lệ' });
        }
    } else {
        res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
    }
}
