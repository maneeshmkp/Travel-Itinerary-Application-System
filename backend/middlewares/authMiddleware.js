import jwt from "jsonwebtoken"
import User from "../models/User.js"

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured")
  }
  return secret
}

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authentication token found",
      })
    }

    const token = authHeader.split(" ")[1]
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token found",
      })
    }

    const decoded = jwt.verify(token, getJwtSecret())
    const userId = decoded.id ?? decoded.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      })
    }

    const user = await User.findById(userId).select("-password")
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    })
  }
}

export default protect
export { protect }
