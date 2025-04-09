/**
 * Common query parameters for pagination and search
 */
export interface PaginationQueryParams {
  page?: string;
  limit?: string;
}

/**
 * Common query parameters with search functionality
 */
export interface SearchQueryParams extends PaginationQueryParams {
  search?: string;
}

/**
 * Generic paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Standard success response with data
 */
export interface SuccessResponse<T> {
  message: string;
  data: T;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string | string[]>;
}
