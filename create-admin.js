require('dotenv').config(); // THÊM DÒNG NÀY Ở ĐẦU FILE!

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

// Thay thông tin email và mật khẩu bên dưới theo ý bạn!
const ADMIN_EMAIL = "vphone24h1@gmail.com";
const ADMIN_PASSWORD = "0985630451vU"; // Đổi sang mật khẩu mạnh!

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Kiểm tra xem admin đã tồn tại chưa
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log("❗️Admin đã tồn tại!");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = new User({
    email: ADMIN_EMAIL,
    password: hashedPassword,
    approved: true,
    role: "admin",
  });

  await admin.save();
  console.log("✅ Tạo tài khoản admin thành công!");
  process.exit(0);
}

createAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
