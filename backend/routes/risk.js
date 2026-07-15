import express from "express"
import { body, param } from "express-validator"
import { validationResult } from "express-validator"
import { protect } from "../middlewares/authMiddleware.js"
import { RISK_STATUSES } from "../constants/riskTypes.js"
import {
  postAnalyze,
  getByTrip,
  postReplan,
  postResolve,
} from "../controllers/risk/riskController.js"

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
  "/replan",
  body("tripId").isMongoId(),
  handleValidation,
  postReplan,
)
router.post(
  "/resolve/:id",
  param("id").isMongoId(),
  body("status").optional().isIn(RISK_STATUSES),
  handleValidation,
  postResolve,
)
router.get("/:tripId", param("tripId").isMongoId(), handleValidation, getByTrip)

export default router
