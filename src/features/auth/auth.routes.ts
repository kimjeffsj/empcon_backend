import express from "express";
import { authController } from "./auth.controller";

const router = express.Router();

// Login
router.post("/login", authController.login.bind(authController));

// Refresh Token
router.post("/refresh", authController.refreshToken.bind(authController));

// request password reset
router.post(
  "/reset-password-request",
  authController.requestPasswordReset.bind(authController)
);

// Reset password
router.post(
  "/reset-password",
  authController.resetPassword.bind(authController)
);

export default router;
