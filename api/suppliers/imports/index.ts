import dbConnect from '../../_lib/dbConnect.ts';
import SupplierImport from '../../_models/SupplierImport.ts';
import Account from '../../_models/Account.ts';
import Supplier from '../../_models/Supplier.ts';

export default async function handler(req: any, res: any) {
    await dbConnect();

    const id = req.query.id || req.params?.id;
    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                if (id) {
                    const importRecord = await SupplierImport.findById(id).populate('supplier_id');
                    if (!importRecord) {
                        return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập' });
                    }
                    return res.status(200).json({ success: true, data: importRecord });
                }

                // Lọc theo supplier nếu có
                const filter: any = {};
                if (req.query.supplier_id) {
                    filter.supplier_id = req.query.supplier_id;
                }

                const imports = await SupplierImport.find(filter)
                    .populate('supplier_id')
                    .sort({ createdAt: -1 });
                res.status(200).json({ success: true, data: imports });
            } catch (error: any) {
                res.status(500).json({ success: false, message: 'Lỗi tải phiếu nhập', error: error.message });
            }
            break;

        case 'POST':
            try {
                const { supplier_id, import_date, items, notes } = req.body;

                if (!supplier_id || !items || items.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Thiếu thông tin: nhà cung cấp hoặc danh sách hàng nhập',
                    });
                }

                // Kiểm tra supplier tồn tại
                const supplier = await Supplier.findById(supplier_id);
                if (!supplier) {
                    return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
                }

                // Tính tổng chi phí từ items
                let totalCost = 0;
                let accountsCreated = 0;
                const processedItems = items.map((item: any) => {
                    const total = (item.quantity || 0) * (item.unit_cost || 0);
                    totalCost += total;
                    return {
                        product_type: item.product_type,
                        quantity: item.quantity,
                        unit_cost: item.unit_cost,
                        total_cost: total,
                        account_data: item.account_data || '',
                    };
                });

                // Tạo phiếu nhập
                const importRecord = await SupplierImport.create({
                    supplier_id,
                    import_date: import_date ? new Date(import_date) : new Date(),
                    items: processedItems.map(({ account_data, ...rest }: any) => rest),
                    total_cost: totalCost,
                    notes: notes || '',
                });

                // Tự động sinh Account vào kho dựa trên items, kèm thông tin đăng nhập
                const accountsToCreate: any[] = [];
                for (const item of processedItems) {
                    // Parse account_data: mỗi dòng = 1 tài khoản
                    const lines = (item.account_data || '')
                        .split('\n')
                        .map((l: string) => l.trim())
                        .filter((l: string) => l.length > 0);

                    // Nếu có account_data, dùng nó để xác định số lượng thực tế
                    // Nếu không, dùng quantity như cũ (tạo rỗng)
                    const count = lines.length > 0 ? lines.length : item.quantity;

                    for (let i = 0; i < count; i++) {
                        const line = lines[i] || '';
                        let username = '';
                        let password = '';
                        let licenseKey = '';
                        let resourceType = 'id_pass';

                        // Parse format: username:password hoặc license_key
                        if (line.includes(':')) {
                            const parts = line.split(':');
                            username = parts[0]?.trim() || '';
                            password = parts.slice(1).join(':').trim();
                            resourceType = 'id_pass';
                        } else if (line.length > 0) {
                            // Nếu không có dấu ":", coi như license key
                            licenseKey = line;
                            resourceType = 'license';
                        }

                        accountsToCreate.push({
                            product_type: item.product_type,
                            account_details: {
                                username,
                                password_acc: password,
                                license_key: licenseKey,
                                pin: '',
                            },
                            supplier: supplier_id,
                            cost: item.unit_cost,
                            resource_type: resourceType,
                            status: 'available',
                        });
                        accountsCreated++;
                    }
                }

                if (accountsToCreate.length > 0) {
                    await Account.insertMany(accountsToCreate);
                    // Cập nhật số lượng tài khoản đã tạo
                    await SupplierImport.findByIdAndUpdate(importRecord._id, {
                        accounts_created: accountsCreated,
                    });
                    importRecord.accounts_created = accountsCreated;
                }

                const populated = await SupplierImport.findById(importRecord._id).populate('supplier_id');

                res.status(201).json({
                    success: true,
                    data: populated,
                    message: `Nhập hàng thành công! Đã tự động tạo ${accountsCreated} tài khoản vào kho.`,
                });
            } catch (error: any) {
                res.status(400).json({ success: false, message: 'Lỗi nhập hàng', error: error.message });
            }
            break;

        case 'PUT':
            try {
                if (!id) {
                    return res.status(400).json({ success: false, message: 'Thiếu ID phiếu nhập' });
                }
                const updated = await SupplierImport.findByIdAndUpdate(id, req.body, {
                    new: true,
                    runValidators: true,
                }).populate('supplier_id');
                if (!updated) {
                    return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập' });
                }
                res.status(200).json({ success: true, data: updated });
            } catch (error: any) {
                res.status(400).json({ success: false, message: 'Lỗi cập nhật', error: error.message });
            }
            break;

        case 'DELETE':
            try {
                if (!id) {
                    return res.status(400).json({ success: false, message: 'Thiếu ID phiếu nhập' });
                }
                const deleted = await SupplierImport.findByIdAndDelete(id);
                if (!deleted) {
                    return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập' });
                }
                res.status(200).json({ success: true, data: {} });
            } catch (error: any) {
                res.status(500).json({ success: false, message: 'Lỗi xóa', error: error.message });
            }
            break;

        default:
            res.status(405).json({ success: false, message: 'Method Not Allowed' });
            break;
    }
}
