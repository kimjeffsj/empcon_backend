import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { appConfig } from "./config/app.config";
import {
  errorHandler,
  notFoundHandler,
} from "./common/middleware/error.middleware";

// Import routes
import authRoutes from "@/features/auth/auth.routes";
import userRoutes from "@/features/users/users.routes";
import departmentRoutes from "@/features/departments/departments.routes";
import positionRoutes from "@/features/positions/positions.routes";
import scheduleRoutes from "@/features/schedules/schedules.routes";
import timeClockRoutes from "@/features/timeclocks/timeclocks.routes";
import holidaysRoutes from "@/features/holidays/holidays.routes";
import payrollRoutes from "@/features/payroll/payroll.routes";
import leavesRoutes from "@/features/leaves/leaves.routes";
import notificationsRoutes from "@/features/notifications/notifications.routes";

dotenv.config();

const app: Application = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: appConfig.cors.origin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to EmpCon API",
    version: "1.0.0",
    status: "running",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/timeclocks", timeClockRoutes);
app.use("/api/holidays", holidaysRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/leaves", leavesRoutes);
app.use("/api/notifications", notificationsRoutes);

// 404 Error handler
app.use(notFoundHandler);

// Global Error handler
app.use(errorHandler);

export default app;
