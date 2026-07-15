/**
 * Aggregated API router — shared by /api and /api/v1 (backward compatible).
 * Does not alter route handlers; only centralizes mounts.
 */
import { Router } from "express"
import itineraryRoutes from "./itineraryRoutes.js"
import recommendationRoutes from "./recommendationRoutes.js"
import authRoutes from "./authRoutes.js"
import aiRoutes from "./aiRoutes.js"
import weatherRoutes from "./weatherRoutes.js"
import availabilityRoutes from "./availabilityRoutes.js"
import analyticsRoutes from "./analyticsRoutes.js"
import chatRoutes from "./chatRoutes.js"
import blogRoutes from "./blogRoutes.js"
import notificationRoutes from "./notifications.js"
import bookingRoutes from "./bookings.js"
import tripRoutes from "./tripRoutes.js"
import calendarRoutes from "./calendar.js"
import documentRoutes from "./documents.js"
import packingRoutes from "./packing.js"
import riskRoutes from "./risk.js"
import flightTrackingRoutes from "./flightTracking.js"
import budgetOptimizerRoutes from "./budgetOptimizer.js"
import monitoringRoutes from "./monitoring.js"
import adminRoutes from "./adminRoutes.js"
import {
  getPublicHealth,
  getLiveness,
} from "../controllers/monitoringController.js"

const apiRouter = Router()

/** Stamp every response with API version for clients/proxy observability */
apiRouter.use((_req, res, next) => {
  res.setHeader("X-API-Version", "1")
  next()
})

apiRouter.get("/health", getPublicHealth)
apiRouter.get("/health/live", getLiveness)

apiRouter.use("/auth", authRoutes)
apiRouter.use("/admin", adminRoutes)
apiRouter.use("/itineraries", itineraryRoutes)
apiRouter.use("/recommendations", recommendationRoutes)
apiRouter.use("/ai", aiRoutes)
apiRouter.use("/chat", chatRoutes)
apiRouter.use("/blogs", blogRoutes)
apiRouter.use("/notifications", notificationRoutes)
apiRouter.use("/bookings", bookingRoutes)
apiRouter.use("/trips", tripRoutes)
apiRouter.use("/calendar", calendarRoutes)
apiRouter.use("/documents", documentRoutes)
apiRouter.use("/packing", packingRoutes)
apiRouter.use("/risk", riskRoutes)
apiRouter.use("/flights", flightTrackingRoutes)
apiRouter.use("/budget", budgetOptimizerRoutes)
apiRouter.use("/weather", weatherRoutes)
apiRouter.use("/analytics", analyticsRoutes)
apiRouter.use("/monitoring", monitoringRoutes)
apiRouter.use("/", availabilityRoutes)

export default apiRouter
