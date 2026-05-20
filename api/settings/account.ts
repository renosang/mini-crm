import dbConnect from '../_lib/dbConnect.ts';
import User from '../_models/User.ts';
import bcrypt from 'bcryptjs';

export default async function handler(req: any, res: any) {
    await dbConnect();
    const method = req.method;

    if (method === 'GET') {
        try {
            // Lấy thông tin admin (không trả password)
            const admin = await User.findOne({ role: 'admin' }).select('-password -resetCode -resetCodeExpires');
            if (!admin) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản admin' });
            }
            res.status(200).json({
                success: true,
                data: {
                    username: admin.username,
                    email: admin.email || '',
                    role: admin.role
                }
            });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin tài khoản', error: err.message });
        }
    } else if (method === 'POST') {
        const action = req.body.action;

        // ACTION: Cập nhật thông tin cá nhân
        if (action === 'update-profile') {
            try {
                const admin = await User.findOne({ role: 'admin' });
                if (!admin) {
                    return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản admin' });
                }

                const { email } = req.body;
                if (email !== undefined) admin.email = email;

                await admin.save();
                res.status(200).json({ success: true, message: 'Cập nhật thông tin thành công!' });
            } catch (err: any) {
                res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông tin', error: err.message });
            }
        }

        // ACTION: Đổi mật khẩu
        else if (action === 'change-password') {
            try {
                const admin = await User.findOne({ role: 'admin' }).select('+password');
                if (!admin) {
                    return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản admin' });
                }

                const { currentPassword, newPassword } = req.body;
                if (!currentPassword || !newPassword) {
                    return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
                }

                // Kiểm tra mật khẩu hiện tại
                const isMatch = await bcrypt.compare(currentPassword, admin.password);
                if (!isMatch) {
                    return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
                }

                if (newPassword.length < 6) {
                    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
                }

                admin.password = newPassword;
                await admin.save();
                res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công!' });
            } catch (err: any) {
                res.status(500).json({ success: false, message: 'Lỗi khi đổi mật khẩu', error: err.message });
            }
        }

        else {
            res.status(400).json({ success: false, message: 'Action không hợp lệ' });
        }
    } else {
        res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
    }
}
