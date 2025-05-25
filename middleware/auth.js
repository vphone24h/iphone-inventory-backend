const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware kiểm tra JWT token
exports.verifyToken = (req, res, next) => {
  // Lấy token từ header: Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Bạn chưa đăng nhập!" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token không hợp lệ!" });
    req.user = user; // user chứa { id, email, role }
    next();
  });
};

// Middleware chỉ cho phép admin
exports.requireAdmin = async (req, res, next) => {
  try {
    // Tìm user trong DB dựa vào id trong token
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Chỉ admin được phép thực hiện!" });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: "Lỗi xác thực admin!" });
  }
};
