import { ROLES } from "@/common/constants/role.constants";
import { authenticate, authorize } from "@/common/middleware/auth.middleware";
import { Router } from "express";
import { usersController } from "./users.controller";

const router = Router();

// Authentication middleware for all user routes
router.use(authenticate);

// Get all users
router.get(
  "/",
  authorize(ROLES.MANAGEMENT),
  usersController.findAll.bind(usersController)
);

// Get new employees (last 30 days)
router.get(
  "/new",
  authorize(ROLES.MANAGEMENT),
  usersController.getNewEmployees.bind(usersController)
);

// Get resigned employees
router.get(
  "/resigned",
  authorize(ROLES.MANAGEMENT),
  usersController.getResignedEmployees.bind(usersController)
);

// Create new user
router.post(
  "/",
  authorize(ROLES.ADMIN_ONLY),
  usersController.create.bind(usersController)
);

/**
 * Get User by ID
 * User can access their own profile
 * Management can access any users
 */
router.get(
  "/:id",
  (req, res, next) => {
    if (req.user?.userId === req.params.id) {
      return next();
    }
    return authorize(ROLES.MANAGEMENT)(req, res, next);
  },

  usersController.findById.bind(usersController)
);

/**
 * Update User
 * User can access their own information
 * Admin can update any users
 */
router.put(
  "/:id",
  (req, res, next) => {
    if (req.user?.userId === req.params.id) {
      if (req.body.role && req.user.role !== "ADMIN") {
        delete req.body.role;
      }
      return next();
    }
    return authorize(ROLES.ADMIN_ONLY)(req, res, next);
  },
  usersController.update.bind(usersController)
);

/**
 * Update user Profile
 * User can update their profile
 * Admin can update any user's profile
 */
router.put(
  "/:id/profile",
  (req, res, next) => {
    if (req.user?.userId === req.params.id) {
      return next();
    }
    return authorize(ROLES.ADMIN_ONLY)(req, res, next);
  },
  usersController.updateProfile.bind(usersController)
);

// Delete user (admin only)
router.delete(
  "/:id",
  authorize(ROLES.ADMIN_ONLY),
  usersController.delete.bind(usersController)
);

export default router;
