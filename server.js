const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Inventory = require('./models/Inventory'); // Model sản phẩm

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/iphone-inventory')
  .then(() => console.log('✅ Kết nối MongoDB thành công'))
  .catch(err => console.error('❌ Kết nối MongoDB lỗi:', err));

// API kiểm tra hoạt động
app.get('/', (req, res) => {
  res.send('🎉 Backend đang chạy!');
});

// ==================== API NHẬP HÀNG ====================
app.post('/api/nhap-hang', async (req, res) => {
  try {
    const {
      imei,
      sku,
      price_import,
      product_name,
      import_date,
      supplier,
      branch,
      note,
    } = req.body;

    const exists = await Inventory.findOne({ imei });
    if (exists) {
      return res.status(400).json({ message: '❌ IMEI này đã tồn tại trong kho.' });
    }

    const newItem = new Inventory({
      imei,
      sku,
      price_import,
      product_name,
      import_date,
      supplier,
      branch,
      note,
    });

    await newItem.save();

    res.status(201).json({
      message: '✅ Nhập hàng thành công!',
      item: newItem
    });
  } catch (error) {
    console.error('❌ Lỗi khi nhập hàng:', error.message);
    res.status(500).json({
      message: '❌ Lỗi server khi nhập hàng',
      error: error.message
    });
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

    res.status(200).json({
      message: '✅ Xuất hàng thành công!',
      item,
      profit
    });
  } catch (error) {
    console.error('❌ Lỗi khi xuất hàng:', error.message);
    res.status(500).json({
      message: '❌ Lỗi server khi xuất hàng',
      error: error.message
    });
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
    res.status(500).json({
      message: '❌ Lỗi server khi lấy tồn kho',
      error: error.message
    });
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
    res.status(500).json({
      message: '❌ Lỗi server khi xử lý cảnh báo tồn kho',
      error: error.message
    });
  }
});

// ==================== API BÁO CÁO LỢI NHUẬN CÓ LỌC CHI NHÁNH ====================
app.get('/api/bao-cao-loi-nhuan', async (req, res) => {
  try {
    const { from, to, branch } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const query = {
      status: 'sold',
    };
    if (from || to) {
      query.sold_date = dateFilter;
    }
    if (branch && branch !== 'all') {
      query.branch = branch;
    }

    const soldItems = await Inventory.find(query);

    const totalDevicesSold = soldItems.length;
    const totalRevenue = soldItems.reduce((sum, item) => sum + (item.price_sell || 0), 0);
    const totalCost = soldItems.reduce((sum, item) => sum + (item.price_import || 0), 0);
    const totalProfit = totalRevenue - totalCost;

    res.status(200).json({
      totalDevicesSold,
      totalRevenue,
      totalCost,
      totalProfit
    });
  } catch (err) {
    console.error('❌ Lỗi khi lấy báo cáo lợi nhuận:', err.message);
    res.status(500).json({ message: '❌ Lỗi khi lấy báo cáo lợi nhuận' });
  }
});

// ==================== API TỒN KHO THEO SỐ LƯỢNG ====================
app.get('/api/ton-kho-soluong', async (req, res) => {
  try {
    const allItems = await Inventory.find();

    const summaryMap = {};

    allItems.forEach(item => {
      const sku = item.sku || "Không rõ SKU";

      if (!summaryMap[sku]) {
        summaryMap[sku] = {
          sku,
          totalImported: 0,
          totalSold: 0,
          branch: item.branch || 'Không rõ',
        };
      }

      summaryMap[sku].totalImported += 1;

      if (item.status === 'sold') {
        summaryMap[sku].totalSold += 1;
      }
    });

    const result = Object.values(summaryMap).map(entry => ({
      sku: entry.sku,
      totalImported: entry.totalImported,
      totalSold: entry.totalSold,
      remaining: entry.totalImported - entry.totalSold,
      branch: entry.branch
    })).filter(row => row.remaining > 0);

    res.status(200).json({
      message: "✅ Tồn kho theo số lượng",
      items: result
    });
  } catch (error) {
    console.error('❌ Lỗi khi tính tồn kho số lượng:', error.message);
    res.status(500).json({
      message: "❌ Lỗi server khi tính tồn kho",
      error: error.message
    });
  }
});

// ==================== API CHI TIẾT ĐƠN HÀNG ====================
app.get('/api/bao-cao-don-hang-chi-tiet', async (req, res) => {
  try {
    const { from, to, branch } = req.query;

    const query = {
      status: 'sold',
    };

    if (from && to) {
      query.sold_date = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    if (branch && branch !== 'all') {
      query.branch = branch;
    }

    const orders = await Inventory.find(query).sort({ sold_date: -1 });

    res.status(200).json({
      message: '✅ Danh sách đơn hàng đã bán',
      total: orders.length,
      orders
    });
  } catch (err) {
    console.error('❌ Lỗi khi lấy chi tiết đơn hàng:', err.message);
    res.status(500).json({
      message: '❌ Server lỗi khi lấy chi tiết đơn hàng',
      error: err.message
    });
  }
});

// ==================== KHỞI ĐỘNG SERVER ====================
app.listen(4000, () => {
  console.log('🚀 Server đang chạy tại http://localhost:4000');
});
