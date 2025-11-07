import dbConnect from '../_lib/dbConnect.ts';
import User from '../_models/User.ts';
import jwt from 'jsonwebtoken';

// SỬA LỖI: Thêm : any vào req và res
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  await dbConnect();

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập username và password' });
  }

  try {
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Username hoặc password không đúng' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Username hoặc password không đúng' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!, // Thêm ! để báo TS là biến này có tồn tại
      { expiresIn: '1d' }
    );
    
    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });

  } catch (error: any) { // SỬA LỖI: Thêm : any vào error
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}