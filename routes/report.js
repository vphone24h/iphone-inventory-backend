const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');

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

module.exports = router;
