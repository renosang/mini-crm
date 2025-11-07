import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// (Chúng ta sẽ di chuyển check 'if' từ đây...
//  ...xuống bên trong hàm dbConnect)

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // === SỬA LỖI TS2345: Di chuyển kiểm tra vào đây ===
  // Kiểm tra này đảm bảo MONGODB_URI là 'string' trước khi dùng
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local or Vercel config'
    );
  }
  // ===========================================

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    // Bây giờ TypeScript đã biết MONGODB_URI là 1 string
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;