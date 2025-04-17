import express from "express";
import { schedulesController } from "./schedules.controller";
import { authenticate, authorize } from "@/common/middleware/auth.middleware";
import { ROLES } from "@/common/constants/role.constants";

const router = express.Router();

router.use(authenticate);

// Get all schedules
router.get(
  "/",
  authorize(ROLES.MANAGEMENT),
  schedulesController.findAll.bind(schedulesController)
);

// Get schedule by ID
router.get(
  "/:id",
  (req, res, next) => {
    // Allow users to view their own schedules
    if (req.user?.role === "EMPLOYEE") {
      return next();
    }
    return next();
  },
  schedulesController.findById.bind(schedulesController)
);

// Create new schedule
router.post(
  "/",
  authorize(ROLES.MANAGEMENT),
  schedulesController.create.bind(schedulesController)
);

// Create batch schedules
router.post(
  "/batch",
  authorize(ROLES.MANAGEMENT),
  schedulesController.createBatch.bind(schedulesController)
);

// Update schedule
router.put(
  "/:id",
  authorize(ROLES.MANAGEMENT),
  schedulesController.update.bind(schedulesController)
);

// Delete schedule
router.delete(
  "/:id",
  authorize(ROLES.MANAGEMENT),
  schedulesController.delete.bind(schedulesController)
);

// Get schedules by user
router.get(
  "/user/:userId",
  (req, res, next) => {
    // Allow users to view their own schedules
    if (
      req.user?.userId === req.params.userId ||
      req.user?.role !== "EMPLOYEE"
    ) {
      return next();
    }
    return authorize(ROLES.MANAGEMENT)(req, res, next);
  },
  schedulesController.findByUser.bind(schedulesController)
);

export default router;
