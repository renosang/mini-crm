import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const dbConnect = (await import('./api/_lib/dbConnect.ts')).default;
  const Customer  = (await import('./api/_models/Customer.ts')).default;
  const Account   = (await import('./api/_models/Account.ts')).default;
  const Order     = (await import('./api/_models/Order.ts')).default;
  const { generateInvoicePDF } = await import('./api/_lib/generateInvoicePDF.ts');
  const fs   = await import('fs');
  const path = await import('path');

  await dbConnect();
  const order = await Order.findOne({}).populate('customer_id').populate('accounts');
  if (!order) { console.error('No orders found.'); process.exit(1); }

  console.log(`Generating PDF for Order #${order._id}...`);
  const pdfBuffer = await generateInvoicePDF(
    order.customer_id, order.accounts || [], order.total_amount || 0,
    true, order._id, true
  );
  const out = path.join(process.cwd(), 'test_invoice_red.pdf');
  fs.writeFileSync(out, pdfBuffer);
  console.log(`Saved: ${out}`);
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
