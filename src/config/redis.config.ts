export const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),

  // Redis session TTL (24 hours)
  sessionTtl: 86400,

  // Redis cache TTL (5 minutes)
  cacheTtl: 300,
};
