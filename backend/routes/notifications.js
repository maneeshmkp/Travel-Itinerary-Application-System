import express from "express"
import { protect } from "../middlewares/authMiddleware.js"
import {
  getNotifications,
  getNotificationsUnreadCount,
  readNotification,
  readAllNotifications,
  patchNotificationsRead,
  removeNotification,
  archiveNotificationHandler,
  getSettings,
  updateSettings,
  seedSampleNotifications,
  runScheduler,
} from "../controllers/notifications/notificationController.js"

const router = express.Router()

router.use(protect)

router.get("/unread-count", getNotificationsUnreadCount)
router.get("/settings", getSettings)
router.put("/settings", updateSettings)
/** Spec: PATCH /api/notifications/read — legacy POST routes kept */
router.patch("/read", patchNotificationsRead)
router.post("/read-all", readAllNotifications)
router.post("/read/:id", readNotification)
router.patch("/archive/:id", archiveNotificationHandler)
router.post("/seed", seedSampleNotifications)
router.post("/scheduler/run", runScheduler)
router.get("/", getNotifications)
router.delete("/:id", removeNotification)

export default router
