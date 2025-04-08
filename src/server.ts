import app from "./app";
import { logger } from "./common/utils/logger.utils";
import { appConfig } from "./config/app.config";

const PORT = appConfig.port;

// Start Server
app.listen(PORT, () => {
  logger.info(`Server running in ${appConfig.nodeEnv} mode on port ${PORT}`);
});

// Uncaught Error
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason });
  process.exit(1);
});
