const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Inventory = require('./models/Inventory');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');          // <-- Bổ sung import user routes
const reportRoutes = require('./routes/report');
const branchRoutes = require('./routes/branch');
const categoryRoutes = require('./routes/category');
const congNoRoutes = require('./routes/congno');
const adminRoutes = require('./routes/admin');

const app = express();

const allowedOrigins = [
  'http://localhost:5174',
  'https://vphone-pw2zoudi6-vphone24hs-projects.vercel.app',
  'https://iphone-inventory-frontend.vercel.app',
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ CORS bị chặn: ' + origin));
    }
  },
  credentials: true,
}));

app.options('*', cors());
app.use(express.json());

// ===== Đăng ký các route API =====
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);                     // <-- Đăng ký user routes tại đây
app.use('/api/report', reportRoutes);

app.use('/api/branches', branchRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cong-no', congNoRoutes);
app.use('/api/admin', adminRoutes);

// ===== API nhập hàng =====
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
      quantity,
      category,
    } = req.body;

    if (imei) {
      const exists = await Inventory.findOne({ imei });
      if (exists) {
        return res.status(400).json({ message: '❌ IMEI này đã tồn tại trong kho.' });
      }
      const newItem = new Inventory({
        imei,
        sku,
        price_import,
        product_name,
        tenSanPham: product_name,
        import_date,
        supplier,
        branch,
        note,
        quantity: 1,
        category,
      });
      await newItem.save();
      return res.status(201).json({
        message: '✅ Nhập hàng thành công!',
        item: newItem,
      });
    }

    if (!sku || !product_name) {
      return res.status(400).json({ message: '❌ Thiếu SKU hoặc tên sản phẩm.' });
    }

    let existItem = await Inventory.findOne({
      $or: [{ imei: null }, { imei: "" }, { imei: undefined }],
      sku: sku,
      branch: branch,
      product_name: product_name,
      price_import: price_import,
      category: category,
    });

    if (existItem) {
      existItem.quantity = (existItem.quantity || 1) + Number(quantity || 1);
      existItem.import_date = import_date || existItem.import_date;
      existItem.supplier = supplier || existItem.supplier;
      existItem.note = note || existItem.note;
      await existItem.save();
      return res.status(200).json({
        message: '✅ Đã cộng dồn số lượng phụ kiện!',
        item: existItem,
      });
    } else {
      const newItem = new Inventory({
        sku,
        price_import,
        product_name,
        tenSanPham: product_name,
        import_date,
        supplier,
        branch,
        note,
        quantity: Number(quantity || 1),
        category,
      });
      await newItem.save();
      return res.status(201).json({
        message: '✅ Nhập phụ kiện thành công!',
        item: newItem,
      });
    }
  } catch (error) {
    console.error('❌ Lỗi khi nhập hàng:', error.message);
    res.status(500).json({ message: '❌ Lỗi server khi nhập hàng', error: error.message });
  }
});

// ===== API sửa hàng =====
app.put('/api/nhap-hang/:id', async (req, res) => {
  try {
    const updatedItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    if (!updatedItem) {
      return res.status(404).json({ message: '❌ Không tìm thấy sản phẩm để cập nhật.' });
    }

    res.status(200).json({
      message: '✅ Cập nhật thành công!',
      item: updatedItem,
    });
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật sản phẩm:', error.message);
    res.status(500).json({ message: '❌ Lỗi server khi cập nhật', error: error.message });
  }
});

// ===== API xoá hàng =====
app.delete('/api/nhap-hang/:id', async (req, res) => {
  try {
    const deletedItem = await Inventory.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ message: '❌ Không tìm thấy sản phẩm để xoá.' });
    }

    res.status(200).json({
      message: '✅ Đã xoá thành công!',
      item: deletedItem,
    });
  } catch (error) {
    console.error('❌ Lỗi khi xoá sản phẩm:', error.message);
    res.status(500).json({ message: '❌ Lỗi server khi xoá sản phẩm', error: error.message });
  }
});

