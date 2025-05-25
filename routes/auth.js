const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// ===== Đăng ký tài khoản user =====
router.post('/register', async (req, res) => {
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
      role: 'user' // Không còn approved nữa
    });

    res.status(201).json({ message: '✅ Tạo tài khoản thành công' });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

// ===== Đăng nhập user =====
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

module.exports = router;
