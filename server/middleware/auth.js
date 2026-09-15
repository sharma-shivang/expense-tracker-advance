import jwt from "jsonwebtoken";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-passwordHash").lean();
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    req.userId = user._id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default auth;