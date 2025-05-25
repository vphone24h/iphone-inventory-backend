const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// ✅ Đăng ký tài khoản admin hoặc user (mặc định role = 'user', approved = false)
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

    // Tạo user mới với role mặc định là 'user' và approved false (phải được admin duyệt)
    const user = await User.create({ email, password: hashed, role: 'user', approved: false });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'vphone_secret_key',
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: '✅ Tạo tài khoản thành công', token });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

// ✅ Đăng nhập admin hoặc user
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

    // Kiểm tra tài khoản đã được duyệt chưa
    if (!user.approved) {
      return res.status(403).json({ message: '⚠️ Tài khoản chưa được duyệt' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'vphone_secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: '✅ Đăng nhập thành công', token });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

// ===== Bổ sung API lấy danh sách user chưa duyệt =====
router.get('/pending-users', async (req, res) => {
  try {
    const pendingUsers = await User.find({ approved: false });
    res.status(200).json(pendingUsers);
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

// ===== Bổ sung API duyệt user =====
router.post('/approve-user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { approved: true });
    res.status(200).json({ message: '✅ Đã duyệt user' });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

module.exports = router;
