import express from "express"
import {
  copilotChat,
  copilotChatStream,
  listSessions,
  createSession,
  getSession,
  renameSession,
  deleteSession,
  getExpenses,
  addExpense,
  deleteExpense,
} from "../controllers/copilotController.js"
import { protect } from "../middlewares/authMiddleware.js"
import { requirePermission } from "../middlewares/rbac.js"
import { PERMISSIONS } from "../constants/rbac.js"
import { aiRateLimiter } from "../middlewares/rateLimiter.js"
import { requirePlanLimit, trackAiUsageOnSuccess } from "../middlewares/tenant.js"

const router = express.Router()
const canAi = requirePermission(PERMISSIONS.AI_USE)
const canExpenses = requirePermission(PERMISSIONS.EXPENSES_MANAGE)
const aiGuard = [protect, canAi, requirePlanLimit("aiRequests"), trackAiUsageOnSuccess, aiRateLimiter]

router.post("/", ...aiGuard, copilotChat)
router.post("/stream", ...aiGuard, copilotChatStream)

router.get("/sessions", protect, canAi, listSessions)
router.post("/sessions", protect, canAi, createSession)
router.get("/sessions/:id", protect, canAi, getSession)
router.patch("/sessions/:id", protect, canAi, renameSession)
router.delete("/sessions/:id", protect, canAi, deleteSession)

router.get("/expenses/:itineraryId", protect, canExpenses, getExpenses)
router.post("/expenses/:itineraryId", protect, canExpenses, addExpense)
router.delete("/expenses/:itineraryId/:expenseId", protect, canExpenses, deleteExpense)

export default router
