import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    select: false, // Mặc định không trả về password khi query
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff',
  },
  email: {
    type: String,
    sparse: true,
  },
  // Forgot password fields
  resetCode: {
    type: String,
    select: false,
  },
  resetCodeExpires: {
    type: Date,
    select: false,
  },
});

// Hash password trước khi lưu
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Thêm phương thức để so sánh password
UserSchema.methods.comparePassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
