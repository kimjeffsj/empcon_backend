import { appConfig } from "@/config/app.config";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "./error.middleware";
import { logger } from "../utils/logger.utils";

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

/**
 * JWT authentication
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader?.split(" ")[1];

  if (!token) {
    return next(new UnauthorizedError("Authentication token is required"));
  }

  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret) as JwtPayload;

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.error("JWT verification failed", { error });
    return next(new UnauthorizedError("Invalid or expired token"));
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new UnauthorizedError("Not authorized to access this resource")
      );
    }

    next();
  };
};
