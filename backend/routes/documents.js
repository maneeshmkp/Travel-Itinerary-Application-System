import express from "express"
import { body, query, param } from "express-validator"
import { validationResult } from "express-validator"
import { protect, optionalProtect } from "../middlewares/authMiddleware.js"
import { requirePermission } from "../middlewares/rbac.js"
import { requirePlanLimit } from "../middlewares/tenant.js"
import { PERMISSIONS } from "../constants/rbac.js"
import { documentUpload } from "../middlewares/documentUpload.js"
import { DOCUMENT_TYPE_IDS } from "../constants/documentTypes.js"
import {
  getDocuments,
  searchDocumentsHandler,
  getDocument,
  postDocument,
  putDocument,
  removeDocument,
  favoriteDocument,
  downloadDocument,
  serveDocumentFile,
  serveThumbnail,
  getTimeline,
  getMissing,
  getStats,
  getAiContext,
} from "../controllers/document/documentController.js"

const router = express.Router()
const requireDocs = requirePermission(PERMISSIONS.DOCUMENTS_UPLOAD)

function handleValidation(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: "Validation failed", details: errors.array() })
  }
  next()
}

const validateListQuery = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
  query("documentType").optional().isIn(DOCUMENT_TYPE_IDS),
  query("tripId").optional().isMongoId(),
  query("favorites").optional().isIn(["true", "false"]),
  query("expired").optional().isIn(["true", "false"]),
  query("expiringSoon").optional().isIn(["true", "false"]),
]

const validateUpdate = [
  body("title").optional().isString().isLength({ min: 1, max: 200 }),
  body("documentType").optional().isIn(DOCUMENT_TYPE_IDS),
  body("tripId").optional({ nullable: true }).isMongoId(),
  body("description").optional().isString().isLength({ max: 2000 }),
  body("country").optional().isString().isLength({ max: 120 }),
  body("issuer").optional().isString().isLength({ max: 200 }),
  body("documentNumber").optional().isString().isLength({ max: 80 }),
  body("issueDate").optional({ nullable: true }).isISO8601(),
  body("expiryDate").optional({ nullable: true }).isISO8601(),
  body("isPersonal").optional().isBoolean(),
  body("isFavorite").optional().isBoolean(),
  body("tags").optional(),
]

router.get("/search", protect, requireDocs, validateListQuery, handleValidation, searchDocumentsHandler)
router.get("/timeline", protect, requireDocs, handleValidation, getTimeline)
router.get("/stats", protect, requireDocs, handleValidation, getStats)
router.get("/missing", protect, requireDocs, query("tripId").isMongoId(), handleValidation, getMissing)
router.get("/ai-context", protect, requireDocs, handleValidation, getAiContext)
router.get("/", protect, requireDocs, validateListQuery, handleValidation, getDocuments)
router.get("/:id/thumbnail", param("id").isMongoId(), optionalProtect, handleValidation, serveThumbnail)
router.get("/:id/file", param("id").isMongoId(), optionalProtect, handleValidation, serveDocumentFile)
router.get("/:id/download", protect, requireDocs, param("id").isMongoId(), handleValidation, downloadDocument)
router.get("/:id", protect, requireDocs, param("id").isMongoId(), handleValidation, getDocument)
router.post("/favorite/:id", protect, requireDocs, param("id").isMongoId(), handleValidation, favoriteDocument)
router.post("/", protect, requireDocs, requirePlanLimit("documents"), (req, res, next) => {
  documentUpload.single("file")(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "File exceeds 20MB limit" : err.message || "Upload failed"
      return res.status(400).json({ success: false, message })
    }
    next()
  })
}, postDocument)
router.put("/:id", protect, requireDocs, param("id").isMongoId(), validateUpdate, handleValidation, putDocument)
router.delete("/:id", protect, requireDocs, param("id").isMongoId(), handleValidation, removeDocument)

export default router
