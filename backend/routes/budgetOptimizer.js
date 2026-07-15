import express from "express"
import { body, param } from "express-validator"
import { validationResult } from "express-validator"
import { protect } from "../middlewares/authMiddleware.js"
import {
  postAnalyze,
  getByTrip,
  postApply,
  postSimulate,
} from "../controllers/budgetOptimizer/budgetOptimizerController.js"

const router = express.Router()
router.use(protect)

function handleValidation(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: "Validation failed", details: errors.array() })
  }
  next()
}

router.post(
  "/analyze",
  body("tripId").isMongoId(),
  handleValidation,
  postAnalyze,
)
router.post(
  "/apply",
  body("tripId").isMongoId(),
  handleValidation,
  postApply,
)
router.post(
  "/simulate",
  body("tripId").isMongoId(),
  handleValidation,
  postSimulate,
)
router.get("/:tripId", param("tripId").isMongoId(), handleValidation, getByTrip)

export default router
