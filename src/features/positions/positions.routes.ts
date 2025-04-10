import express from "express";
import { positionsController } from "./positions.controller";
import { authenticate, authorize } from "@/common/middleware/auth.middleware";
import { ROLES } from "@/common/constants/role.constants";

const router = express.Router();

router.use(authenticate);

// Get all positions
router.get("/", positionsController.findAll.bind(positionsController));

// Get position by ID
router.get("/:id", positionsController.findById.bind(positionsController));

// Create new position (management only)
router.post(
  "/",
  authorize(ROLES.MANAGEMENT),
  positionsController.create.bind(positionsController)
);

// Update position (management only)
router.put(
  "/:id",
  authorize(ROLES.MANAGEMENT),
  positionsController.update.bind(positionsController)
);

// Delete position (admin only)
router.delete(
  "/:id",
  authorize(ROLES.ADMIN_ONLY),
  positionsController.delete.bind(positionsController)
);

// Get users by position
router.get(
  "/:id/users",
  positionsController.findUsersByPosition.bind(positionsController)
);

export default router;
