/**
 * Utility function to remove password field from data
 */
export function excludePassword<T extends { password: string }>(
  user: T
): Omit<T, "password"> {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Utility function to remove password fields from an array of objects
 */
export function excludePasswordFromArray<T extends { password: string }>(
  users: T[]
): Omit<T, "password">[] {
  return users.map((user) => excludePassword(user));
}

/**
 * Date utility functions with date range capabilities
 */
export const dateUtils = {
  /**
   * Returns current date
   */
  now(): Date {
    return new Date();
  },

  /**
   * Returns date from n days ago
   */
  daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  },

  /**
   * Returns date n days from now
   */
  daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  },

  /**
   * Calculate days between two dates
   */
  daysBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Convert date to YYYY-MM-DD format string
   */
  formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  },
};

/**
 * Utility function for pagination
 */
export function getPaginationParams(page?: string, limit?: string) {
  const parsedPage = parseInt(page || "1", 10);
  const parsedLimit = parseInt(limit || "10", 10);

  return {
    page: parsedPage > 0 ? parsedPage : 1,
    limit: parsedLimit > 0 ? parsedLimit : 10,
    skip:
      (parsedPage > 0 ? parsedPage - 1 : 0) *
      (parsedLimit > 0 ? parsedLimit : 10),
  };
}
