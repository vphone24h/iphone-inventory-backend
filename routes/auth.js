const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ===== Đăng ký tài khoản user mới =====
// Mặc định role = 'user', approved = false
// Không trả token ngay mà báo chờ admin phê duyệt
router.post('/admin-register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: '❌ Email và mật khẩu là bắt buộc' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: '❌ Email đã tồn tại' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      email,
      password: hashed,
      role: 'user',      // Luôn tạo user với role là user
      approved: false,   // Chờ admin duyệt
    });

    res.status(201).json({
      message: '✅ Tạo tài khoản thành công, vui lòng chờ admin phê duyệt',
    });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

// ===== Đăng nhập user thường =====
// Trả token có role = 'user'
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: '❌ Email không tồn tại' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: '❌ Mật khẩu sai' });
    }

    if (user.role !== 'user') {
      return res.status(403).json({ message: '❌ Chỉ user thường mới đăng nhập tại đây' });
    }

    if (!user.approved) {
      return res.status(403).json({ message: '⚠️ Tài khoản chưa được admin phê duyệt' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'vphone_secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: '✅ Đăng nhập thành công', token });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

// ===== Đăng nhập admin =====
// Trả token có role = 'admin'
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: '❌ Email không tồn tại' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: '❌ Mật khẩu sai' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: '❌ Chỉ admin mới được phép đăng nhập tại đây' });
    }

    if (!user.approved) {
      return res.status(403).json({ message: '⚠️ Tài khoản chưa được admin phê duyệt' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'vphone_secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: '✅ Đăng nhập thành công', token });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

// ===== API lấy danh sách user chưa duyệt =====
// Chỉ admin mới được phép gọi
router.get('/pending-users', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Lọc user có role là 'user' và chưa duyệt
    const pendingUsers = await User.find({ approved: false, role: 'user' });
    res.status(200).json(pendingUsers);
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

// ===== API duyệt user =====
// Chỉ admin mới được phép gọi
router.post('/approve-user/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { approved: true });
    res.status(200).json({ message: '✅ Đã duyệt user' });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

module.exports = router;
