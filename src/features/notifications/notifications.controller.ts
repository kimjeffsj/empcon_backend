import { NextFunction, Request, Response } from "express";
import { notificationsService } from "./notifications.service";
import { logger } from "@/common/utils/logger.utils";
import { UnauthorizedError } from "@/common/middleware/error.middleware";

export class NotificationsController {
  /**
   * Find notification list for all users
   */
  async findAllForUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError("Unauthorized");
      }

      const result = await notificationsService.findAllForUser(
        userId,
        req.query
      );

      res.status(200).json({
        message: "Notifications retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark as read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const userId = req.user?.userId;

      if (!userId) {
        throw new UnauthorizedError("Unauthorized");
      }

      await notificationsService.markAsRead(id, userId);

      res.status(200).json({
        message: "Notification marked as read",
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new UnauthorizedError("Unauthorized");
      }

      const count = await notificationsService.markAllAsRead(userId);

      res.status(200).json({
        message: `${count} notifications marked as read`,
        count,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Notification
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const userId = req.user?.userId;

      if (!userId) {
        throw new UnauthorizedError("Unauthorized");
      }

      await notificationsService.delete(id, userId);

      res.status(200).json({
        message: "Notification deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send Notification(Management only)
   */
  async sendNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, title, message, type, relatedId } = req.body;

      const notification = await notificationsService.createNotification({
        userId,
        title,
        message,
        type,
        relatedId,
      });

      res.status(201).json({
        message: "Notification sent successfully",
        data: notification,
      });
      return;
    } catch (error) {
      logger.error("Error sending notification:", error);
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();
