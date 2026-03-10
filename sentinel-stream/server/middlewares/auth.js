const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token = req.cookies.accessToken; // HTTP-only cookie
  if (!token) return res.status(401).json({ msg: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ msg: 'Admin access required' });
  }
};

module.exports = { protect, admin };