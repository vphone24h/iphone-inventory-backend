const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Inventory = require('./models/Inventory');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const reportRoutes = require('./routes/report');
const branchRoutes = require('./routes/branch');
const categoryRoutes = require('./routes/category');
const congNoRoutes = require('./routes/congno');

const app = express();

const allowedOrigins = [
  'http://localhost:5174', // dev frontend
  'https://iphone-inventory-frontend.vercel.app', // frontend deploy thật
  // Thêm domain frontend khác nếu có
];

app.use(cors({
  origin: function(origin, callback) {
    // Cho phép request không có origin (Postman, mobile app)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      const msg = '❌ CORS bị chặn bởi backend: ' + origin;
      console.log(msg);
      return callback(new Error(msg), false);
    }
  },
  credentials: true,
}));

app.options('*', cors());

app.use(express.json());

// Mount các route
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cong-no', congNoRoutes);

// Các API khác...

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Kết nối MongoDB thành công'))
.catch(err => console.error('❌ Kết nối MongoDB lỗi:', err));

// Lắng nghe port từ biến môi trường (cần khi deploy)
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
