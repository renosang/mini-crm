import './loadEnv.ts';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import handlers
import loginHandler from './api/auth/login.ts';
import registerHandler from './api/auth/register.ts';
import forgotPasswordHandler from './api/auth/forgot-password.ts';
import resetPasswordHandler from './api/auth/reset-password.ts';
import customersHandler from './api/customers/index.ts';
import customerStatsHandler from './api/customers/stats.ts';
import customerDetailHandler from './api/customers/[id].ts';
import dashboardStatsHandler from './api/dashboard/stats.ts';
import accountsHandler from './api/accounts/index.ts';
import accountDetailHandler from './api/accounts/[id].ts';
import renewHandler from './api/accounts/renew.ts';

import ordersHandler from './api/orders/index.ts';
import invoiceActionsHandler from './api/orders/invoice-actions.ts';
import personalLicensesHandler from './api/personal-licenses/index.ts';
import sendOrderReminderHandler from './api/orders/send-reminder.ts';
import smtpSettingsHandler from './api/settings/smtp.ts';
import bankSettingsHandler from './api/settings/bank.ts';
import generalSettingsHandler from './api/settings/general.ts';
import invoiceTemplateHandler from './api/settings/invoice-template.ts';
import renewalSettingsHandler from './api/settings/renewal.ts';
import accountSettingsHandler from './api/settings/account.ts';
import emailTemplatesHandler from './api/settings/email-templates.ts';
import backupSettingsHandler from './api/settings/backup.ts';
import imapSettingsHandler from './api/settings/imap.ts';
import omnichannelSettingsHandler from './api/settings/omnichannel.ts';
import chatMacrosHandler from './api/settings/macros.ts';
import omnichannelAlertsHandler from './api/omnichannel/alerts.ts';
import suppliersHandler from './api/suppliers/index.ts';

import supplierDetailHandler from './api/suppliers/[id].ts';
import supplierDashboardStatsHandler from './api/suppliers/dashboard-stats.ts';
import supplierImportsHandler from './api/suppliers/imports/index.ts';
import supplierPaymentsHandler from './api/suppliers/payments/index.ts';
import supplierProfitHandler from './api/suppliers/profit.ts';

import productsHandler from './api/products/index.ts';
import productDetailHandler from './api/products/[id].ts';

import discountsHandler from './api/discounts/index.ts';
import discountDetailHandler from './api/discounts/[id].ts';

// Mailbox routes
import mailboxHandler from './api/mailbox/index.ts';

// Expense routes
import expensesHandler from './api/expenses/index.ts';

// Quotation routes
import quotationsHandler from './api/quotations/index.ts';
import quotationSendEmailHandler from './api/quotations/send-email.ts';
import quotationActionsHandler from './api/quotations/actions.ts';
import quotationTrackOpenHandler from './api/quotations/track-open.ts';
import quotationTrackClickHandler from './api/quotations/track-click.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & Body Parsers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to map Express params into Vercel-style req.query
const mapParams = (req: any, res: any, next: any) => {
  const mergedQuery = { ...req.query, ...req.params };
  Object.defineProperty(req, 'query', {
    value: mergedQuery,
    writable: true,
    configurable: true
  });
  next();
};

// Register API routes
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/register', registerHandler);
app.post('/api/auth/forgot-password', forgotPasswordHandler);
app.post('/api/auth/reset-password', resetPasswordHandler);

app.get('/api/customers/stats', customerStatsHandler);
app.get('/api/customers', customersHandler);
app.post('/api/customers', customersHandler);

app.get('/api/customers/:id', mapParams, customerDetailHandler);
app.put('/api/customers/:id', mapParams, customerDetailHandler);
app.delete('/api/customers/:id', mapParams, customerDetailHandler);

app.get('/api/dashboard/stats', dashboardStatsHandler);

app.get('/api/accounts', accountsHandler);
app.post('/api/accounts', accountsHandler);
app.get('/api/accounts/:id', mapParams, accountDetailHandler);
app.put('/api/accounts/:id', mapParams, accountDetailHandler);
app.delete('/api/accounts/:id', mapParams, accountDetailHandler);
app.post('/api/accounts/:id/renew', mapParams, renewHandler);

app.get('/api/orders', ordersHandler);
app.get('/api/orders/:id', mapParams, ordersHandler);
app.post('/api/orders', ordersHandler);
app.delete('/api/orders/:id', mapParams, ordersHandler);
app.post('/api/orders/:id/invoice-actions', mapParams, invoiceActionsHandler);
app.put('/api/orders/:id/invoice-actions', mapParams, invoiceActionsHandler);

app.get('/api/personal-licenses', personalLicensesHandler);
app.get('/api/personal-licenses/:id', mapParams, personalLicensesHandler);
app.post('/api/personal-licenses', personalLicensesHandler);
app.put('/api/personal-licenses/:id', mapParams, personalLicensesHandler);
app.delete('/api/personal-licenses/:id', mapParams, personalLicensesHandler);

app.post('/api/orders/:id/send-reminder', mapParams, sendOrderReminderHandler);
app.post('/api/orders/send-reminder', mapParams, sendOrderReminderHandler);

