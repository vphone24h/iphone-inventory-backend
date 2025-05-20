const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema({
  imei: { type: String, required: true, unique: true },

  sku: String,
  product_name: String,

  price_import: Number,
  price_sell: Number,

  import_date: Date,
  sold_date: Date,

  supplier: String,
  customer_name: String,

  warranty: String,
  branch: String,       // ✅ Chi nhánh
  note: String,         // ✅ Ghi chú

  status: { type: String, default: "in_stock" }, // in_stock | sold
});

module.exports = mongoose.model("Inventory", InventorySchema);
