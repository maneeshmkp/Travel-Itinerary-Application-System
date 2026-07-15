import express from "express"
import { body, param, query } from "express-validator"
import { validationResult } from "express-validator"
import { protect } from "../middlewares/authMiddleware.js"
import { PACKING_CATEGORY_IDS } from "../constants/packingCategories.js"
import {
  postGenerate,
  postRegenerate,
  getByTrip,
  putItem,
  postCustom,
  deleteItem,
  searchItems,
  exportCsv,
  exportPdf,
} from "../controllers/packing/packingController.js"

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
  "/generate",
  body("tripId").isMongoId(),
  handleValidation,
  postGenerate,
)
router.post(
  "/regenerate",
  body("tripId").isMongoId(),
  handleValidation,
  postRegenerate,
)
router.post(
  "/custom",
  body("tripId").isMongoId(),
  body("name").isString().isLength({ min: 1, max: 200 }),
  body("category").optional().isIn(PACKING_CATEGORY_IDS),
  handleValidation,
  postCustom,
)
router.put(
  "/item/:id",
  param("id").notEmpty(),
  body("tripId").isMongoId(),
  handleValidation,
  putItem,
)
router.delete(
  "/item/:id",
  param("id").notEmpty(),
  query("tripId").isMongoId(),
  handleValidation,
  deleteItem,
)
router.get("/:tripId/export/csv", param("tripId").isMongoId(), handleValidation, exportCsv)
router.get("/:tripId/export/pdf", param("tripId").isMongoId(), handleValidation, exportPdf)
router.get("/:tripId/search", param("tripId").isMongoId(), handleValidation, searchItems)
router.get("/:tripId", param("tripId").isMongoId(), handleValidation, getByTrip)

export default router
