const express = require('express');
const User = require('../models/User');

const router = express.Router();

// API lấy danh sách user chưa duyệt
// Bỏ middleware, ai cũng có thể truy cập (nếu muốn bảo mật thì cần middleware khác)
router.get('/pending-users', async (req, res) => {
  try {
    const pendingUsers = await User.find({ approved: false, role: 'user' });
    res.status(200).json(pendingUsers);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách user chưa duyệt', error: error.message });
  }
});

// API phê duyệt user (cập nhật approved = true)
// Bỏ middleware, ai cũng có thể truy cập (nếu muốn bảo mật thì cần middleware khác)
router.post('/approve-user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    if (user.approved) {
      return res.status(400).json({ message: 'User đã được phê duyệt trước đó' });
    }

    user.approved = true;
    await user.save();

    res.status(200).json({ message: 'Phê duyệt user thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi phê duyệt user', error: error.message });
  }
});

module.exports = router;
