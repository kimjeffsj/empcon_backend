import express from "express";
import { holidaysController } from "./holidays.controller";
import { authenticate, authorize } from "@/common/middleware/auth.middleware";
import { ROLES } from "@/common/constants/role.constants";

const router = express.Router();

router.use(authenticate);

// Get all holidays
router.get("/", holidaysController.findAll.bind(holidaysController));

// Get holidays by year
router.get("/:year", holidaysController.findByYear.bind(holidaysController));

// Get holiday by ID
router.get("/detail/:id", holidaysController.findById.bind(holidaysController));

// Create new holiday (admin only)
router.post(
  "/",
  authorize(ROLES.ADMIN_ONLY),
  holidaysController.create.bind(holidaysController)
);

// Update holiday (admin only)
router.put(
  "/:id",
  authorize(ROLES.ADMIN_ONLY),
  holidaysController.update.bind(holidaysController)
);

// Delete holiday (admin only)
router.delete(
  "/:id",
  authorize(ROLES.ADMIN_ONLY),
  holidaysController.delete.bind(holidaysController)
);

export default router;
