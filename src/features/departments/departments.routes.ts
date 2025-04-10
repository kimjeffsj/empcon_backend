import express from "express";
import { departmentsController } from "./departments.controller";
import { authenticate, authorize } from "@/common/middleware/auth.middleware";
import { ROLES } from "@/common/constants/role.constants";

const router = express.Router();

router.use(authenticate);

// Get all departments
router.get("/", departmentsController.findAll.bind(departmentsController));

// Get department by ID
router.get("/:id", departmentsController.findById.bind(departmentsController));

// Create new department (management only)
router.post(
  "/",
  authorize(ROLES.MANAGEMENT),
  departmentsController.create.bind(departmentsController)
);

// Update department (management only)
router.put(
  "/:id",
  authorize(ROLES.MANAGEMENT),
  departmentsController.update.bind(departmentsController)
);

// Delete department (admin only)
router.delete(
  "/:id",
  authorize(ROLES.ADMIN_ONLY),
  departmentsController.delete.bind(departmentsController)
);

// Get users by department
router.get(
  "/:id/users",
  departmentsController.findUsersByDepartment.bind(departmentsController)
);

export default router;
