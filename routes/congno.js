const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');

// 1. Lấy danh sách khách hàng còn công nợ (Tổng hợp theo customer_name + phone)
router.get('/cong-no-list', async (req, res) => {
  try {
    // Lấy các đơn đã xuất, còn nợ, có tên khách
    const items = await Inventory.find({
      debt: { $gt: 0 },
      status: "sold",
      customer_name: { $ne: null, $ne: "" }
    });

    // Gom nhóm theo customer_name + customer_phone
    const grouped = {};
    items.forEach(item => {
      const key = item.customer_name + "|" + (item.customer_phone || "");
      if (!grouped[key]) {
        grouped[key] = {
          customer_name: item.customer_name,
          customer_phone: item.customer_phone || "",
          total_debt: 0,
          total_paid: 0,
          debt_history: [],
          product_list: []
        };
      }
      grouped[key].total_debt += item.debt || 0;
      grouped[key].total_paid += item.da_tra || 0;

      // Gom lịch sử trả nợ/cộng nợ (nếu muốn lấy lịch sử từng đơn thì lấy mảng)
      if (item.debt_history && Array.isArray(item.debt_history)) {
        grouped[key].debt_history = grouped[key].debt_history.concat(item.debt_history);
      }

      // Thêm sản phẩm chi tiết
      grouped[key].product_list.push({
        imei: item.imei,
        product_name: item.product_name,
        price_sell: item.price_sell,
        sold_date: item.sold_date,
        debt: item.debt,
        da_tra: item.da_tra
      });
    });

    // Sắp xếp lịch sử mới nhất lên trên (tuỳ backend bạn có muốn merge lại ko)
    Object.values(grouped).forEach(group => {
      group.debt_history = group.debt_history.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      );
    });

    res.json({ items: Object.values(grouped) });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server khi lấy công nợ', error: err.message });
  }
});

// 2. Lấy danh sách đơn còn nợ của 1 khách hàng
router.get('/cong-no-orders', async (req, res) => {
  const { customer_name, customer_phone } = req.query;
  if (!customer_name) return res.status(400).json({ message: "Thiếu tên khách hàng" });
  try {
    const query = {
      customer_name,
      status: "sold",
      debt: { $gt: 0 }
    };
    if (customer_phone) query.customer_phone = customer_phone;
    const orders = await Inventory.find(query).sort({ sold_date: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server khi lấy đơn nợ', error: err.message });
  }
});

// 3. Trừ nợ tổng cho từng khách (cho phép trừ tổng nợ)
router.put('/cong-no-pay-customer', async (req, res) => {
  const { customer_name, customer_phone, amount } = req.body;
  if (!customer_name || !amount || isNaN(amount)) return res.status(400).json({ message: "Thiếu thông tin hoặc số tiền trả" });
  try {
    const query = { customer_name, status: "sold", debt: { $gt: 0 } };
    if (customer_phone) query.customer_phone = customer_phone;
    const orders = await Inventory.find(query).sort({ sold_date: 1 });

    let remain = Number(amount);
    let total_paid = 0;
    let total_debt = 0;
    let debt_history = [];

    for (const order of orders) {
      if (remain <= 0) break;
      const toPay = Math.min(remain, order.debt);
      order.da_tra = (order.da_tra || 0) + toPay;
      order.debt = (order.debt || 0) - toPay;

      // Lưu lịch sử trừ nợ
      if (!order.debt_history) order.debt_history = [];
      order.debt_history.push({
        type: "pay",
        amount: toPay,
        date: new Date()
      });

      await order.save();
      remain -= toPay;
    }

    // Sau khi cập nhật, tính lại tổng nợ/tổng trả
    const allOrders = await Inventory.find(query);
    allOrders.forEach(item => {
      total_paid += item.da_tra || 0;
      total_debt += item.debt || 0;
      if (item.debt_history) debt_history = debt_history.concat(item.debt_history);
    });

    // Sắp xếp lịch sử mới nhất lên trên
    debt_history = debt_history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      message: "Đã cập nhật công nợ!",
      total_debt,
      total_paid,
      debt_history
    });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server khi cập nhật nợ', error: err.message });
  }
});

// 4. Cộng nợ tổng cho khách
router.put('/cong-no-add-customer', async (req, res) => {
  const { customer_name, customer_phone, amount } = req.body;
  if (!customer_name || !amount || isNaN(amount)) return res.status(400).json({ message: "Thiếu thông tin hoặc số tiền cộng nợ" });
  try {
    // Chỉ cộng nợ vào đơn còn nợ nhiều nhất, hoặc đơn mới nhất
    const query = { customer_name, status: "sold" };
    if (customer_phone) query.customer_phone = customer_phone;
    const order = await Inventory.findOne(query).sort({ sold_date: -1 });

    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn để cộng nợ" });

    order.debt = (order.debt || 0) + Number(amount);
    // Không thay đổi da_tra
    if (!order.debt_history) order.debt_history = [];
    order.debt_history.push({
      type: "add",
      amount: Number(amount),
      date: new Date()
    });

    await order.save();

    // Tính lại tổng sau cộng nợ
    const orders = await Inventory.find(query);
    let total_paid = 0, total_debt = 0, debt_history = [];
    orders.forEach(item => {
      total_paid += item.da_tra || 0;
      total_debt += item.debt || 0;
      if (item.debt_history) debt_history = debt_history.concat(item.debt_history);
    });
    debt_history = debt_history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      message: "Đã cộng thêm nợ!",
      total_debt,
      total_paid,
      debt_history
    });
  } catch (err) {
    res.status(500).json({ message: '❌ Lỗi server khi cộng nợ', error: err.message });
  }
});

// 5. Trả nợ/cộng nợ từng đơn (nếu frontend vẫn dùng)
// ... Giữ nguyên API cũ nếu cần

module.exports = router;
