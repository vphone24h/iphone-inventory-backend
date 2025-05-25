const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Bạn chưa đăng nhập!' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'vphone_secret_key', (err, user) => {
    if (err) {
      console.error('JWT verify error:', err);
      return res.status(403).json({ message: 'Token không hợp lệ!' });
    }
    req.user = user; // user chứa { id, email, role }
    next();
  });
};

exports.requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới được phép truy cập' });
    }
    next();
  } catch (err) {
    console.error('Error in requireAdmin middleware:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
