const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token; 
    if (!token) {
      return res.status(401).json({ error: "Please login!" });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    const user = await User.findById(decoded._id).select("-password");
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = user;
    next();

  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  userAuth,
};
