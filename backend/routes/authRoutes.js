import express from "express"
import { body, validationResult } from "express-validator"
import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} from "../controllers/authController.js"

const router = express.Router()

// Middleware to handle validation errors
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

// Validation middleware
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

// Routes
router.post("/signup", validateSignup, handleValidationErrors, signup)
router.post("/login", validateLogin, handleValidationErrors, login)
router.post("/forgot-password", validateForgotPassword, handleValidationErrors, forgotPassword)
router.post("/reset-password/:resetToken", validateResetPassword, handleValidationErrors, resetPassword)
router.get("/me", getCurrentUser) // Protected route - requires token

export default router
