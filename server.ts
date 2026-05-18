import './loadEnv.ts';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import handlers
import loginHandler from './api/auth/login.ts';
import registerHandler from './api/auth/register.ts';
import customersHandler from './api/customers/index.ts';
import customerStatsHandler from './api/customers/stats.ts';
import customerDetailHandler from './api/customers/[id].ts';
import dashboardStatsHandler from './api/dashboard/stats.ts';
import accountsHandler from './api/accounts/index.ts';
import accountDetailHandler from './api/accounts/[id].ts';
import ordersHandler from './api/orders/index.ts';
import personalLicensesHandler from './api/personal-licenses/index.ts';
import sendOrderReminderHandler from './api/orders/send-reminder.ts';
import smtpSettingsHandler from './api/settings/smtp.ts';

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

app.get('/api/orders', ordersHandler);
app.get('/api/orders/:id', mapParams, ordersHandler);
app.post('/api/orders', ordersHandler);
app.delete('/api/orders/:id', mapParams, ordersHandler);

app.get('/api/personal-licenses', personalLicensesHandler);
app.get('/api/personal-licenses/:id', mapParams, personalLicensesHandler);
app.post('/api/personal-licenses', personalLicensesHandler);
app.put('/api/personal-licenses/:id', mapParams, personalLicensesHandler);
app.delete('/api/personal-licenses/:id', mapParams, personalLicensesHandler);

app.post('/api/orders/:id/send-reminder', mapParams, sendOrderReminderHandler);
app.post('/api/orders/send-reminder', mapParams, sendOrderReminderHandler);

app.get('/api/settings/smtp', smtpSettingsHandler);
app.post('/api/settings/smtp', smtpSettingsHandler);

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
