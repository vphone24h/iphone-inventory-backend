const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // ✅ Load biến môi trường
const bcrypt = require('bcryptjs');           // ✅ Thêm cho login
const jwt = require('jsonwebtoken');          // ✅ Thêm cho login
const Inventory = require('./models/Inventory'); // Model sản phẩm

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Tài khoản admin mặc định
const adminAccount = {
  email: 'admin@vphone.vn',
  password: bcrypt.hashSync('123456', 8) // Mật khẩu mã hoá
};

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Kết nối MongoDB thành công'))
  .catch(err => console.error('❌ Kết nối MongoDB lỗi:', err));

// API kiểm tra hoạt động
app.get('/', (req, res) => {
  res.send('🎉 Backend đang chạy!');
});

// ==================== API ĐĂNG NHẬP ADMIN ====================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (email !== adminAccount.email) {
    return res.status(401).json({ message: '❌ Tài khoản không đúng' });
  }

  const isMatch = await bcrypt.compare(password, adminAccount.password);
  if (!isMatch) {
    return res.status(401).json({ message: '❌ Mật khẩu sai' });
  }

  const token = jwt.sign({ email }, 'vphone_secret_key', { expiresIn: '1d' });

  res.json({
    message: '✅ Đăng nhập thành công',
    token
  });
});

// ==================== API NHẬP HÀNG ====================
app.post('/api/nhap-hang', async (req, res) => {
  try {
    const { imei, sku, price_import, product_name, import_date, supplier, branch, note } = req.body;

    const exists = await Inventory.findOne({ imei });
    if (exists) {
      return res.status(400).json({ message: '❌ IMEI này đã tồn tại trong kho.' });
    }

    const newItem = new Inventory({
      imei, sku, price_import, product_name, import_date, supplier, branch, note,
    });

    await newItem.save();

    res.status(201).json({
      message: '✅ Nhập hàng thành công!',
      item: newItem
    });
  } catch (error) {
    console.error('❌ Lỗi khi nhập hàng:', error.message);
    res.status(500).json({ message: '❌ Lỗi server khi nhập hàng', error: error.message });
  }
});

// ==================== API XUẤT HÀNG ====================
app.post('/api/xuat-hang', async (req, res) => {
  try {
    const { imei, price_sell } = req.body;

    const item = await Inventory.findOne({ imei });
    if (!item) {
      return res.status(404).json({ message: '❌ Không tìm thấy IMEI trong kho.' });
    }

    if (item.status === 'sold') {
      return res.status(400).json({ message: '⚠️ Máy này đã được bán trước đó.' });
    }

    item.status = 'sold';
    item.price_sell = price_sell;
    item.sold_date = new Date();

    await item.save();

    const profit = item.price_sell - item.price_import;

    res.status(200).json({ message: '✅ Xuất hàng thành công!', item, profit });
  } catch (error) {
    console.error('❌ Lỗi khi xuất hàng:', error.message);
    res.status(500).json({ message: '❌ Lỗi server khi xuất hàng', error: error.message });
  }
});

// ==================== API LẤY TỒN KHO ====================
app.get('/api/ton-kho', async (req, res) => {
  try {
    const items = await Inventory.find({ status: 'in_stock' });

    res.status(200).json({
      message: '✅ Danh sách máy còn tồn kho',
      total: items.length,
      items
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy tồn kho:', error.message);
    res.status(500).json({ message: '❌ Lỗi server khi lấy tồn kho', error: error.message });
  }
});

// ==================== API CẢNH BÁO TỒN KHO < 2 ====================
app.get('/api/canh-bao-ton-kho', async (req, res) => {
  try {
    const items = await Inventory.find({ status: 'in_stock' });

    const grouped = {};
    items.forEach((item) => {
      const key = item.sku + (item.branch || '');
      if (!grouped[key]) {
        grouped[key] = {
          sku: item.sku || 'Không rõ',
          tenSanPham: item.tenSanPham || item.product_name || 'Không rõ',
          branch: item.branch || 'Mặc định',
          totalImport: 0,
          totalSold: 0,
          totalRemain: 0,
          imeis: [],
        };
      }

      grouped[key].totalImport += 1;
      grouped[key].imeis.push(item.imei);
    });

    const result = Object.values(grouped)
      .map((g) => ({
        ...g,
        totalRemain: g.imeis.length,
      }))
      .filter((g) => g.totalRemain < 2);

    res.status(200).json({
      message: '✅ Danh sách hàng tồn kho thấp (dưới 2)',
      total: result.length,
      items: result
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách cảnh báo tồn kho:', error.message);
    res.status(500).json({ message: '❌ Lỗi server khi xử lý cảnh báo tồn kho', error: error.message });
  }
});

// ==================== KHỞI ĐỘNG SERVER ====================
app.listen(4000, () => {
  console.log('🚀 Server đang chạy tại http://localhost:4000');
});
