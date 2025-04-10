import { PaginatedResponse, SearchQueryParams } from "@/common/dto/common.dto";
import { Schedule, ScheduleType } from "@prisma/client";

/**
 * Base DTO for schedule operations
 */
export interface BaseScheduleDto {
  userId: string;
  startTime: string | Date;
  endTime: string | Date;
  breakTime?: number;
  scheduleType?: ScheduleType;
  isStatutoryHoliday?: boolean;
  notes?: string;
}

/**
 * Schedule creation DTO
 */
export interface CreateScheduleDto extends BaseScheduleDto {
  createdBy: string; // manager who creates the schedule
}

/**
 * Schedule update DTO
 */
export interface UpdateScheduleDto extends Partial<BaseScheduleDto> {}

/**
 * Batch schedule creation DTO
 */
export interface BatchScheduleDto {
  schedules: CreateScheduleDto[];
}

/**
 * Query parameters for schedule listing
 */
export interface ScheduleQueryParams extends SearchQueryParams {
  userId?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  scheduleType?: ScheduleType;
}

/**
 * Schedule with user info for responses
 */
export interface ScheduleWithUser extends Schedule {
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
}

/**
 * Response structure for paginated schedule lists
 */
export type PaginatedScheduleResponse = PaginatedResponse<ScheduleWithUser>;
