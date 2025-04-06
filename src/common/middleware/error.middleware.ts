import { appConfig } from "@/config/app.config";
import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.utils";

/**
 * Base API error class
 */
export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}

/**
 * Validation Error
 */
export class ValidationError extends Error {
  statusCode = 400;
  errors: any;

  constructor(errors: any, message = "Validation Error") {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Authentication Error
 */
export class UnauthorizedError extends Error {
  statusCode = 401;

  constructor(message = "Unauthorized - Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Forbidden Error
 */
export class ForbiddenError extends Error {
  statusCode = 403;

  constructor(message = "Forbidden - Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Resource Not Found Error
 */
export class NotFoundError extends Error {
  statusCode = 404;
  resource: string;

  constructor(resource = "Resource", message?: string) {
    super(message || `${resource} not found`);
    this.name = "NotFoundError";
    this.resource = resource;
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends Error {
  statusCode = 409;
  field: string;

  constructor(field: string, message?: string) {
    super(message || `${field} already exists`);
    this.name = "ConflictError";
    this.field = field;
  }
}

/**
 * Route Not Found Error handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
};

/**
 * Global Error handler
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error(`Error occurred: ${err.message}`, {
    path: req.path,
    method: req.method,
    error: err,
  });

  // Default values
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors = null;

  // Handle specific error types
  if (
    err instanceof ApiError ||
    err instanceof ValidationError ||
    err instanceof UnauthorizedError ||
    err instanceof ForbiddenError ||
    err instanceof NotFoundError ||
    err instanceof ConflictError
  ) {
    // Process all custom error classes
    statusCode = (err as any).statusCode;
    message = err.message;

    // Add errors object for ValidationError
    if (err instanceof ValidationError) {
      errors = err.errors;
    }
  }
  // Handle Prisma related errors
  else if (err.name === "PrismaClientKnownRequestError") {
    // Handle specific Prisma error codes
    const prismaError = err as any;
    statusCode = 400;

    // Uniqueness constraint violation (P2002)
    if (prismaError.code === "P2002") {
      const field = prismaError.meta?.target?.[0] || "field";
      message = `Duplicate entry: ${field} already exists`;
    }
    // Relationship constraint violation (P2003)
    else if (prismaError.code === "P2003") {
      message = "Related record not found";
    }
    // Record not found (P2001)
    else if (prismaError.code === "P2001") {
      statusCode = 404;
      message = "Record not found";
    }
    // Other Prisma errors
    else {
      message = "Database operation failed";
    }
  }

  // Construct the error response
  const responseBody: any = {
    success: false,
    message,
  };

  // Add details for validation errors
  if (errors) {
    responseBody.errors = errors;
  }

  // Include stack trace in development environment
  if (appConfig.isDevelopment || appConfig.isTest) {
    responseBody.stack = err.stack;
    // Include additional info for Prisma errors
    if (err.name === "PrismaClientKnownRequestError") {
      responseBody.prismaError = {
        code: (err as any).code,
        meta: (err as any).meta,
      };
    }
  }

  return res.status(statusCode).json(responseBody);
};
