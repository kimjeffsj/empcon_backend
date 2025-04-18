import Redis from "ioredis";
import { logger } from "../common/utils/logger.utils";

export const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,

  // Redis session TTL (24 hours)
  sessionTtl: 86400,

  // Redis cache TTL (5 minutes)
  cacheTtl: 300,
};

// Create Redis client
export const createRedisClient = (): Redis => {
  const client = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
  });

  client.on("connect", () => {
    logger.info("Connected to Redis");
  });

  client.on("error", (err) => {
    logger.error("Redis connection error:", err);
  });

  return client;
};

// Redis client instance
export const redisClient = createRedisClient();

// Redis Pub/Sub client for notifications
export const redisPubClient = createRedisClient();
export const redisSubClient = createRedisClient();
