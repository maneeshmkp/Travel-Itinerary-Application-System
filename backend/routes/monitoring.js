import express from "express"
import { protect } from "../middlewares/authMiddleware.js"
import { requirePermission } from "../middlewares/rbac.js"
import { PERMISSIONS } from "../constants/rbac.js"
import {
  getMonitoringOverview,
  getMonitoringMetrics,
  getMonitoringAlerts,
  getMonitoringServices,
} from "../controllers/monitoringController.js"

const router = express.Router()

router.use(protect, requirePermission(PERMISSIONS.ADMIN_MONITORING))

router.get("/overview", getMonitoringOverview)
router.get("/metrics", getMonitoringMetrics)
router.get("/alerts", getMonitoringAlerts)
router.get("/services", getMonitoringServices)

export default router
