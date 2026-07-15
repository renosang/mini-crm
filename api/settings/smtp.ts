import dbConnect from '../_lib/dbConnect.ts';
import Setting from '../_models/Setting.ts';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export default async function handler(req: any, res: any) {
  await dbConnect();
  
  const method = req.method;

  if (method === 'GET') {
    try {
      const setting = await Setting.findOne({ key: 'smtp' });
      if (!setting) {
        return res.status(200).json({
          success: true,
          data: {
            smtp_host: 'smtp.gmail.com',
            smtp_port: 587,
            smtp_user: '',
            smtp_pass: '',
            smtp_from: ''
          }
        });
      }
      res.status(200).json({ success: true, data: setting.value });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy cấu hình SMTP', error: err.message });
    }
  } else if (method === 'POST') {
    const { action } = req.body;
    
    // ACTION 1: Gửi email kiểm tra kết nối SMTP
    if (action === 'test') {
      const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, test_recipient } = req.body;
      
      if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass || !test_recipient) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin SMTP và Email người nhận thử nghiệm' });
      }

      try {
        const transporter = nodemailer.createTransport({
          host: smtp_host,
          port: Number(smtp_port),
          secure: Number(smtp_port) === 465,
          auth: {
            user: smtp_user,
            pass: smtp_pass
          },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 8000
        });

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

        await transporter.sendMail({
          from: smtp_from || `"Mini CRM Test" <${smtp_user}>`,
          to: test_recipient,
          subject: '🔔 [MINI CRM] Thư Kiểm Tra Kết Nối SMTP Gmail Thành Công!',
          html: `
            <div style="font-family: sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #E5E5EA; border-radius: 16px; text-align: center;">
              ${logoBase64 ? `<img src="cid:logo" alt="Logo" style="max-height: 40px; display: block; margin: 0 auto 16px auto;" />` : `<h2 style="color: #34C759; margin-top: 0;">🎉 MINI CRM</h2>`}
              <h2 style="color: #34C759; margin-top: 0;">🎉 Kết Nối SMTP Thành Công!</h2>
              <p style="text-align: left; font-size: 14px; line-height: 1.6; color: #3A3A3C;">Xin chúc mừng! Hệ thống đã kết nối và gửi email thành công qua máy chủ SMTP Gmail của bạn.</p>
              <hr style="border: none; border-top: 1px solid #E5E5EA; margin: 16px 0;" />
              <p style="font-size: 12px; color: #86868B; text-align: center;">Email này được gửi tự động để kiểm thử cấu hình gửi thư trong hệ thống.</p>
            </div>
          `,
          attachments: logoBase64 && fs.existsSync(logoPath) ? [{
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo'
          }] : []
        });

        return res.status(200).json({ success: true, message: `Gửi email kiểm thử thành công đến ${test_recipient}!` });
      } catch (err: any) {
        console.error(err);
        return res.status(500).json({ success: false, message: `Kết nối SMTP thất bại: ${err.message}` });
      }
    }

    // ACTION 2: Lưu cấu hình SMTP
    try {
      const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from } = req.body;
      
      if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin cấu hình' });
      }

      const smtpConfig = {
        smtp_host,
        smtp_port: Number(smtp_port),
        smtp_user,
        smtp_pass,
        smtp_from: smtp_from || smtp_user
      };

      const setting = await Setting.findOneAndUpdate(
        { key: 'smtp' },
        { value: smtpConfig },
        { new: true, upsert: true }
      );

      res.status(200).json({ success: true, message: 'Lưu cấu hình SMTP thành công!', data: setting.value });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật cấu hình SMTP', error: err.message });
    }
  } else {
    res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
  }
}
