import express from "express";
import { payrollController } from "./payroll.controller";
import { authenticate, authorize } from "@/common/middleware/auth.middleware";
import { ROLES } from "@/common/constants/role.constants";

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.MANAGEMENT)); // All payroll routes require management access

// Get all pay periods
router.get("/periods", payrollController.findAll.bind(payrollController));

// Get pay period by ID
router.get("/periods/:id", payrollController.findById.bind(payrollController));

// Create new pay period
router.post("/periods", payrollController.create.bind(payrollController));

// Update pay period
router.put("/periods/:id", payrollController.update.bind(payrollController));

// Delete pay period (admin only)
router.delete(
  "/periods/:id",
  authorize(ROLES.ADMIN_ONLY),
  payrollController.delete.bind(payrollController)
);

// Calculate payroll
router.post(
  "/calculate/:id",
  payrollController.calculatePayroll.bind(payrollController)
);

// Add adjustment
router.post(
  "/adjustments",
  payrollController.addAdjustment.bind(payrollController)
);

// Mark pay period as paid
router.post(
  "/periods/:id/paid",
  payrollController.markAsPaid.bind(payrollController)
);

// Export payroll
router.get(
  "/export/:id",
  payrollController.exportPayroll.bind(payrollController)
);

export default router;
