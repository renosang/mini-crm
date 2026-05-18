import dbConnect from '../_lib/dbConnect.ts';
import Order from '../_models/Order.ts';
import Account from '../_models/Account.ts';
import Customer from '../_models/Customer.ts';
import Setting from '../_models/Setting.ts';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export default async function handler(req: any, res: any) {
  await dbConnect();
  
  const id = req.query.id || req.params?.id;
  const accountId = req.query.account_id || req.body?.account_id;
  const customerId = req.query.customer_id || req.body?.customer_id;
  
  if (!id && !accountId) {
    return res.status(400).json({ success: false, message: 'Thiếu ID đơn hàng hoặc ID tài khoản để gửi nhắc nhở' });
  }

  try {
    let customer: any = null;
    let accountsToRemind: any[] = [];
    let billingAmount = 0;
    let reminderTitle = '';
    let isUnpaidInvoice = false;
    
    if (id) {
      // 1. Nhắc nhở theo đơn hàng
      const order = await Order.findById(id).populate('customer_id').populate('accounts');
      if (!order) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }
      customer = order.customer_id;
      accountsToRemind = order.accounts || [];
      billingAmount = order.total_amount || 0;
      reminderTitle = `Đơn hàng #${order._id.toString().substring(18).toUpperCase()}`;
      if (order.status === 'pending') {
        isUnpaidInvoice = true;
      }
    } else {
      // 2. Nhắc nhở trực tiếp cho tài khoản đơn lẻ
      const account = await Account.findById(accountId).populate('customer_id');
      if (!account) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài nguyên' });
      }
      
      if (customerId) {
        customer = await Customer.findById(customerId);
      } else {
        customer = account.customer_id;
      }
      
      accountsToRemind = [account];
      billingAmount = account.cost || 0;
      reminderTitle = `Dịch vụ ${account.product_type}`;
    }
    
    if (!customer) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy thông tin khách hàng' });
    }

    const customerEmail = customer.email;
    if (!customerEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Khách hàng này không có Email. Vui lòng cập nhật email của họ trong danh sách khách hàng trước.' 
      });
    }

    // Tiêu đề email chuyên nghiệp động
    const emailSubject = isUnpaidInvoice
      ? `🔔 [MINI CRM] Hóa đơn thanh toán dịch vụ - ${reminderTitle}`
      : `🔔 [MINI CRM] Thông báo nhắc gia hạn bản quyền - ${reminderTitle}`;

    // Tạo HTML template hóa đơn & gia hạn phong cách Apple tinh tế
    const accountRows = accountsToRemind.map((acc: any) => {
      const details = acc.account_details || {};
      const isClientUpgrade = !details.password_acc || details.password_acc.includes('Nâng cấp') || details.password_acc.includes('Upgrade') || details.password_acc === '';
      
      const loginLabel = isClientUpgrade ? 'Tài khoản nâng cấp' : 'Tài khoản';
      const loginInfo = details.username ? `<li><strong>${loginLabel}:</strong> ${details.username}</li>` : '';
      const passInfo = isClientUpgrade 
        ? `<li><strong>Hình thức:</strong> Nâng cấp trực tiếp trên tài khoản của khách (Không cấp mật khẩu mới)</li>`
        : (details.password_acc ? `<li><strong>Mật khẩu:</strong> ${details.password_acc}</li>` : '');
        
      const keyInfo = details.license_key ? `<li><strong>License Key:</strong> <code style="background:#F5F5F7;padding:2px 4px;border-radius:4px;font-family:monospace;">${details.license_key}</code></li>` : '';
      const pinInfo = details.pin ? `<li><strong>PIN Profile:</strong> ${details.pin}</li>` : '';
      const validUntilStr = acc.valid_until ? new Date(acc.valid_until).toLocaleDateString('vi-VN') : 'Không giới hạn';

      return `
        <div class="service-card" style="border: 1px solid #E5E5EA; padding: 14px; border-radius: 10px; margin-bottom: 10px; background-color: #FAFAFC;">
          <h4 style="margin:0 0 6px 0; color:#0071E3; font-size:14px; font-weight:600;">${acc.product_type}</h4>
          <ul style="margin:0; padding-left:18px; font-size:13px; color:#1D1D1F; line-height:1.5;">
            ${loginInfo}
            ${passInfo}
            ${keyInfo}
            ${pinInfo}
            <li><strong>Hạn sử dụng hiện tại:</strong> <span style="color:#FF3B30;font-weight:600;">${validUntilStr}</span></li>
          </ul>
        </div>
      `;
    }).join('');

    let logoBase64 = '';
    const logoPath = path.join(process.cwd(), 'src/assets/logo.png');
    try {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.error('Error reading logo file:', e);
    }

    const buttonText = isUnpaidInvoice ? 'Thanh Toán' : 'Gia Hạn Ngay';
    const headerSubtitle = isUnpaidInvoice ? 'Thanh Toán & Bàn Giao Dịch Vụ' : 'Thông Báo Nhắc Nhở Gia Hạn Bản Quyền';
    const bodyDescription = isUnpaidInvoice
      ? 'Chúng tôi xin gửi thông tin bàn giao chi tiết cho các gói dịch vụ bạn đã đăng ký. Vui lòng hoàn tất thanh toán để kích hoạt dịch vụ hoạt động chính thức:'
      : 'Chúng tôi xin gửi thông tin chi tiết và nhắc nhở gia hạn cho các gói bản quyền sắp hết hạn của bạn. Vui lòng kiểm tra và thanh toán gia hạn để đảm bảo dịch vụ không bị gián đoạn:';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hóa đơn & Nhắc nhở Gia Hạn</title>
        <style>
          @media only screen and (max-width: 600px) {
            body {
              padding: 10px !important;
            }
            .content-wrapper {
              border-radius: 16px !important;
              max-width: 100% !important;
            }
            .header-bar {
              padding: 24px 16px !important;
            }
            .body-padding {
              padding: 24px 16px !important;
            }
            h1 {
              font-size: 19px !important;
            }
            p {
              font-size: 13px !important;
            }
            .service-card {
              padding: 12px !important;
              border-radius: 8px !important;
            }
          }
        </style>
      </head>
      <body style="font-family:'SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif; background-color:#F5F5F7; margin:0; padding:32px 16px; color:#1D1D1F;">
        <div class="content-wrapper" style="max-width: 660px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.03); overflow: hidden; border: 1px solid rgba(0,0,0,0.04);">
          <!-- Header Apple Style -->
          <div class="header-bar" style="background-color: #FFB700; padding: 28px 24px; text-align: center; border-bottom: 1px solid rgba(0, 0, 0, 0.05);">
            ${logoBase64 ? `<img src="cid:logo" alt="Logo" style="max-height: 42px; display: block; margin: 0 auto;" />` : `<h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; color: #1D1D1F;">MINI CRM</h1>`}
            <p style="margin: 10px 0 0 0; color: rgba(0, 0, 0, 0.65); font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">${headerSubtitle}</p>
          </div>
          
          <!-- Body -->
          <div class="body-padding" style="padding: 32px 24px;">
            <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px 0;">Xin chào <strong>${customer.name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #515154; margin: 0 0 20px 0;">
              ${bodyDescription}
            </p>

            <h3 style="border-bottom: 1px solid #E5E5EA; padding-bottom: 8px; margin: 0 0 16px 0; color: #1D1D1F; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">
              📦 THÔNG TIN BÀN GIAO:
            </h3>
            
            ${accountRows}

            <!-- Thanh toán -->
            <div style="margin-top: 20px; padding: 16px; background-color: #FFFDF0; border: 1px solid #FFEBB3; border-radius: 12px; text-align: center;">
              <p style="margin:0 0 6px 0; font-size:13px; color:#515154;">${isUnpaidInvoice ? 'Số tiền cần thanh toán:' : 'Cần thanh toán gia hạn:'}</p>
              <h2 style="margin:0 0 10px 0; color:#D27B00; font-size:24px; font-weight:700;">${billingAmount.toLocaleString('vi-VN')} đ</h2>
              <a href="#" style="display:inline-block; background-color:#0071E3; color:#FFFFFF; padding:10px 24px; border-radius:99px; text-decoration:none; font-weight:600; font-size:13px;">
                ${buttonText}
              </a>
            </div>

            <p style="font-size: 12px; line-height: 1.5; color: #86868B; margin: 20px 0 0 0; text-align: center;">
              Nếu bạn đã gia hạn hoặc thanh toán trước đó, xin vui lòng bỏ qua email này. Xin chân thành cảm ơn!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #F5F5F7; padding: 20px; text-align: center; border-top: 1px solid #E5E5EA; color: #86868B; font-size: 11px;">
            <p style="margin: 0 0 4px 0;">© 2026 Mini CRM Inc. All rights reserved.</p>
            <p style="margin: 0;">Bạn nhận được email này vì đã đăng ký mua bản quyền dịch vụ.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 1. Kiểm tra cấu hình SMTP trong cơ sở dữ liệu trước, fallback về biến môi trường
    let smtpHost = process.env.SMTP_HOST;
    let smtpPort = process.env.SMTP_PORT;
    let smtpUser = process.env.SMTP_USER;
    let smtpPass = process.env.SMTP_PASS;
    let smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"MINI CRM" <${smtpUser}>` : '');

    const smtpSetting = await Setting.findOne({ key: 'smtp' });
    if (smtpSetting && smtpSetting.value) {
      const val = smtpSetting.value;
      if (val.smtp_host && val.smtp_user && val.smtp_pass) {
        smtpHost = val.smtp_host;
        smtpPort = String(val.smtp_port);
        smtpUser = val.smtp_user;
        smtpPass = val.smtp_pass;
        smtpFrom = val.smtp_from || val.smtp_user;
      }
    }

    // Nếu yêu cầu xem trước trước khi gửi thực tế -> Thế src="cid:logo" bằng Base64 để hiển thị trong React Modal preview
    if (req.query.preview === 'true' || req.body?.preview === true) {
      const previewHtml = htmlContent.replace('src="cid:logo"', `src="${logoBase64}"`);
      return res.status(200).json({
        success: true,
        mode: 'preview',
        message: 'Bản xem trước hóa đơn được tạo thành công.',
        previewHtml: previewHtml,
        recipient: customerEmail,
        subject: emailSubject
      });
    }

    const attachments = logoBase64 && fs.existsSync(logoPath) ? [{
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo'
    }] : [];

    if (smtpHost && smtpUser && smtpPass) {
      // Cấu hình SMTP đầy đủ -> Gửi email thật!
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort || 587),
        secure: Number(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: customerEmail,
        subject: emailSubject,
        html: htmlContent,
        attachments: attachments
      });

      return res.status(200).json({ 
        success: true, 
        mode: 'smtp',
        message: `Đã gửi email nhắc gia hạn thành công đến địa chỉ ${customerEmail} qua SMTP!` 
      });
    } else {
      // Chưa có cấu hình SMTP -> Trả về bản mô phỏng chế độ xem trước HTML!
      const previewHtml = htmlContent.replace('src="cid:logo"', `src="${logoBase64}"`);
      return res.status(200).json({
        success: true,
        mode: 'simulation',
        message: `Hệ thống đang ở chế độ GIẢ LẬP (Chưa cấu hình SMTP trong file .env).`,
        previewHtml: previewHtml,
        recipient: customerEmail,
        subject: emailSubject
      });
    }

  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi email', error: err.message });
  }
}
