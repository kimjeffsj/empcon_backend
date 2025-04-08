import { Secret } from "jsonwebtoken";

export const appConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
  isTest: process.env.NODE_ENV === "test",

  port: parseInt(process.env.PORT || "3002", 10),
  apiPrefix: "/api",

  jwt: {
    secret: process.env.JWT_SECRET || ("your_jwt_secret_key" as Secret),
    expiresIn: "15m",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_secret_key",
    refreshExpiresIn: "2h",
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
  },

  cors: {
    origin: process.env.CORS_ORIGIN || "*",
  },
};
