const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema({
  imei: { type: String, unique: true, sparse: true }, // không bắt buộc

  sku: { type: String, required: true },
  product_name: { type: String, required: true },
  tenSanPham: { type: String },

  price_import: { type: Number, required: true },
  price_sell: { type: Number, default: 0 },

  import_date: { type: Date, required: true },
  sold_date: { type: Date },

  quantity: { type: Number, default: 1 },            // ✅ số lượng
  category: { type: String, default: "" },           // ✅ thư mục

  supplier: { type: String },
  customer_name: { type: String },
  warranty: { type: String },
  branch: { type: String },                          // ✅ chi nhánh
  note: { type: String },                            // ✅ ghi chú

  // ---- Thêm trường công nợ ở đây
  debt: { type: Number, default: 0 },                // ✅ công nợ

  status: { type: String, enum: ["in_stock", "sold"], default: "in_stock" },
}, {
  timestamps: true
});

module.exports = mongoose.model("Inventory", InventorySchema);
