import { PaginatedResponse, SearchQueryParams } from "@/common/dto/common.dto";
import { TimeClock } from "@prisma/client";

/**
 * Base DTO for time clock operations
 */
export interface BaseTimeClockDto {
  userId: string;
  scheduleId?: string;
  notes?: string;
}

/**
 * Clock-in DTO
 */
export interface ClockInDto extends BaseTimeClockDto {}

/**
 * Clock-out DTO
 */
export interface ClockOutDto {
  notes?: string;
}

/**
 * Update time clock DTO
 */
export interface UpdateTimeClockDto {
  clockInTime?: string | Date;
  clockOutTime?: string | Date | null;
  notes?: string;
  scheduleId?: string;
}

/**
 * Query parameters for time clock listing
 */
export interface TimeClockQueryParams extends SearchQueryParams {
  userId?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  completed?: string; // 'true' or 'false'
}

/**
 * Time clock with user info for responses
 */
export interface TimeClockWithUser extends TimeClock {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: {
      id: string;
      name: string;
    } | null;
  };
  schedule?: {
    id: string;
    startTime: Date;
    endTime: Date;
    scheduleType: string;
  } | null;
}

/**
 * Response structure for paginated time clock lists
 */
export type PaginatedTimeClockResponse = PaginatedResponse<TimeClockWithUser>;
