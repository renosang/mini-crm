import dbConnect from '../_lib/dbConnect.ts';
import User from '../_models/User.ts';
import bcrypt from 'bcryptjs';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    await dbConnect();

    const { username, resetCode, newPassword } = req.body;

    if (!username || !resetCode || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    try {
        // Find user and include reset fields
        const user = await User.findOne({
            $or: [
                { username: username.trim() },
                { email: username.trim() }
            ]
        }).select('+password +resetCode +resetCodeExpires');

        if (!user) {
            return res.status(404).json({ message: 'Tài khoản không tồn tại' });
        }

        // Check if reset code exists and is valid
        if (!user.resetCode || !user.resetCodeExpires) {
            return res.status(400).json({ message: 'Chưa có yêu cầu đặt lại mật khẩu nào. Vui lòng yêu cầu mã xác nhận trước.' });
        }

        // Check if code is expired
        if (new Date() > new Date(user.resetCodeExpires)) {
            // Clear expired code
            user.resetCode = undefined;
            user.resetCodeExpires = undefined;
            await user.save();
            return res.status(400).json({ message: 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới.' });
        }

        // Verify the reset code
        if (user.resetCode !== resetCode) {
            return res.status(400).json({ message: 'Mã xác nhận không chính xác. Vui lòng kiểm tra lại.' });
        }

        // Set the new password (Mongoose pre('save') hook will hash it automatically)
        user.password = newPassword;

        // Clear reset fields
        user.resetCode = undefined;
        user.resetCodeExpires = undefined;

        await user.save();

        console.log(`[Reset Password] Password reset successful for ${username}`);

        res.status(200).json({
            success: true,
            message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập với mật khẩu mới.',
        });

    } catch (error: any) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
}
