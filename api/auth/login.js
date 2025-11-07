import dbConnect from '../../_lib/dbConnect';
import User from '../../_models/User';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  await dbConnect();

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập username và password' });
  }

  try {
    // Tìm user và chọn (select) cả trường password
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Username hoặc password không đúng' });
    }

    // So sánh password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Username hoặc password không đúng' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Token hết hạn sau 1 ngày
    );
    
    // Trả về token và thông tin user (trừ password)
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}