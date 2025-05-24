const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Debt = require('../models/Debt'); // Model cho công nợ (bạn phải tạo nhé!)

// Lấy danh sách tất cả công nợ (tổng hợp theo khách hàng)
router.get('/danh-sach', async (req, res) => {
  try {
    const debts = await Debt.find({});
    res.json({ message: '✅ Danh sách công nợ', debts });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

// Lấy chi tiết công nợ của 1 khách hàng (bao gồm các đơn hàng liên quan)
router.get('/:customer_name', async (req, res) => {
  try {
    const { customer_name } = req.params;
    const debt = await Debt.findOne({ customer_name });
    // Lấy lịch sử đơn hàng liên quan
    const orders = await Inventory.find({
      customer_name,
      $or: [{ status: 'sold' }, { status: 'debt' }]
    });
    res.json({ message: '✅ Chi tiết công nợ', debt, orders });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server', error: err.message });
  }
});

// Thêm hoặc cập nhật công nợ cho khách hàng
router.post('/cap-nhat', async (req, res) => {
  try {
    const { customer_name, amount, action, note } = req.body;
    let debt = await Debt.findOne({ customer_name });
    if (!debt) {
      debt = new Debt({ customer_name, total_debt: 0, history: [] });
    }
    // action: 'add' (thêm nợ), 'pay' (thanh toán bớt)
    let newAmount = Number(amount || 0);
    if (action === 'add') {
      debt.total_debt += newAmount;
    } else if (action === 'pay') {
      debt.total_debt -= newAmount;
    }
    debt.history.push({
      date: new Date(),
      action,
      amount: newAmount,
      note
    });
    await debt.save();
    res.json({ message: '✅ Cập nhật công nợ thành công', debt });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi cập nhật công nợ', error: err.message });
  }
});

// Xóa công nợ 1 khách hàng
router.delete('/:customer_name', async (req, res) => {
  try {
    const { customer_name } = req.params;
    await Debt.findOneAndDelete({ customer_name });
    res.json({ message: '✅ Đã xóa công nợ khách hàng', customer_name });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi khi xóa công nợ', error: err.message });
  }
});

module.exports = router;
