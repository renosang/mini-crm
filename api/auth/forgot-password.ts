import dbConnect from '../_lib/dbConnect.ts';
import User from '../_models/User.ts';
import Setting from '../_models/Setting.ts';
import nodemailer from 'nodemailer';

// Generate a random 6-digit reset code
function generateResetCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    await dbConnect();

    const { username, email } = req.body;

    if (!username) {
        return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập hoặc email' });
    }

    try {
        // Find user by username or email
        const user = await User.findOne({
            $or: [
                { username: username.trim() },
                { email: username.trim() }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'Tài khoản không tồn tại trong hệ thống' });
        }

        // Determine the email recipient
        let emailRecipient = user.email;

        if (!emailRecipient) {
            // User does not have a registered email
            if (email && email.trim().includes('@')) {
                emailRecipient = email.trim();
                user.email = emailRecipient;
            } else if (username.trim().includes('@')) {
                emailRecipient = username.trim();
                user.email = emailRecipient;
            } else {
                // If they haven't provided an email, return a prompt to enter their email!
                return res.status(200).json({
                    success: false,
                    needEmail: true,
                    message: 'Tài khoản của bạn chưa được liên kết email. Vui lòng nhập email của bạn để nhận mã xác nhận.'
                });
            }
        }

        // Generate 6-digit reset code
        const resetCode = generateResetCode();

        // Save code to user document with 5 minutes expiry
        user.resetCode = resetCode;
        user.resetCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await user.save();

        // Load SMTP config
        let smtpHost = process.env.SMTP_HOST;
        let smtpPort = process.env.SMTP_PORT;
        let smtpUser = process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASS;
        let smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"Mini CRM" <${smtpUser}>` : '');

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

        // If user doesn't have an email, fallback to the SMTP user so the administrator can receive/test it
        if (!emailRecipient) {
            emailRecipient = smtpUser || 'admin@example.com';
        }

        const isSMTPConfigured = smtpHost && smtpUser && smtpPass;
        let mailSent = false;
        let errorMessage = '';

        if (isSMTPConfigured) {
            try {
                const transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: Number(smtpPort || 587),
                    secure: Number(smtpPort) === 465,
                    auth: {
                        user: smtpUser,
                        pass: smtpPass
                    }
                });

                const htmlContent = `
                    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #E5E5EA; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); background-color: #ffffff;">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <h2 style="color: #be123c; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Mini CRM</h2>
                            <p style="color: #86868B; margin: 4px 0 0 0; font-size: 14px;">Yêu cầu đặt lại mật khẩu</p>
                        </div>
                        <div style="border-top: 1px solid #E5E5EA; padding-top: 25px; color: #1D1D1F; font-size: 15px; line-height: 1.6;">
                            <p>Xin chào <strong>${username}</strong>,</p>
                            <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn trên hệ thống Mini CRM.</p>
                            <div style="background-color: #FFF5F5; border: 1px solid #FFD7D5; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                                <span style="font-size: 13px; color: #E11D48; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">Mã xác nhận của bạn</span>
                                <strong style="font-size: 32px; color: #be123c; font-family: 'SF Mono', monospace; letter-spacing: 6px; display: block; line-height: 1;">${resetCode}</strong>
                            </div>
                            <p style="color: #86868B; font-size: 13px; margin-top: 20px;">* Lưu ý: Mã này có hiệu lực trong vòng <strong>5 phút</strong>. Nếu không yêu cầu thay đổi mật khẩu, bạn có thể bỏ qua email này.</p>
                        </div>
                        <div style="border-top: 1px solid #F2F2F7; margin-top: 30px; padding-top: 20px; text-align: center; color: #A1A1A6; font-size: 11px;">
                            <p style="margin: 0 0 4px 0;">Mini CRM System v1.0 &copy; ${new Date().getFullYear()}</p>
                        </div>
                    </div>
                `;

                await transporter.sendMail({
                    from: smtpFrom,
                    to: emailRecipient,
                    subject: '🔑 [Mini CRM] Mã xác nhận đặt lại mật khẩu',
                    html: htmlContent
                });
                mailSent = true;
            } catch (err: any) {
                console.error('SMTP Send mail error:', err);
                errorMessage = err.message;
            }
        }

        if (mailSent) {
            res.status(200).json({
                success: true,
                message: `Mã xác nhận đã được gửi thành công đến email: ${emailRecipient}. Vui lòng kiểm tra hộp thư.`,
                resetCode
            });
        } else {
            // Simulation mode
            res.status(200).json({
                success: true,
                message: `Hệ thống đang chạy chế độ giả lập hoặc gửi mail lỗi (${errorMessage || 'Chưa cấu hình SMTP'}). Mã xác nhận là: ${resetCode}`,
                resetCode
            });
        }

    } catch (error: any) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
}
