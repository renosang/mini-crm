import dbConnect from '../_lib/dbConnect.ts';
import Supplier from '../_models/Supplier.ts';
import Account from '../_models/Account.ts';
import SupplierImport from '../_models/SupplierImport.ts';
import SupplierPayment from '../_models/SupplierPayment.ts';

export default async function handler(_req: any, res: any) {
    await dbConnect();

    try {
        // 1. Supplier counters
        const totalSuppliers = await Supplier.countDocuments({});
        const activeSuppliers = await Supplier.countDocuments({ status: 'active' });
        const inactiveSuppliers = await Supplier.countDocuments({ status: 'inactive' });

        // 2. Import stats
        const importAgg = await SupplierImport.aggregate([
            {
                $group: {
                    _id: null,
                    totalImportCost: { $sum: '$total_cost' },
                    totalImports: { $sum: 1 },
                    totalPaid: { $sum: '$paid_amount' },
                },
            },
        ]);

        const totalImportCost = importAgg[0]?.totalImportCost || 0;
        const totalImports = importAgg[0]?.totalImports || 0;
        const totalPaid = importAgg[0]?.totalPaid || 0;

        // 3. Payment stats
        const paymentAgg = await SupplierPayment.aggregate([
            {
                $group: {
                    _id: null,
                    totalPayments: { $sum: '$amount' },
                    paymentCount: { $sum: 1 },
                },
            },
        ]);
        const totalPayments = paymentAgg[0]?.totalPayments || 0;
        const paymentCount = paymentAgg[0]?.paymentCount || 0;

        // 4. Outstanding debt
        const outstandingDebt = totalImportCost - totalPayments;

        // 5. Accounts imported total (from Account model linked to suppliers)
        const accountAgg = await Account.aggregate([
            { $match: { supplier: { $ne: null } } },
            {
                $group: {
                    _id: null,
                    totalAccounts: { $sum: 1 },
                    totalCost: { $sum: '$cost' },
                    soldAccounts: {
                        $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] },
                    },
                    availableAccounts: {
                        $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
                    },
                },
            },
        ]);

        const totalAccountsImported = accountAgg[0]?.totalAccounts || 0;
        const totalAccountCost = accountAgg[0]?.totalCost || 0;
        const soldAccounts = accountAgg[0]?.soldAccounts || 0;
        const availableAccounts = accountAgg[0]?.availableAccounts || 0;

        // 6. Top suppliers by import cost
        const topSuppliers = await SupplierImport.aggregate([
            {
                $group: {
                    _id: '$supplier_id',
                    totalImportCost: { $sum: '$total_cost' },
                    totalPaid: { $sum: '$paid_amount' },
                    importCount: { $sum: 1 },
                },
            },
            { $sort: { totalImportCost: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'suppliers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'supplier',
                },
            },
            { $unwind: '$supplier' },
            {
                $project: {
                    _id: 1,
                    name: '$supplier.name',
                    totalImportCost: 1,
                    totalPaid: 1,
                    importCount: 1,
                },
            },
        ]);

        // 7. Debt by supplier
        const debtBySupplier = await SupplierImport.aggregate([
            {
                $group: {
                    _id: '$supplier_id',
                    totalImportCost: { $sum: '$total_cost' },
                    totalPaid: { $sum: '$paid_amount' },
                },
            },
            {
                $lookup: {
                    from: 'suppliers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'supplier',
                },
            },
            { $unwind: '$supplier' },
            {
                $project: {
                    _id: 1,
                    name: '$supplier.name',
                    totalImportCost: 1,
                    totalPaid: 1,
                    debt: { $subtract: ['$totalImportCost', '$totalPaid'] },
                },
            },
            { $sort: { debt: -1 } },
        ]);

        res.status(200).json({
            success: true,
            data: {
                suppliers: { total: totalSuppliers, active: activeSuppliers, inactive: inactiveSuppliers },
                imports: { total: totalImports, totalCost: totalImportCost, totalPaid },
                payments: { total: paymentCount, totalAmount: totalPayments },
                outstandingDebt,
                accounts: {
                    total: totalAccountsImported,
                    totalCost: totalAccountCost,
                    sold: soldAccounts,
                    available: availableAccounts,
                },
                topSuppliers,
                debtBySupplier,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
}
