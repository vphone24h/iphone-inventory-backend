const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const { sendResetPasswordEmail } = require('../utils/mail'); // 👈 Thêm dòng này

// ==================== API: Báo cáo lợi nhuận ====================
router.get('/bao-cao-loi-nhuan', async (req, res) => {
  try {
    const soldItems = await Inventory.find({ status: 'sold' });

    const totalDevicesSold = soldItems.length;
    const totalRevenue = soldItems.reduce((sum, item) => sum + (item.giaBan || 0), 0);
    const totalCost = soldItems.reduce((sum, item) => sum + (item.giaNhap || 0), 0);
    const totalProfit = totalRevenue - totalCost;

    res.status(200).json({
      message: '✅ Báo cáo lợi nhuận',
      totalDevicesSold,
      totalRevenue,
      totalCost,
      totalProfit
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Lỗi khi lấy báo cáo lợi nhuận' });
  }
});

// ==================== API: Gửi email reset mật khẩu ====================
router.post('/send-reset-link', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: '❌ Vui lòng nhập email' });
  }

  try {
    const resetLink = `http://localhost:5173/reset-mat-khau?email=${encodeURIComponent(email)}`;
    await sendResetPasswordEmail(email, resetLink);

    res.status(200).json({ message: '✅ Đã gửi email đặt lại mật khẩu' });
  } catch (err) {
    console.error('❌ Gửi email lỗi:', err.message);
    res.status(500).json({ message: '❌ Gửi email thất bại', error: err.message });
  }
});

module.exports = router;
