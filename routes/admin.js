const express = require("express");
const router = express.Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");
const User = require("../models/User");

// API: Lấy danh sách user chưa duyệt
router.get("/pending-users", verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ approved: false });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// API: Duyệt user
router.post("/approve-user/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { approved: true });
    res.json({ message: "Đã duyệt tài khoản thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;