app.get('/api/settings/smtp', smtpSettingsHandler);
app.post('/api/settings/smtp', smtpSettingsHandler);

app.get('/api/settings/bank', bankSettingsHandler);
app.post('/api/settings/bank', bankSettingsHandler);

app.get('/api/settings/general', generalSettingsHandler);
app.post('/api/settings/general', generalSettingsHandler);

app.get('/api/settings/invoice-template', invoiceTemplateHandler);
app.post('/api/settings/invoice-template', invoiceTemplateHandler);

app.get('/api/settings/renewal', renewalSettingsHandler);
app.post('/api/settings/renewal', renewalSettingsHandler);

app.get('/api/settings/account', accountSettingsHandler);
app.post('/api/settings/account', accountSettingsHandler);

app.get('/api/settings/imap', imapSettingsHandler);
app.post('/api/settings/imap', imapSettingsHandler);

app.get('/api/settings/email-templates', emailTemplatesHandler);
app.post('/api/settings/email-templates', emailTemplatesHandler);

app.get('/api/settings/backup', backupSettingsHandler);
app.post('/api/settings/backup', backupSettingsHandler);

app.get('/api/settings/omnichannel', omnichannelSettingsHandler);
app.post('/api/settings/omnichannel', omnichannelSettingsHandler);

app.get('/api/settings/macros', chatMacrosHandler);
app.post('/api/settings/macros', chatMacrosHandler);

app.post('/api/omnichannel/alerts', omnichannelAlertsHandler);

// Supplier Routes — static routes MUST come BEFORE dynamic :id routes
app.get('/api/suppliers/dashboard-stats', supplierDashboardStatsHandler);
app.get('/api/suppliers/profit', supplierProfitHandler);
app.get('/api/suppliers/imports', supplierImportsHandler);
app.post('/api/suppliers/imports', supplierImportsHandler);
app.get('/api/suppliers/imports/:id', mapParams, supplierImportsHandler);
app.put('/api/suppliers/imports/:id', mapParams, supplierImportsHandler);
app.delete('/api/suppliers/imports/:id', mapParams, supplierImportsHandler);
app.get('/api/suppliers/payments', supplierPaymentsHandler);
app.post('/api/suppliers/payments', supplierPaymentsHandler);
app.get('/api/suppliers/payments/:id', mapParams, supplierPaymentsHandler);
app.delete('/api/suppliers/payments/:id', mapParams, supplierPaymentsHandler);
app.get('/api/suppliers', suppliersHandler);
app.post('/api/suppliers', suppliersHandler);
app.get('/api/suppliers/:id', mapParams, supplierDetailHandler);
app.put('/api/suppliers/:id', mapParams, supplierDetailHandler);
app.delete('/api/suppliers/:id', mapParams, supplierDetailHandler);

// Product Routes
app.get('/api/products', productsHandler);
app.post('/api/products', productsHandler);
app.get('/api/products/:id', mapParams, productDetailHandler);
app.put('/api/products/:id', mapParams, productDetailHandler);
app.delete('/api/products/:id', mapParams, productDetailHandler);

// Discount Routes
app.get('/api/discounts', discountsHandler);
app.post('/api/discounts', discountsHandler);
app.get('/api/discounts/:id', mapParams, discountDetailHandler);
app.put('/api/discounts/:id', mapParams, discountDetailHandler);
app.delete('/api/discounts/:id', mapParams, discountDetailHandler);

// Mailbox Routes
app.get('/api/mailbox/sync', mailboxHandler);
app.get('/api/mailbox/stats', mailboxHandler);
app.get('/api/mailbox', mailboxHandler);
app.get('/api/mailbox/:id', mapParams, mailboxHandler);
app.put('/api/mailbox/:id', mapParams, mailboxHandler);
app.post('/api/mailbox/reply', mailboxHandler);

// Expense Routes
app.get('/api/expenses/pnl', mapParams, expensesHandler);
app.get('/api/expenses', expensesHandler);
app.post('/api/expenses', expensesHandler);
app.get('/api/expenses/:id', mapParams, expensesHandler);
app.put('/api/expenses/:id', mapParams, expensesHandler);
app.delete('/api/expenses/:id', mapParams, expensesHandler);

// Quotation Routes
app.get('/api/quotations', quotationsHandler);
app.post('/api/quotations', quotationsHandler);
app.get('/api/quotations/:id', mapParams, quotationsHandler);
app.put('/api/quotations/:id', mapParams, quotationsHandler);
app.delete('/api/quotations/:id', mapParams, quotationsHandler);
app.get('/api/quotations/:id/send-email', mapParams, quotationSendEmailHandler);
app.post('/api/quotations/:id/actions', mapParams, quotationActionsHandler);
app.put('/api/quotations/:id/actions', mapParams, quotationActionsHandler);
app.get('/api/quotations/track-open', quotationTrackOpenHandler);
app.get('/api/quotations/track-click', quotationTrackClickHandler);

// In Production, serve the static Vite build from dist/
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// For all other routes, serve index.html (SPA routing support)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start the unified server
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Unified Express Server is running on port ${PORT}`);
  console.log(`   - API Base: http://localhost:${PORT}/api`);
  console.log(`   - Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================\n`);
  // Forced restart comment to apply override settings
});
