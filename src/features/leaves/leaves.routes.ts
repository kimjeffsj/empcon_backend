import express from "express";
import { leaveTypesController } from "./leave-types.controller";
import { leaveBalancesController } from "./leave-balances.controller";
import { leaveRequestsController } from "./leave-requests.controller";
import { authenticate, authorize } from "@/common/middleware/auth.middleware";
import { ROLES } from "@/common/constants/role.constants";

const router = express.Router();

router.use(authenticate);

// Leave Types routes
router.get("/types", leaveTypesController.findAll.bind(leaveTypesController));

router.get(
  "/types/:id",
  leaveTypesController.findById.bind(leaveTypesController)
);

router.post(
  "/types",
  authorize(ROLES.MANAGEMENT),
  leaveTypesController.create.bind(leaveTypesController)
);

router.put(
  "/types/:id",
  authorize(ROLES.MANAGEMENT),
  leaveTypesController.update.bind(leaveTypesController)
);

router.delete(
  "/types/:id",
  authorize(ROLES.ADMIN_ONLY),
  leaveTypesController.delete.bind(leaveTypesController)
);

// Leave Balances routes
router.get(
  "/balances",
  authorize(ROLES.MANAGEMENT),
  leaveBalancesController.findAll.bind(leaveBalancesController)
);

router.get(
  "/balances/:id",
  authorize(ROLES.MANAGEMENT),
  leaveBalancesController.findById.bind(leaveBalancesController)
);

router.get(
  "/balances/user/:userId",
  (req, res, next) => {
    // Allow users to view their own balances
    if (
      req.user?.userId === req.params.userId ||
      req.user?.role !== "EMPLOYEE"
    ) {
      return next();
    }
    return authorize(ROLES.MANAGEMENT)(req, res, next);
  },
  leaveBalancesController.findByUser.bind(leaveBalancesController)
);

router.post(
  "/balances/check",
  leaveBalancesController.checkBalance.bind(leaveBalancesController)
);

router.post(
  "/balances",
  authorize(ROLES.MANAGEMENT),
  leaveBalancesController.create.bind(leaveBalancesController)
);

router.put(
  "/balances/:id",
  authorize(ROLES.MANAGEMENT),
  leaveBalancesController.update.bind(leaveBalancesController)
);

router.post(
  "/balances/adjust",
  authorize(ROLES.MANAGEMENT),
  leaveBalancesController.adjustBalance.bind(leaveBalancesController)
);

router.delete(
  "/balances/:id",
  authorize(ROLES.ADMIN_ONLY),
  leaveBalancesController.delete.bind(leaveBalancesController)
);

// Leave Requests routes
router.get(
  "/requests",
  (req, res, next) => {
    // Employees can only see their own requests unless filtered
    if (req.user?.role === "EMPLOYEE" && !req.query.userId) {
      req.query.userId = req.user.userId;
    }
    return next();
  },
  leaveRequestsController.findAll.bind(leaveRequestsController)
);

router.get(
  "/requests/:id",
  leaveRequestsController.findById.bind(leaveRequestsController)
);

router.post(
  "/requests",
  leaveRequestsController.create.bind(leaveRequestsController)
);

router.put(
  "/requests/:id",
  leaveRequestsController.update.bind(leaveRequestsController)
);

router.post(
  "/requests/:id/process",
  authorize(ROLES.MANAGEMENT),
  leaveRequestsController.processRequest.bind(leaveRequestsController)
);

router.post(
  "/requests/:id/cancel",
  leaveRequestsController.cancelRequest.bind(leaveRequestsController)
);

router.delete(
  "/requests/:id",
  authorize(ROLES.ADMIN_ONLY),
  leaveRequestsController.delete.bind(leaveRequestsController)
);

export default router;
