import express from "express"
import { body, validationResult } from "express-validator"
import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  refresh,
  logout,
  logoutAll,
  listSessions,
  revokeOneSession,
} from "../controllers/authController.js"
import { protect } from "../middlewares/authMiddleware.js"
import {
  loginRateLimiter,
  signupRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  refreshRateLimiter,
} from "../middlewares/rateLimiter.js"

const router = express.Router()

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    })
  }
  next()
}

const validateSignup = [
  body("name").notEmpty().withMessage("Name is required").trim(),
  body("email").isEmail().withMessage("Invalid email address"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match")
    }
    return true
  }),
]

const validateLogin = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("password").notEmpty().withMessage("Password is required"),
]

const validateForgotPassword = [body("email").isEmail().withMessage("Invalid email address")]

const validateResetPassword = [
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match")
    }
    return true
  }),
]

router.post("/signup", signupRateLimiter, validateSignup, handleValidationErrors, signup)
router.post("/login", loginRateLimiter, validateLogin, handleValidationErrors, login)
router.post("/refresh", refreshRateLimiter, refresh)
router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validateForgotPassword,
  handleValidationErrors,
  forgotPassword,
)
router.post(
  "/reset-password/:resetToken",
  resetPasswordRateLimiter,
  validateResetPassword,
  handleValidationErrors,
  resetPassword,
)
router.get("/me", protect, getCurrentUser)
router.post("/logout", protect, logout)
router.post("/logout-all", protect, logoutAll)
router.get("/sessions", protect, listSessions)
router.delete("/sessions/:id", protect, revokeOneSession)

export default router
