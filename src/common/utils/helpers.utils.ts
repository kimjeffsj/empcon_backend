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
 * Pagination parameters interface
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Utility function for pagination
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Pagination parameters
 */
export function getPaginationParams(
  page?: string | number,
  limit?: string | number
): PaginationParams {
  const parsedPage = typeof page === "string" ? parseInt(page, 10) : page || 1;
  const parsedLimit =
    typeof limit === "string" ? parseInt(limit, 10) : limit || 10;

  return {
    page: parsedPage > 0 ? parsedPage : 1,
    limit: parsedLimit > 0 ? parsedLimit : 10,
    skip:
      (parsedPage > 0 ? parsedPage - 1 : 0) *
      (parsedLimit > 0 ? parsedLimit : 10),
  };
}

/**
 * Calculate total pages based on total items and limit
 * @param total - Total number of items
 * @param limit - Items per page
 * @returns Total number of pages
 */
export function calculateTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Create paginated response object
 * @param data - Array of items
 * @param total - Total number of items
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: calculateTotalPages(total, limit),
  };
}
