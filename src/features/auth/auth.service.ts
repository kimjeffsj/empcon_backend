import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { LoginDto } from "./dto/login.dto";
import {
  ResetPasswordDto,
  ResetPasswordRequestDto,
} from "./dto/reset-password.dto";
import prisma from "../../entities/prisma";
import { appConfig } from "../../config/app.config";
import { ApiError } from "../../common/middleware/error.middleware";
import { excludePassword } from "@/common/utils/helpers.utils";
import { logger } from "@/common/utils/logger.utils";
import { StringValue } from "ms";

export class AuthService {
  /**
   * Login
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, "Invalid credentials");
    }

    const token = this.generateToken(user.id, user.role);

    const refreshToken = this.generateRefreshToken(user.id);

    const userWithoutPassword = excludePassword(user);

    return {
      user: userWithoutPassword,
      token,
      refreshToken,
    };
  }

  /**
   * Refresh Token
   */
  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, appConfig.jwt.refreshSecret) as {
        userId: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const newToken = this.generateToken(user.id, user.role);

      return { token: newToken };
    } catch (error) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }
  }

  /**
   * Request Password reset
   */
  async requestPasswordReset(dto: ResetPasswordRequestDto) {
    const { email } = dto;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return same phrase, for security purposes
      return {
        message:
          "If your email exists in our system, you will receive a password reset link",
      };
    }

    // Issue Password reset token
    const resetToken = this.generatePasswordResetToken(user.id);

    // TODO: Actual email
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    return {
      message:
        "If your email exists in our system, you will receive a password reset link",
    };
  }

  /**
   * Reset Password
   */
  async resetPassword(dto: ResetPasswordDto) {
    const { token, password } = dto;

    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as {
        userId: string;
        purpose: string;
      };

      // Check for password reset
      if (decoded.purpose !== "password-reset") {
        throw new ApiError(400, "Invalid token purpose");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword },
      });

      return { message: "Password has been reset successfully" };
    } catch (error) {
      throw new ApiError(400, "Invalid or expired token");
    }
  }

  /**
   * Generate token
   */
  private generateToken(userId: string, role: string) {
    return jwt.sign({ userId, role }, appConfig.jwt.secret, {
      expiresIn: appConfig.jwt.expiresIn as StringValue,
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(userId: string) {
    // TODO: sign No overload matches error
    return jwt.sign({ userId }, appConfig.jwt.refreshSecret, {
      expiresIn: appConfig.jwt.refreshExpiresIn as StringValue,
    });
  }

  /**
   * Generate reset password token
   */
  private generatePasswordResetToken(userId: string) {
    return jwt.sign(
      { userId, purpose: "password-reset" },
      appConfig.jwt.secret,
      { expiresIn: "1h" }
    );
  }
}

export const authService = new AuthService();