// ===== API xuất hàng =====
app.post('/api/xuat-hang', async (req, res) => {
  try {
    const {
      imei,
      price_sell,
      customer_name,
      customer_phone,
      warranty,
      note,
      sku,
      product_name,
      sold_date,
      debt,
    } = req.body;

    const item = await Inventory.findOne({ imei });
    if (!item) {
      return res.status(404).json({ message: '❌ Không tìm thấy IMEI trong kho.' });
    }

    if (item.status === 'sold') {
      return res.status(400).json({ message: '⚠️ Máy này đã được bán trước đó.' });
    }

    item.status = 'sold';
    item.giaBan = price_sell;
    item.price_sell = price_sell;
    item.sold_date = sold_date ? new Date(sold_date) : new Date();
    item.customer_name = customer_name || '';
    item.customer_phone = customer_phone || '';
    item.warranty = warranty || '';
    item.note = note || '';
    item.sku = sku || item.sku;
    item.product_name = product_name || item.product_name;

    if (debt !== undefined && debt !== null && debt !== "") {
      item.debt = Number(debt);
      item.da_tra = Number(item.price_sell) - Number(debt);
    } else {
      item.debt = 0;
      item.da_tra = Number(item.price_sell);
    }

    await item.save();

    const profit = (item.giaBan || 0) - (item.price_import || 0);

    res.status(200).json({ message: '✅ Xuất hàng thành công!', item, profit });
  } catch (error) {
    console.error('❌ Lỗi khi xuất hàng:', error.message);
    res.status(500).json({ message: '❌ Lỗi server khi xuất hàng', error: error.message });
  }
});

// ===== API tồn kho =====
app.get('/api/ton-kho', async (req, res) => {
  try {
    const items = await Inventory.find({ status: 'in_stock' });

    res.status(200).json({
      message: '✅ Danh sách máy còn tồn kho',
      total: items.length,
      items,
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy tồn kho:', error.message);
    res.status(500).json({ message: '❌ Lỗi server khi lấy tồn kho', error: error.message });
  }
});

// ===== API cảnh báo tồn kho =====
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
      items: result,
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách cảnh báo tồn kho:', error.message);
    res.status(500).json({ message: '❌ Lỗi server khi xử lý cảnh báo tồn kho', error: error.message });
  }
});

// ===== API danh sách xuất hàng =====
app.get('/api/xuat-hang-list', async (req, res) => {
  try {
    const items = await Inventory.find({ status: 'sold' }).sort({ sold_date: -1 });
    res.status(200).json({ items });
  } catch (error) {
    res.status(500).json({ message: '❌ Lỗi lấy danh sách xuất hàng', error: error.message });
  }
});

app.put('/api/xuat-hang/:id', async (req, res) => {
  try {
    const updateFields = {
      ...req.body,
      status: 'sold',
    };

    const updated = await Inventory.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!updated) {
      return res.status(404).json({ message: '❌ Không tìm thấy đơn xuất để cập nhật.' });
    }
    res.status(200).json({ message: '✅ Đã cập nhật đơn xuất!', item: updated });
  } catch (error) {
    res.status(500).json({ message: '❌ Lỗi khi cập nhật đơn xuất', error: error.message });
  }
});

app.delete('/api/xuat-hang/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item || item.status !== 'sold') {
      return res.status(404).json({ message: '❌ Không tìm thấy đơn xuất hàng.' });
    }

    item.status = 'in_stock';
    item.giaBan = undefined;
    item.price_sell = undefined;
    item.sold_date = undefined;
    item.customer_name = undefined;
    item.customer_phone = undefined;
    item.warranty = undefined;
    item.note = undefined;
    item.debt = 0;
    item.da_tra = 0;

    await item.save();

    res.status(200).json({ message: '✅ Đã chuyển máy về tồn kho!', item });
  } catch (error) {
    res.status(500).json({ message: '❌ Lỗi khi xoá đơn xuất', error: error.message });
  }
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Kết nối MongoDB thành công'))
.catch(err => console.error('❌ Kết nối MongoDB lỗi:', err));

app.get('/', (req, res) => {
  res.send('🎉 Backend đang chạy!');
});

app.listen(4000, () => {
  console.log('🚀 Server đang chạy tại http://localhost:4000');
});
