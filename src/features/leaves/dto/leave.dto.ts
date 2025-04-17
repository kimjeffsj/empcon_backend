import { PaginatedResponse, SearchQueryParams } from "@/common/dto/common.dto";
import { LeaveRequest, LeaveRequestStatus } from "@prisma/client";

// Leave Type DTOs
export interface BaseLeaveTypeDto {
  name: string;
  description?: string;
  paidLeave: boolean;
  requiresBalance: boolean; // managing leave balance on/off
  defaultDays?: number; // Default allocated days (used when requiresBalance is true)
  allowsCarryOver?: boolean; // Whether unused leave can be carried over to the next year
  allowsPayout?: boolean; // Whether leave can be paid out as compensation
}

export interface CreateLeaveTypeDto extends BaseLeaveTypeDto {}

export interface UpdateLeaveTypeDto extends Partial<BaseLeaveTypeDto> {}

export interface LeaveTypeQueryParams extends SearchQueryParams {}

// Leave Balance DTOs
export interface BaseLeaveBalanceDto {
  userId: string;
  leaveTypeId: string;
  balanceDays: number;
  year: number;
}

export interface CreateLeaveBalanceDto extends BaseLeaveBalanceDto {}

export interface UpdateLeaveBalanceDto extends Partial<BaseLeaveBalanceDto> {}

export interface AdjustLeaveBalanceDto {
  userId: string;
  leaveTypeId: string;
  days: number; // Positive: increase, Negative: decrease
  reason: string;
  year?: number; // If not specified, the current year
}

export interface LeaveBalanceQueryParams extends SearchQueryParams {
  userId?: string;
  leaveTypeId?: string;
  year?: number;
}

// Leave Request DTOs
export interface BaseLeaveRequestDto {
  userId: string;
  leaveTypeId: string;
  startDate: string | Date;
  endDate: string | Date;
  halfDay?: boolean;
  notes?: string;
}

export interface CreateLeaveRequestDto extends BaseLeaveRequestDto {}

export interface UpdateLeaveRequestDto extends Partial<BaseLeaveRequestDto> {}

export interface ProcessLeaveRequestDto {
  status: LeaveRequestStatus;
  approvedBy: string;
  notes?: string;
}

export interface LeaveRequestQueryParams extends SearchQueryParams {
  userId?: string;
  departmentId?: string;
  leaveTypeId?: string;
  status?: LeaveRequestStatus;
  startDate?: string;
  endDate?: string;
}

// Response Types
export interface LeaveRequestWithDetails extends LeaveRequest {
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
  leaveType?: {
    id: string;
    name: string;
    paidLeave: boolean;
    requiresBalance: boolean;
  } | null;
}

export type PaginatedLeaveTypeResponse = PaginatedResponse<any>;
export type PaginatedLeaveBalanceResponse = PaginatedResponse<any>;
export type PaginatedLeaveRequestResponse =
  PaginatedResponse<LeaveRequestWithDetails>;

export interface LeaveBalanceOverview {
  userId: string;
  userName: string;
  userEmail: string;
  balances: {
    leaveTypeId: string;
    leaveTypeName: string;
    balanceDays: number;
    used: number;
    remaining: number;
    isPaid: boolean;
  }[];
}
