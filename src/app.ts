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
app.use(`/api/auth`, authRoutes);

// 404 Error handler
app.use(notFoundHandler);

// Global Error handler
app.use(errorHandler);

export default app;
