import { NotFoundError } from "@/common/middleware/error.middleware";
import {
  createPaginatedResponse,
  getPaginationParams,
} from "@/common/utils/helpers.utils";
import { logger } from "@/common/utils/logger.utils";
import prisma from "@/entities/prisma";
import { Prisma } from "@prisma/client";
import { socketService } from "@/socket/socket.service";
import { EmailService } from "@/services/email.service";
import { redisClient } from "@/config/redis.config";
import {
  NotificationDto,
  NotificationQueryParams,
} from "./dto/notification.dto";

// initialize email service
const emailService = new EmailService();

export class NotificationsService {
  /**
   * Find all notification for the user
   */
  async findAllForUser(
    userId: string,
    queryParams: NotificationQueryParams = {}
  ) {
    const { page, limit, unreadOnly, type, startDate, endDate } = queryParams;
    const pagination = getPaginationParams(page, limit);

    const where: Prisma.NotificationWhereInput = { userId };

    // Query only unread notifications
    if (unreadOnly === "true") {
      where.isRead = false;
    }

    // Notification type filter
    if (type) {
      where.type = type;
    }

    // Date range filter
    if (startDate || endDate) {
      where.AND = [];

      if (startDate) {
        where.AND.push({
          createdAt: {
            gte: new Date(startDate),
          },
        });
      }

      if (endDate) {
        where.AND.push({
          createdAt: {
            lte: new Date(endDate),
          },
        });
      }
    }

    const total = await prisma.notification.count({ where });

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    // Cache unread notification in Redis
    if (unreadOnly !== "true") {
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      await redisClient.set(
        `unread_notifications:${userId}`,
        unreadCount,
        "EX",
        300
      ); // 5 minutes cache
    }

    return createPaginatedResponse(
      notifications,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Notification detail
   */
  async findById(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundError("Notification");
    }

    return notification;
  }

  /**
   * Get Unread notification count(use cache)
   */
  async getUnreadCount(userId: string) {
    // Check cache
    const cachedCount = await redisClient.get(`unread_notifications:${userId}`);

    if (cachedCount !== null) {
      return parseInt(cachedCount, 10);
    }

    // If no cache, query db
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    // Cache result for 5 mins
    await redisClient.set(`unread_notifications:${userId}`, count, "EX", 300);

    return count;
  }

  /**
   * Mark as read
   */
  async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundError("Notification");
    }

    if (notification.isRead) {
      return notification;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    redisClient.del(`unread_notifications:${userId}`);

    return updated;
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    // Update cache
    if (result.count > 0) {
      redisClient.set(`unread_notifications:${userId}`, 0, "EX", 300);
    }

    return result.count;
  }

  /**
   * Delete notification
   */
  async delete(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundError("Notification");
    }

    await prisma.notification.delete({
      where: { id },
    });

    if (!notification.isRead) {
      redisClient.del(`unread_notifications:${userId}`);
    }

    return { success: true };
  }

  /**
   * Clean up
   */
  async cleanupOldNotifications(olderThan: Date) {
    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: olderThan,
        },
        isRead: true, // delete only read notification
      },
    });

    logger.info(`Cleaned up ${result.count} old notifications`);
    return result.count;
  }

  /**
   * Create notification and send
   */
  async createNotification(data: NotificationDto) {
    const {
      userId,
      title,
      message,
      type,
      relatedId,
      sendEmail = false,
      priority = "normal",
    } = data;

    try {
      // Save notification
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          relatedId,
        },
      });

      // Update redis cache update unread count
      const cachedCount = await redisClient.get(
        `unread_notifications:${userId}`
      );
      if (cachedCount !== null) {
        await redisClient.incr(`unread_notifications:${userId}`);
      }

      // Send real time notification with Socket.io
      if (socketService) {
        socketService.publishNotification({
          ...notification,
          priority,
        });
      }

      // Email notification
      // TODO: 추후 선택적으로 사용
      if (sendEmail) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, firstName: true, lastName: true },
        });

        if (user?.email) {
          const userName = `${user.firstName} ${user.lastName}`;

          switch (type) {
            case "SCHEDULE_CHANGE":
              if (relatedId) {
                const schedule = await prisma.schedule.findUnique({
                  where: { id: relatedId },
                });
                if (schedule) {
                  emailService
                    .sendScheduleChangeNotification(
                      user.email,
                      userName,
                      schedule
                    )
                    .catch((err) =>
                      logger.error("Failed to send schedule change email:", err)
                    );
                }
              } else {
                emailService
                  .sendNotificationEmail(user.email, title, message, type)
                  .catch((err) =>
                    logger.error("Failed to send email notification:", err)
                  );
              }
              break;

            case "LEAVE_UPDATE":
              if (relatedId) {
                const leaveRequest = await prisma.leaveRequest.findUnique({
                  where: { id: relatedId },
                });
                if (leaveRequest) {
                  emailService
                    .sendLeaveRequestUpdateNotification(
                      user.email,
                      userName,
                      leaveRequest.status,
                      leaveRequest
                    )
                    .catch((err) =>
                      logger.error("Failed to send leave update email:", err)
                    );
                }
              } else {
                emailService
                  .sendNotificationEmail(user.email, title, message, type)
                  .catch((err) =>
                    logger.error("Failed to send email notification:", err)
                  );
              }
              break;

            default:
              emailService
                .sendNotificationEmail(user.email, title, message, type)
                .catch((err) =>
                  logger.error("Failed to send email notification:", err)
                );
          }
        }
      }

      return notification;
    } catch (error) {
      logger.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Send notifications to users helper
   */
  async createBatchNotifications(
    userIds: string[],
    data: Omit<NotificationDto, "userId">
  ) {
    try {
      // Notifications to all users
      const notifications = await Promise.all(
        userIds.map((userId) =>
          this.createNotification({
            ...data,
            userId,
          })
        )
      );

      return {
        count: notifications.length,
        success: true,
      };
    } catch (error) {
      logger.error("Error creating batch notifications:", error);
      throw error;
    }
  }

  /**
   * Create Notification for department
   */
  async createDepartmentNotifications(
    departmentId: string,
    data: Omit<NotificationDto, "userId">
  ) {
    try {
      // Query user id in the department
      const users = await prisma.user.findMany({
        where: {
          departmentId,
        },
        select: {
          id: true,
        },
      });

      const userIds = users.map((user) => user.id);

      return this.createBatchNotifications(userIds, data);
    } catch (error) {
      logger.error("Error creating department notifications:", error);
      throw error;
    }
  }

  /**
   * Create All user notifications
   */
  async createBroadcastNotification(
    data: Omit<NotificationDto, "userId">,
    excludeUserIds: string[] = []
  ) {
    try {
      const users = await prisma.user.findMany({
        where: {
          id: {
            notIn: excludeUserIds,
          },
        },
        select: {
          id: true,
        },
      });

      const userIds = users.map((user) => user.id);

      return this.createBatchNotifications(userIds, data);
    } catch (error) {
      logger.error("Error creating broadcast notification:", error);
      throw error;
    }
  }
}

export const notificationsService = new NotificationsService();
