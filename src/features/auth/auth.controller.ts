import { NextFunction, Request, Response } from "express";
import { authService } from "./auth.service";
import {
  UnauthorizedError,
  ValidationError,
} from "@/common/middleware/error.middleware";
import { logger } from "@/common/utils/logger.utils";

export class AuthController {
  /**
   * Login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError({
          message: "Email and Password are required",
        });
      }

      const result = await authService.login({ email, password });

      return res.status(200).json({
        message: "Login successful",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh Token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new UnauthorizedError("Refresh token is required");
      }
    } catch (error) {}
  }

  /**
   * Request Password reset
   */
  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ValidationError({ message: "Email is required" });
      }

      const result = await authService.requestPasswordReset({ email });

      return res.status(200).json(result);
    } catch (error) {
      logger.error("Password reset request error: ", error);
      next(error);
    }
  }

  /**
   * Reset Password
   * */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        throw new ValidationError({
          message: "Token and new password are required",
        });
      }

      const result = await authService.resetPassword({ token, password });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
