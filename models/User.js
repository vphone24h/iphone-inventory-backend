const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    approved: {
      type: Boolean,
      default: false,      // Mặc định chưa duyệt khi đăng ký
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",     // Mặc định là user thường
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
