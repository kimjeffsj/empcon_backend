export const databaseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "empcon_db",

  // Prisma connection
  get url(): string {
    return `postgresql://${this.username}:${this.password}@${this.host}:${this.port}/${this.database}?schema=public`;
  },
};
