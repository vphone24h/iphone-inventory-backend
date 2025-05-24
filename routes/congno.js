const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');

// 1. Lấy danh sách khách hàng còn công nợ (Tổng hợp theo customer_name)
router.get('/cong-no-list', async (req, res) => {
  try {
    // Chỉ lấy những đơn hàng đã xuất và còn nợ > 0, có tên khách hàng
    const debts = await Inventory.aggregate([
      { $match: { debt: { $gt: 0 }, status: "sold", customer_name: { $ne: null, $ne: "" } } },
      {
        $group: {
          _id: "$customer_name",
          total_debt: { $sum: "$debt" }
        }
      },
      { $sort: { total_debt: -1 } },
      { $project: { customer_name: "$_id", total_debt: 1, _id: 0 } }
    ]);
    res.json({ items: debts });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server khi lấy công nợ', error: err.message });
  }
});

// 2. Lấy danh sách đơn còn nợ của 1 khách hàng
router.get('/cong-no-orders', async (req, res) => {
  const { customer_name } = req.query;
  if (!customer_name) return res.status(400).json({ message: "Thiếu tên khách hàng" });
  try {
    const orders = await Inventory.find({
      customer_name,
      status: "sold",
      debt: { $gt: 0 }
    }).sort({ sold_date: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server khi lấy đơn nợ', error: err.message });
  }
});

// 3. Trừ nợ cho từng đơn hàng (trả nợ từng phần)
router.put('/cong-no-pay/:id', async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount)) return res.status(400).json({ message: "Thiếu số tiền trả" });
  try {
    const order = await Inventory.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn nợ" });

    // Đảm bảo số tiền trả không lớn hơn số nợ hiện tại
    const tra = Number(amount);
    if (tra <= 0) return res.status(400).json({ message: "Số tiền trả phải > 0" });
    if ((order.debt || 0) <= 0) return res.status(400).json({ message: "Đơn này không còn công nợ" });

    // Cập nhật trường đã trả và còn nợ
    order.da_tra = (order.da_tra || 0) + tra;
    order.debt = Math.max((order.debt || 0) - tra, 0);

    await order.save();
    res.json({ message: "Đã cập nhật công nợ!", order });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server khi cập nhật nợ', error: err.message });
  }
});

module.exports = router;
