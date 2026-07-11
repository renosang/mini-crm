import dbConnect from '../_lib/dbConnect.ts';
import Quotation from '../_models/Quotation.ts';
import Customer from '../_models/Customer.ts';
import Setting from '../_models/Setting.ts';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

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

export default async function handler(req: any, res: any) {
    const id = req.query.id;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu ID báo giá' });
    await dbConnect();
    const quotation = await Quotation.findById(id).populate('customer_id');
    if (!quotation) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    const customer = quotation.customer_id;
    if (!customer?.email) return res.status(400).json({ success: false, message: 'Khách không có email' });

    const bankSetting = await Setting.findOne({ key: 'bank' });
    let bankInfo: any = { bank_id: 'Sacombank', account_no: '060233251669', account_name: 'Nguyen Thanh Sang', bank_name: 'Sacombank' };
    if (bankSetting?.value) bankInfo = { ...bankInfo, ...bankSetting.value };

    const token = quotation.tracking_token || '';
    const appUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
    const confirmUrl = `${appUrl}/bao-gia/xac-nhan/${token}`;
    const trackOpenUrl = `${appUrl}/api/quotations/track-open?t=${token}`;
    const cleanBankId = bankInfo.bank_id.replace(/\s+/g, '');
    const cleanAccNo = bankInfo.account_no.replace(/\s+/g, '');
    const cleanAccName = encodeURIComponent(removeVietnameseTones(bankInfo.account_name).toUpperCase());
    const qrUrl = `https://img.vietqr.io/image/${cleanBankId}-${cleanAccNo}-compact2.png?amount=${quotation.grand_total}&addInfo=${encodeURIComponent('TT BG ' + id.toString().substring(18).toUpperCase())}&accountName=${cleanAccName}`;

    const itemsRows = quotation.items.map((it: any) =>
        `<tr><td style="padding:8px 10px;border-bottom:1px solid #E5E5EA;">${it.name}</td><td style="padding:8px 10px;border-bottom:1px solid #E5E5EA;text-align:center;">${it.quantity}</td><td style="padding:8px 10px;border-bottom:1px solid #E5E5EA;text-align:right;">${it.unit_price.toLocaleString('vi-VN')} đ</td><td style="padding:8px 10px;border-bottom:1px solid #E5E5EA;text-align:right;font-weight:600;">${(it.quantity * it.unit_price).toLocaleString('vi-VN')} đ</td></tr>`
    ).join('');

    let logoBase64 = '';
    const logoPath = path.join(process.cwd(), 'src/assets/logo.png');
    try { if (fs.existsSync(logoPath)) { logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`; } } catch { }

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Helvetica,Arial,sans-serif;background:#F5F5F7;margin:0;padding:24px 12px;">
<div style="max-width:640px;margin:0 auto;background:#FFF;border-radius:16px;overflow:hidden;border:1px solid #EEE;">
<div style="background:linear-gradient(135deg,#6B2737,#8B3A4F);padding:28px 20px;text-align:center;">
<div style="width:56px;height:56px;background:#FFF;border-radius:50%;margin:0 auto 10px;line-height:56px;">${logoBase64 ? '<img src="cid:logo" style="width:38px;height:38px;vertical-align:middle;">' : '<span style="color:#6B2737;font-size:22px;font-weight:700;">B</span>'}</div>
<p style="margin:0;color:#FFD9A0;font-size:11px;font-weight:700;letter-spacing:1.5px;">BÁO GIÁ DỊCH VỤ</p></div>
<div style="padding:24px 20px;">
<p style="margin:0 0 12px;font-size:15px;">Xin chào <strong>${customer.name}</strong>,</p>
<p style="margin:0 0 18px;font-size:13px;color:#515154;line-height:1.6;">Chúng tôi xin gửi báo giá chi tiết cho các dịch vụ bạn quan tâm:</p>
<h3 style="border-bottom:1px solid #E5E5EA;padding-bottom:6px;margin:0 0 12px;font-size:13px;color:#1D1D1F;">📋 CHI TIẾT BÁO GIÁ</h3>
<table style="width:100%;border-collapse:collapse;font-size:12px;">
<thead><tr style="background:#F5F5F7;font-weight:700;color:#6E6E73;"><td style="padding:8px 10px;">Sản phẩm</td><td style="padding:8px 10px;text-align:center;">SL</td><td style="padding:8px 10px;text-align:right;">Đơn giá</td><td style="padding:8px 10px;text-align:right;">Thành tiền</td></tr></thead>
<tbody>${itemsRows}</tbody>
<tfoot>
<tr><td colspan="3" style="padding:6px 10px;text-align:right;font-size:11px;color:#86868B;">Tạm tính</td><td style="padding:6px 10px;text-align:right;font-weight:600;font-size:11px;">${quotation.subtotal.toLocaleString('vi-VN')} đ</td></tr>
${quotation.discount_amount > 0 ? `<tr><td colspan="3" style="padding:6px 10px;text-align:right;font-size:11px;color:#D32F2F;">Giảm giá</td><td style="padding:6px 10px;text-align:right;color:#D32F2F;font-weight:600;font-size:11px;">-${quotation.discount_amount.toLocaleString('vi-VN')} đ</td></tr>` : ''}
${quotation.tax_amount > 0 ? `<tr><td colspan="3" style="padding:6px 10px;text-align:right;font-size:11px;color:#86868B;">VAT (${quotation.tax_rate}%)</td><td style="padding:6px 10px;text-align:right;font-weight:600;font-size:11px;">${quotation.tax_amount.toLocaleString('vi-VN')} đ</td></tr>` : ''}
${quotation.activation_fee > 0 ? `<tr><td colspan="3" style="padding:6px 10px;text-align:right;font-size:11px;color:#86868B;">Phí kích hoạt</td><td style="padding:6px 10px;text-align:right;font-weight:600;font-size:11px;">${quotation.activation_fee.toLocaleString('vi-VN')} đ</td></tr>` : ''}
<tr><td colspan="3" style="padding:8px 10px;text-align:right;font-weight:700;font-size:14px;border-top:2px solid #1D1D1F;">TỔNG CỘNG</td><td style="padding:8px 10px;text-align:right;font-weight:700;font-size:14px;border-top:2px solid #1D1D1F;color:#0071E3;">${quotation.grand_total.toLocaleString('vi-VN')} đ</td></tr></tfoot></table>
${quotation.customer_note ? `<div style="margin-top:12px;padding:12px;background:#FFFDF0;border-radius:8px;border:1px solid #FFEBB3;font-size:12px;color:#515154;"><strong>📝 Ghi chú:</strong> ${quotation.customer_note}</div>` : ''}
${quotation.expires_at ? `<p style="margin-top:12px;font-size:11px;color:#FF3B30;">⏰ Báo giá có hiệu lực đến: <strong>${new Date(quotation.expires_at).toLocaleDateString('vi-VN')}</strong></p>` : ''}
<div style="margin-top:20px;text-align:center;">
<a href="${confirmUrl}" target="_blank" style="display:inline-block;background:#0071E3;color:#FFF;padding:12px 32px;border-radius:99px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 16px rgba(0,113,227,0.3);">📩 Xem Chi Tiết & Xác Nhận Mua</a></div>
${quotation.terms ? `<div style="margin-top:18px;padding:14px;background:#FAFAFC;border-radius:8px;border:1px solid #E5E5EA;font-size:11px;color:#86868B;line-height:1.5;"><strong>📌 Điều khoản:</strong><br>${quotation.terms.replace(/\n/g, '<br>')}</div>` : ''}
<p style="margin-top:16px;font-size:11px;color:#86868B;text-align:center;">Nếu có thắc mắc, vui lòng liên hệ Hotline: 0962979214</p></div>
<div style="background:#F5F5F7;padding:16px;text-align:center;border-top:1px solid #E5E5EA;font-size:10px;color:#86868B;">© 2026 Beegadget.net</div>
<img src="${trackOpenUrl}" width="1" height="1" style="display:none;" alt="" /></div></body></html>`;

    const isPreview = req.query.preview === 'true';
    if (isPreview) {
        const prev = htmlContent.replace('src="cid:logo"', `src="${logoBase64}"`).replace(trackOpenUrl, '');
        return res.status(200).json({ success: true, mode: 'preview', previewHtml: prev, recipient: customer.email, subject: `Báo giá #${id.toString().substring(18).toUpperCase()}` });
    }

    quotation.status = 'sent';
    quotation.email_sent_at = new Date();
    await quotation.save();

    let smtpHost: any = process.env.SMTP_HOST, smtpPort: any = process.env.SMTP_PORT, smtpUser: any = process.env.SMTP_USER, smtpPass: any = process.env.SMTP_PASS, smtpFrom: any = process.env.SMTP_FROM || smtpUser;
    const smtpSetting = await Setting.findOne({ key: 'smtp' });
    if (smtpSetting?.value?.smtp_host && smtpSetting.value.smtp_user && smtpSetting.value.smtp_pass) {
        smtpHost = smtpSetting.value.smtp_host; smtpPort = String(smtpSetting.value.smtp_port);
        smtpUser = smtpSetting.value.smtp_user; smtpPass = smtpSetting.value.smtp_pass;
        smtpFrom = smtpSetting.value.smtp_from || smtpUser;
    }

    if (smtpHost && smtpUser && smtpPass) {
        const t = nodemailer.createTransport({ host: smtpHost, port: Number(smtpPort || 587), secure: Number(smtpPort) === 465, auth: { user: smtpUser, pass: smtpPass } });
        const atts: any[] = [];
        if (logoBase64 && fs.existsSync(logoPath)) atts.push({ filename: 'logo.png', path: logoPath, cid: 'logo' });
        await t.sendMail({ from: smtpFrom, to: customer.email, subject: `📋 [Beegadget.net] Báo giá dịch vụ - #${id.toString().substring(18).toUpperCase()}`, html: htmlContent, attachments: atts });
        res.status(200).json({ success: true, mode: 'smtp', message: `Đã gửi email báo giá đến ${customer.email}` });
    } else {
        const prev = htmlContent.replace('src="cid:logo"', `src="${logoBase64}"`).replace(trackOpenUrl, '');
        res.status(200).json({ success: true, mode: 'simulation', previewHtml: prev, recipient: customer.email, message: 'Chế độ giả lập' });
    }
}
