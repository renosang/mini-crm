import fs from 'fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Read env file (.env.local or .env)
let envContent;
let envPath = './.env.local';
try {
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else {
    envPath = './.env';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else {
      throw new Error("No env file found");
    }
  }
} catch (e) {
  console.error("Failed to read environment file:", e.message);
  process.exit(1);
}

const match = envContent.match(/^\s*MONGODB_URI=["']?([^"'\r\n]+)["']?/m);
if (!match) {
  console.error(`MONGODB_URI not found in ${envPath}`);
  process.exit(1);
}
const MONGODB_URI = match[1].trim();


let connected = false;
console.log("Connecting to MongoDB from env...");
try {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully to env MONGODB_URI!");
  connected = true;
} catch (e) {
  console.log("Connection to env MONGODB_URI failed:", e.message);
}

if (!connected) {
  const LOCAL_URI = "mongodb://127.0.0.1:27017/mini-crm";
  console.log(`Trying fallback to local MongoDB: ${LOCAL_URI}...`);
  try {
    await mongoose.connect(LOCAL_URI);
    console.log("Connected successfully to local MongoDB!");
    connected = true;
  } catch (e) {
    console.error("Local connection failed:", e.message);
    process.exit(1);
  }
}

import User from './api/_models/User.ts';

const args = process.argv.slice(2);
if (args[0] === 'reset') {
  const username = args[1];
  const newPassword = args[2];
  if (!username || !newPassword) {
    console.log("Usage: node manage-users.js reset <username> <newPassword>");
    process.exit(1);
  }
  const user = await User.findOne({ username });
  if (!user) {
    console.error(`User '${username}' not found.`);
    process.exit(1);
  }
  user.password = newPassword;
  await user.save();
  console.log(`Successfully reset password for user '${username}' to '${newPassword}'`);
} else if (args[0] === 'create') {
  const username = args[1];
  const password = args[2];
  const role = args[3] || 'admin';
  if (!username || !password) {
    console.log("Usage: node manage-users.js create <username> <password> [role]");
    process.exit(1);
  }
  await User.create({ username, password, role });
  console.log(`Successfully created user '${username}' with role '${role}'`);
} else {
  const users = await User.find({});
  console.log("\n=== DANH SÁCH TÀI KHOẢN (USER LIST) ===");
  if (users.length === 0) {
    console.log("Không có tài khoản nào trong database.");
  } else {
    users.forEach((u, i) => {
      console.log(`${i + 1}. Username: ${u.username} | Role: ${u.role} | ID: ${u._id}`);
    });
  }
  console.log("======================================\n");
}

await mongoose.disconnect();
