import dbConnect from './dbConnect.ts';
import Order from '../_models/Order.ts';
import Account from '../_models/Account.ts';
import Customer from '../_models/Customer.ts';
import Setting from '../_models/Setting.ts';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { generateInvoicePDF } from './generateInvoicePDF.ts';

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
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  str = str.replace(/\u0300|\u0301|\u0309|\u0303|\u0323/g, "");
  str = str.replace(/\u02C6|\u0306|\u031B/g, "");
  return str;
}

export interface ISendEmailResult {
  success: boolean;
  mode: 'smtp' | 'simulation' | 'preview';
  message: string;
  previewHtml?: string;
  recipient?: string;
  subject?: string;
  pdfBase64?: string;
}

export async function sendInvoiceEmail({
  orderId,
  accountId,
  customerId,
  isPreview
}: {
  orderId?: string | null;
  accountId?: string | null;
  customerId?: string | null;
  isPreview: boolean;
}): Promise<ISendEmailResult> {
  await dbConnect();
  
  if (!orderId && !accountId) {
    throw new Error('Thiếu ID đơn hàng hoặc ID tài khoản để gửi nhắc nhở');
  }

  let customer: any = null;
  let accountsToRemind: any[] = [];
  let billingAmount = 0;
  let reminderTitle = '';
  let isUnpaidInvoice = false;
  let isPaidConfirmation = false;
  
  if (orderId) {
    // 1. Nhắc nhở theo đơn hàng
    const order = await Order.findById(orderId).populate('customer_id').populate('accounts');
    if (!order) {
      throw new Error('Không tìm thấy đơn hàng');
    }
    customer = order.customer_id;
    accountsToRemind = order.accounts || [];
    billingAmount = order.total_amount || 0;
    reminderTitle = `Đơn hàng #${orderId.toString().substring(18).toUpperCase()}`;
    if (order.status === 'pending') {
      isUnpaidInvoice = true;
    } else if (order.status === 'paid') {
      isPaidConfirmation = true;
    }
  } else {
    // 2. Nhắc nhở trực tiếp cho tài khoản đơn lẻ
    const account = await Account.findById(accountId).populate('customer_id');
    if (!account) {
      throw new Error('Không tìm thấy tài nguyên');
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
    throw new Error('Không tìm thấy thông tin khách hàng');
  }

  const customerEmail = customer.email;
  if (!customerEmail) {
    throw new Error('Khách hàng này không có Email. Vui lòng cập nhật email của họ trong danh sách khách hàng trước.');
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
  const orderNoStr = (orderId || accountId || 'Retail').toString().substring(18).toUpperCase();
  const addInfoText = `Thanh toan don hang ${orderNoStr}`;
  const addInfoStr = encodeURIComponent(addInfoText);

  const emailQrUrl = `https://img.vietqr.io/image/${cleanBankId}-${cleanAccountNo}-compact2.png?amount=${billingAmount}&addInfo=${addInfoStr}&accountName=${cleanAccountName}`;
  const paymentLink = emailQrUrl;

  // Tiêu đề email chuyên nghiệp động
  let emailSubject: string;
  if (isPaidConfirmation) {
    emailSubject = `✅ [Beegadget.net] Xác nhận thanh toán & cập nhật hạn sử dụng - ${reminderTitle}`;
  } else if (isUnpaidInvoice) {
    emailSubject = `🔔 [Beegadget.net] Hóa đơn thanh toán dịch vụ - ${reminderTitle}`;
  } else {
    emailSubject = `🔔 [Beegadget.net] Thông báo nhắc gia hạn bản quyền - ${reminderTitle}`;
  }

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
          <li><strong>Hạn sử dụng mới:</strong> <span style="color:#2E7D32;font-weight:600;">${validUntilStr}</span></li>
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

  let headerSubtitle: string;
  let bodyDescription: string;
  if (isPaidConfirmation) {
    headerSubtitle = 'XÁC NHẬN THANH TOÁN & GIA HẠN DỊCH VỤ';
    bodyDescription = 'Cảm ơn bạn đã thanh toán gia hạn dịch vụ! Chúng tôi xác nhận đã nhận được thanh toán của bạn. Dưới đây là thông tin cập nhật hạn sử dụng mới cho các gói bản quyền:';
  } else if (isUnpaidInvoice) {
    headerSubtitle = 'THANH TOÁN & BÀN GIAO DỊCH VỤ';
    bodyDescription = 'Chúng tôi xin gửi thông tin bàn giao chi tiết cho các gói dịch vụ bạn đã đăng ký. Vui lòng hoàn tất thanh toán để kích hoạt dịch vụ hoạt động chính thức:';
  } else {
    headerSubtitle = 'THÔNG BÁO HÓA ĐƠN GIA HẠN BẢN QUYỀN';
    bodyDescription = 'Cảm ơn bạn đã lựa chọn tin dùng dịch vụ của chúng tôi. Chúng tôi xin gửi thông báo hóa đơn gia hạn và ngày sử dụng mới cho các gói bản quyền của bạn:';
  }

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
        <!-- Header Burgundy Theme - Email Compatible -->
        <div style="background: linear-gradient(135deg, #6B2737 0%, #8B3A4F 100%); padding: 32px 24px 28px; text-align: center; border-bottom: 3px solid rgba(255,193,120,0.25);">
          <div style="width: 64px; height: 64px; background: #FFFFFF; border-radius: 50%; margin: 0 auto 14px auto; line-height: 64px; text-align: center; overflow: hidden; border: 2px solid rgba(255,255,255,0.4);">
            ${logoBase64 ? `<img src="cid:logo" alt="Logo" style="width: 44px; height: 44px; display: block; margin: 10px auto 0; object-fit: contain;" />` : `<span style="color:#6B2737;font-size:24px;font-weight:700;line-height:64px;">B</span>`}
          </div>
          <p style="margin: 0; color: #FFD9A0; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">${headerSubtitle}</p>
        </div>
        
        <!-- Body -->
        <div class="body-padding" style="padding: 32px 24px;">
          <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px 0;">Xin chào <strong>${customer.name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #515154; margin: 0 0 20px 0;">
            ${bodyDescription}
          </p>

          <h3 style="border-bottom: 1px solid #E5E5EA; padding-bottom: 8px; margin: 0 0 16px 0; color: #1D1D1F; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">
            📦 CHI TIẾT DỊCH VỤ ${isPaidConfirmation ? 'ĐÃ GIA HẠN' : 'ĐƯỢC GIA HẠN'}:
          </h3>
          
          ${accountRows}

          ${isPaidConfirmation ? `
          <!-- Xác nhận đã thanh toán -->
          <div style="margin-top: 20px; padding: 24px; background-color: #F0F9F1; border: 1px solid #C2E7C6; border-radius: 16px; text-align: center;">
            <div style="width: 48px; height: 48px; background: #34C759; border-radius: 50%; margin: 0 auto 12px auto; line-height: 48px; text-align: center;">
              <span style="color: #FFFFFF; font-size: 24px;">✓</span>
            </div>
            <p style="margin:0 0 6px 0; font-size:13px; color:#2E7D32; font-weight:700; text-transform: uppercase; letter-spacing: 0.5px;">ĐÃ THANH TOÁN THÀNH CÔNG</p>
            <h2 style="margin:0 0 8px 0; color:#2E7D32; font-size:26px; font-weight:700;">${billingAmount.toLocaleString('vi-VN')} đ</h2>
            <p style="margin:0; font-size:12px; color:#515154;">Hóa đơn gia hạn đã được xác nhận. Dịch vụ của bạn đã được kích hoạt lại với hạn sử dụng mới.</p>
          </div>

          <p style="font-size: 12px; line-height: 1.5; color: #86868B; margin: 20px 0 0 0; text-align: center;">
            Cảm ơn bạn đã tin tưởng sử dụng dịch vụ. Nếu có bất kỳ thắc mắc nào, xin hãy liên hệ với chúng tôi!
          </p>
          ` : `
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
                ${isUnpaidInvoice ? 'Thanh Toán' : 'Thanh Toán Gia Hạn'} qua App Ngân Hàng
              </a>
            </div>
          </div>

          <p style="font-size: 12px; line-height: 1.5; color: #86868B; margin: 20px 0 0 0; text-align: center;">
            Nếu bạn đã gia hạn hoặc thanh toán trước đó, xin vui lòng bỏ qua email này. Xin chân thành cảm ơn!
          </p>
          `}
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
    (orderId || accountId || undefined),
    isRenewal
  );
  const pdfBase64 = pdfBuffer.toString('base64');

  // Nếu yêu cầu xem trước trước khi gửi thực tế
  if (isPreview) {
    const previewHtml = htmlContent.replace('src="cid:logo"', `src="${logoBase64}"`);
    return {
      success: true,
      mode: 'preview',
      message: 'Bản xem trước hóa đơn được tạo thành công.',
      previewHtml: previewHtml,
      recipient: customerEmail,
      subject: emailSubject,
      pdfBase64: pdfBase64
    };
  }

  const attachments = [
    ...(logoBase64 && fs.existsSync(logoPath) ? [{
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo'
    }] : []),
    {
      filename: `Hoa_Don_Beegadget_${(orderId || accountId || 'Retail').toString().substring(18).toUpperCase()}.pdf`,
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

    return { 
      success: true, 
      mode: 'smtp',
      message: `Đã gửi email nhắc gia hạn thành công kèm Hóa đơn PDF đến địa chỉ ${customerEmail} qua SMTP!`,
      pdfBase64: pdfBase64
    };
  } else {
    // Chưa có cấu hình SMTP -> Trả về bản mô phỏng chế độ xem trước HTML!
    const previewHtml = htmlContent.replace('src="cid:logo"', `src="${logoBase64}"`);
    return {
      success: true,
      mode: 'simulation',
      message: `Hệ thống đang ở chế độ GIẢ LẬP (Chưa cấu hình SMTP trong file .env). Đã tạo hóa đơn PDF thành công!`,
      previewHtml: previewHtml,
      recipient: customerEmail,
      subject: emailSubject,
      pdfBase64: pdfBase64
    };
  }
}
