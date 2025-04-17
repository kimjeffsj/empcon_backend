import express from "express";
import { timeClocksController } from "./timeclocks.controller";
import { authenticate, authorize } from "@/common/middleware/auth.middleware";
import { ROLES } from "@/common/constants/role.constants";

const router = express.Router();

router.use(authenticate);

// Get all time clocks (management only)
router.get(
  "/",
  authorize(ROLES.MANAGEMENT),
  timeClocksController.findAll.bind(timeClocksController)
);

// Get time clock by ID
router.get(
  "/:id",
  (req, res, next) => {
    // Logic to check if user can access this time clock
    return next();
  },
  timeClocksController.findById.bind(timeClocksController)
);

// Clock in
router.post(
  "/clock-in",
  timeClocksController.clockIn.bind(timeClocksController)
);

// Clock out
router.put(
  "/clock-out/:id",
  timeClocksController.clockOut.bind(timeClocksController)
);

// Update time clock (management only)
router.put(
  "/:id",
  authorize(ROLES.MANAGEMENT),
  timeClocksController.update.bind(timeClocksController)
);

// Delete time clock (management only)
router.delete(
  "/:id",
  authorize(ROLES.MANAGEMENT),
  timeClocksController.delete.bind(timeClocksController)
);

// Get active time clock for user
router.get(
  "/user/active/:userId",
  timeClocksController.findActiveByUser.bind(timeClocksController)
);

// Get time clocks by user
router.get(
  "/user/:userId",
  (req, res, next) => {
    // Allow users to view their own time clocks
    if (
      req.user?.userId === req.params.userId ||
      req.user?.role !== "EMPLOYEE"
    ) {
      return next();
    }
    return authorize(ROLES.MANAGEMENT)(req, res, next);
  },
  timeClocksController.findByUser.bind(timeClocksController)
);

export default router;
