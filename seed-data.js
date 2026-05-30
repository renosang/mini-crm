import fs from 'fs';
import mongoose from 'mongoose';

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

console.log("Connecting to MongoDB for seeding...");
try {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully to MongoDB!");
} catch (e) {
  console.error("Connection failed:", e.message);
  process.exit(1);
}

// Import models
import Customer from './api/_models/Customer.ts';
import Account from './api/_models/Account.ts';
import Order from './api/_models/Order.ts';

async function seed() {
  try {
    // 1. Clear old test data (optional, but clean for test)
    console.log("Cleaning old Customer, Account, and Order collections...");
    await Customer.deleteMany({});
    await Account.deleteMany({});
    await Order.deleteMany({});

    console.log("Creating 5 sample customers...");
    
    const customersData = [
      {
        name: "Nguyễn Văn A",
        email: "nguyenvana@gmail.com",
        phone: "0901234567",
        source: "Zalo",
        zalo: "zalo.me/0901234567",
        facebook: "fb.com/nguyenvana.test",
        status: "VIP",
        notes: "Khách hàng mua key phần mềm thường xuyên, rất tiềm năng.",
        privateNotes: "Yêu cầu cung cấp proxy Việt Nam khi bàn giao tài khoản."
      },
      {
        name: "Trần Thị B",
        email: "tranthib@hotmail.com",
        phone: "0912345678",
        source: "Facebook",
        facebook: "fb.com/tranthib.test",
        telegram: "@tranthib_test",
        status: "Tiềm năng",
        notes: "Đang hỏi giá gói license Canva 1 năm.",
        privateNotes: "Cần tư vấn kỹ về chính sách bảo hành."
      },
      {
        name: "Lê Hoàng C",
        email: "lehoangc@yahoo.com",
        phone: "0923456789",
        source: "Giới thiệu",
        status: "Bình thường",
        notes: "Khách lẻ mua lẻ 1 slot Netflix.",
        privateNotes: "Không có ghi chú bảo mật."
      },
      {
        name: "Phạm Minh D",
        email: "phamminhd@outlook.com",
        phone: "0934567890",
        source: "Zalo",
        zalo: "zalo.me/0934567890",
        status: "VIP",
        notes: "Mua sỉ tài khoản Gmail cổ số lượng lớn.",
        privateNotes: "Khách tính nóng, cần xử lý đơn hàng nhanh."
      },
      {
        name: "Hoàng Thị E",
        email: "hoangthie@gmail.com",
        phone: "0945678901",
        source: "Google Search",
        status: "Cảnh báo",
        notes: "Từng có lịch sử báo lỗi sai để đòi back tiền.",
        privateNotes: "Kiểm tra kỹ thông tin tài khoản trước khi gửi."
      }
    ];

    const createdCustomers = await Customer.insertMany(customersData);
    console.log(`Created ${createdCustomers.length} customers successfully!`);

    console.log("Creating sample Accounts (Products) and linking to Customers...");
    const accountsData = [
      {
        product_type: "Netflix Premium 1 Month (Slot)",
        account_details: {
          username: "netflix_premium1@beegadget.net",
          password_acc: "netflixPass999",
          pin: "1234"
        },
        cost: 45000,
        resource_type: "slot",
        total_slots: 5,
        used_slots: 1,
        status: "available",
        slots_assigned: [
          {
            customer_id: createdCustomers[2]._id, // Lê Hoàng C
            assigned_email: createdCustomers[2].email,
            assigned_at: new Date()
          }
        ]
      },
      {
        product_type: "VinaPhone 4G 1 Year Key",
        account_details: {
          license_key: "VINA-4G-1Y-AAAA-BBBB-CCCC"
        },
        cost: 350000,
        resource_type: "key",
        status: "sold",
        customer_id: createdCustomers[0]._id, // Nguyễn Văn A
        sold_at: new Date(),
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      {
        product_type: "Youtube Premium 1 Year (Invite)",
        account_details: {
          username: "yt_premium_family@beegadget.net",
          password_acc: "youtubeAdminPass"
        },
        cost: 180000,
        resource_type: "slot",
        total_slots: 6,
        used_slots: 2,
        status: "available",
        slots_assigned: [
          {
            customer_id: createdCustomers[1]._id, // Trần Thị B
            assigned_email: createdCustomers[1].email,
            assigned_at: new Date()
          },
          {
            customer_id: createdCustomers[3]._id, // Phạm Minh D
            assigned_email: createdCustomers[3].email,
            assigned_at: new Date()
          }
        ]
      },
      {
        product_type: "ChatGPT Plus Shared Account",
        account_details: {
          username: "chatgpt_plus_temp@beegadget.net",
          password_acc: "gptPlusPassWord123"
        },
        cost: 90000,
        resource_type: "id_pass",
        status: "sold",
        customer_id: createdCustomers[0]._id, // Nguyễn Văn A
        sold_at: new Date(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        product_type: "Spotify Premium 3 Months Key",
        account_details: {
          license_key: "SPOTIFY-3M-KEYS-DDDD-EEEE"
        },
        cost: 60000,
        resource_type: "key",
        status: "available"
      }
    ];

    const createdAccounts = await Account.insertMany(accountsData);
    console.log(`Created ${createdAccounts.length} accounts successfully!`);

    console.log("Creating corresponding Orders...");
    const ordersData = [
      {
        customer_id: createdCustomers[0]._id, // Nguyễn Văn A
        accounts: [createdAccounts[1]._id, createdAccounts[3]._id], // VinaPhone Key & ChatGPT Plus
        total_amount: 550000, // Giá bán tổng
        status: "paid",
        order_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 ngày trước
      },
      {
        customer_id: createdCustomers[1]._id, // Trần Thị B
        accounts: [createdAccounts[2]._id], // Youtube Premium Slot
        total_amount: 250000,
        status: "pending",
        order_date: new Date() // Hôm nay
      },
      {
        customer_id: createdCustomers[2]._id, // Lê Hoàng C
        accounts: [createdAccounts[0]._id], // Netflix Premium Slot
        total_amount: 79000,
        status: "paid",
        order_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 ngày trước
      },
      {
        customer_id: createdCustomers[3]._id, // Phạm Minh D
        accounts: [createdAccounts[2]._id], // Youtube Premium Slot (chung account với Trần Thị B)
        total_amount: 240000,
        status: "paid",
        order_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 ngày trước
      }
    ];

    const createdOrders = await Order.insertMany(ordersData);
    console.log(`Created ${createdOrders.length} orders successfully!`);

    console.log("\n=============================================");
    console.log("🎉 SEEDING DATA COMPLETED SUCCESSFULLY!");
    console.log("=============================================\n");
  } catch (error) {
    console.error("Seeding data failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seed();
