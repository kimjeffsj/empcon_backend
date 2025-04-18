import express from "express";
import { notificationsController } from "./notifications.controller";
import { authenticate, authorize } from "@/common/middleware/auth.middleware";
import { ROLES } from "@/common/constants/role.constants";

const router = express.Router();

router.use(authenticate);

// Get notification list
router.get(
  "/",
  notificationsController.findAllForUser.bind(notificationsController)
);

// Mark as read
router.put(
  "/:id/read",
  notificationsController.markAsRead.bind(notificationsController)
);

// Mark all as read
router.put(
  "/read-all",
  notificationsController.markAllAsRead.bind(notificationsController)
);

// Delete Notification
router.delete(
  "/:id",
  notificationsController.delete.bind(notificationsController)
);

// Send notification(Management only)
router.post(
  "/send",
  authorize(ROLES.MANAGEMENT),
  notificationsController.sendNotification.bind(notificationsController)
);

export default router;
