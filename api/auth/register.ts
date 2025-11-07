// Tạo file tại: api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../_lib/dbConnect';
import User from '../_models/User';

// Vercel sử dụng kiểu của Next.js cho API routes, 
// nên chúng ta dùng tạm NextApiRequest/NextApiResponse
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  await dbConnect();
  const { username, password } = req.body;

  try {
    // Ghi rõ role là 'admin'
    const user = await User.create({ username, password, role: 'admin' });
    res.status(201).json({ success: true, message: 'Admin user created!' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}