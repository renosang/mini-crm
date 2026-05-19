import dbConnect from '../_lib/dbConnect.ts';
import Order from '../_models/Order.ts';
import Account from '../_models/Account.ts';
import Customer from '../_models/Customer.ts';
import Setting from '../_models/Setting.ts';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { generateInvoicePDF } from '../_lib/generateInvoicePDF.ts';

function removeVietnameseTones(str: string): string {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  str = str.replace(/\u0300|\u0301|\u0309|\u0303|\u0323/g, "");
  str = str.replace(/\u02C6|\u0306|\u031B/g, "");
  return str;
}

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

    // Tải cấu hình ngân hàng chuyển khoản để hiển thị trong email
    const bankSetting = await Setting.findOne({ key: 'bank' });
    let bankInfo = {
      bank_id: 'Sacombank',
      account_no: '060233251669',
      account_name: 'Nguyễn Thanh Sang',
      bank_name: 'Sacombank'
    };
    if (bankSetting && bankSetting.value) {
      bankInfo = { ...bankInfo, ...bankSetting.value };
    }

    const cleanBankId = bankInfo.bank_id.replace(/\s+/g, '');
    const cleanAccountNo = bankInfo.account_no.replace(/\s+/g, '');
    const cleanAccountName = encodeURIComponent(removeVietnameseTones(bankInfo.account_name).toUpperCase());
    const orderNoStr = (id || accountId || 'Retail').toString().substring(18).toUpperCase();
    const addInfoText = `Thanh toan don hang ${orderNoStr}`;
    const addInfoStr = encodeURIComponent(addInfoText);

    const emailQrUrl = `https://img.vietqr.io/image/${cleanBankId}-${cleanAccountNo}-compact2.png?amount=${billingAmount}&addInfo=${addInfoStr}&accountName=${cleanAccountName}`;
    const paymentLink = emailQrUrl;

    // Tiêu đề email chuyên nghiệp động
    const emailSubject = isUnpaidInvoice
      ? `🔔 [Beegadget.net] Hóa đơn thanh toán dịch vụ - ${reminderTitle}`
      : `🔔 [Beegadget.net] Thông báo nhắc gia hạn bản quyền - ${reminderTitle}`;

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
          <!-- Header Red Fire Theme -->
          <div class="header-bar" style="background-color: #6B2737; padding: 28px 24px; text-align: center; border-bottom: 1px solid rgba(0, 0, 0, 0.08); color: #FFFFFF;">
            ${logoBase64 ? `<img src="cid:logo" alt="Logo" style="max-height: 42px; display: block; margin: 0 auto;" />` : `<h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; color: #FFFFFF;">BEEGADGET.NET</h1>`}
            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">${headerSubtitle}</p>
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

            <!-- Thanh toán & Thông tin chuyển khoản -->
            <div style="margin-top: 20px; padding: 24px; background-color: #FFFDF0; border: 1px solid #FFEBB3; border-radius: 16px; text-align: center;">
              <p style="margin:0 0 6px 0; font-size:13px; color:#515154; font-weight:600;">${isUnpaidInvoice ? 'Số tiền cần thanh toán:' : 'Số tiền cần thanh toán gia hạn:'}</p>
              <h2 style="margin:0 0 16px 0; color:#D27B00; font-size:26px; font-weight:700;">${billingAmount.toLocaleString('vi-VN')} đ</h2>
              
              <!-- Khung Thông tin chuyển khoản & VietQR -->
              <div style="display: inline-block; text-align: left; background: #FFFFFF; border: 1px solid #E5E5EA; border-radius: 12px; padding: 16px; max-width: 320px; margin: 0 auto 16px auto; width: 100%; box-sizing: border-box;">
                <div style="font-size: 11px; font-weight: 700; color: #86868B; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">THÔNG TIN CHUYỂN KHOẢN</div>
                
                <!-- VietQR Image -->
                <div style="margin: 0 auto 12px auto; padding: 6px; border: 1px solid #E5E5EA; border-radius: 8px; background-color: #FFFFFF; width: 160px; height: 160px;">
                  <img src="${emailQrUrl}" alt="Mã VietQR" style="width: 160px; height: 160px; display: block;" />
                </div>
                
                <div style="font-size: 12px; line-height: 1.6; border-top: 1px dashed #E5E5EA; padding-top: 10px; color: #1D1D1F;">
                  <div style="margin-bottom: 4px;">Ngân hàng: <strong>${bankInfo.bank_name} (${bankInfo.bank_id})</strong></div>
                  <div style="margin-bottom: 4px;">Số tài khoản: <strong style="font-size: 13px; color: #0071E3;">${bankInfo.account_no}</strong></div>
                  <div style="margin-bottom: 4px;">Chủ tài khoản: <strong>${bankInfo.account_name.toUpperCase()}</strong></div>
                  <div>Nội dung CK: <strong style="color: #D27B00;">${addInfoText}</strong></div>
                </div>
              </div>
              
              <div style="margin-top: 8px;">
                <a href="${paymentLink}" target="_blank" style="display:inline-block; background-color:#0071E3; color:#FFFFFF; padding:11px 28px; border-radius:99px; text-decoration:none; font-weight:600; font-size:13px; box-shadow: 0 4px 12px rgba(0, 113, 227, 0.25);">
                  ${buttonText} qua App Ngân Hàng
                </a>
              </div>
            </div>

            <p style="font-size: 12px; line-height: 1.5; color: #86868B; margin: 20px 0 0 0; text-align: center;">
              Nếu bạn đã gia hạn hoặc thanh toán trước đó, xin vui lòng bỏ qua email này. Xin chân thành cảm ơn!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #F5F5F7; padding: 20px; text-align: center; border-top: 1px solid #E5E5EA; color: #86868B; font-size: 11px;">
            <p style="margin: 0 0 4px 0;">© 2026 Beegadget.net. All rights reserved.</p>
            <p style="margin: 0;">Bạn nhận được email này vì đã đăng ký mua bản quyền dịch vụ tại Beegadget.net.</p>
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
    let smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"Beegadget.net" <${smtpUser}>` : '');

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

    const isRenewal = !isUnpaidInvoice;
    const showTransferInPDF = isUnpaidInvoice || isRenewal;

    // Sinh hóa đơn PDF Apple Style
    const pdfBuffer = await generateInvoicePDF(
      customer, 
      accountsToRemind, 
      billingAmount, 
      showTransferInPDF, 
      id || accountId,
      isRenewal
    );
    const pdfBase64 = pdfBuffer.toString('base64');

    // Nếu yêu cầu xem trước trước khi gửi thực tế -> Thế src="cid:logo" bằng Base64 để hiển thị trong React Modal preview
    if (req.query.preview === 'true' || req.body?.preview === true) {
      const previewHtml = htmlContent.replace('src="cid:logo"', `src="${logoBase64}"`);
      return res.status(200).json({
        success: true,
        mode: 'preview',
        message: 'Bản xem trước hóa đơn được tạo thành công.',
        previewHtml: previewHtml,
        recipient: customerEmail,
        subject: emailSubject,
        pdfBase64: pdfBase64
      });
    }

    const attachments = [
      ...(logoBase64 && fs.existsSync(logoPath) ? [{
        filename: 'logo.png',
        path: logoPath,
        cid: 'logo'
      }] : []),
      {
        filename: `Hoa_Don_Beegadget_${(id || accountId || 'Retail').toString().substring(18).toUpperCase()}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];

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
        message: `Đã gửi email nhắc gia hạn thành công kèm Hóa đơn PDF đến địa chỉ ${customerEmail} qua SMTP!`,
        pdfBase64: pdfBase64
      });
    } else {
      // Chưa có cấu hình SMTP -> Trả về bản mô phỏng chế độ xem trước HTML!
      const previewHtml = htmlContent.replace('src="cid:logo"', `src="${logoBase64}"`);
      return res.status(200).json({
        success: true,
        mode: 'simulation',
        message: `Hệ thống đang ở chế độ GIẢ LẬP (Chưa cấu hình SMTP trong file .env). Đã tạo hóa đơn PDF thành công!`,
        previewHtml: previewHtml,
        recipient: customerEmail,
        subject: emailSubject,
        pdfBase64: pdfBase64
      });
    }

  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi email', error: err.message });
  }
}
