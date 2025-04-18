import { appConfig } from "@/config/app.config";
import { redisPubClient, redisSubClient } from "@/config/redis.config";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "@/common/utils/logger.utils";
import { UnauthorizedError } from "@/common/middleware/error.middleware";

export class SocketService {
  private io: Server;
  private userSockets: Map<string, string[]> = new Map(); // userId => socketIds[]

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: appConfig.cors.origin,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Redis setting
    this.io.adapter(createAdapter(redisPubClient, redisSubClient));

    this.setupSocketAuth();
    this.setupEventHandlers();
    this.setupRedisSubscriber();
  }

  private setupSocketAuth() {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.split(" ")[1];

        if (!token) {
          return next(new UnauthorizedError("Authentication error"));
        }

        const decoded = jwt.verify(token, appConfig.jwt.secret) as any;

        // Save user id to socket
        socket.data.userId = decoded.userId;
        socket.data.role = decoded.role;

        next();
      } catch (error) {
        logger.error("Socket authentication error: ", error);
        next(new UnauthorizedError("Authentication error"));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: Socket) => {
      const userId = socket.data.userId;

      logger.info(`User connected: ${userId}`);

      // User socket id
      if (userId) {
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, []);
        }
        this.userSockets.get(userId)?.push(socket.id);
      }

      // User subscribes to their own notification channel
      socket.join(`user:${userId}`);

      // Admin/Manager subscribes to management channel
      if (["ADMIN", "MANAGER"].includes(socket.data.role)) {
        socket.join("management");
      }

      // Handle disconnection
      socket.on("disconnect", () => {
        logger.info(`User disconnected: ${userId}`);

        if (userId) {
          const userSocketIds = this.userSockets.get(userId) || [];
          const updatedSocketIds = userSocketIds.filter(
            (id) => id !== socket.id
          );

          if (updatedSocketIds.length > 0) {
            this.userSockets.set(userId, updatedSocketIds);
          } else {
            this.userSockets.delete(userId);
          }
        }
      });
    });
  }

  private setupRedisSubscriber() {
    // Subscribe to notification events from Redis
    redisSubClient.subscribe("notifications");

    redisSubClient.on("message", (channel, message) => {
      if (channel === "notifications") {
        try {
          const notification = JSON.parse(message);
          this.sendNotification(notification);
        } catch (error) {
          logger.error("Error processing Redis notification message:", error);
        }
      }
    });
  }

  // Notification sending method
  sendNotification(notification: any) {
    const { userId, type } = notification;

    // Send notification to a specific user
    if (userId) {
      this.io.to(`user:${userId}`).emit("notification", notification);
    }

    // If it's an admin-only notification
    if (type === "ADMIN_ALERT") {
      this.io.to("management").emit("admin_notification", notification);
    }

    // If it's a general broadcast notification
    if (type === "GENERAL" && notification.broadcast) {
      this.io.emit("broadcast", notification);
    }
  }

  // Method to publish notifications from external sources
  publishNotification(notification: any) {
    redisPubClient.publish("notifications", JSON.stringify(notification));
  }
}

export let socketService: SocketService;

export const initSocketService = (server: HttpServer) => {
  socketService = new SocketService(server);
  return socketService;
};
