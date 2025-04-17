import { PaginatedResponse, SearchQueryParams } from "@/common/dto/common.dto";
import { LeaveRequest, LeaveRequestStatus } from "@prisma/client";

// Leave Type DTOs
export interface BaseLeaveTypeDto {
  name: string;
  description?: string;
  paidLeave: boolean;
  requiresBalance: boolean; // 잔액 관리 on/off용 플래그
  defaultDays?: number; // 기본 부여 일수 (requiresBalance가 true일 때 사용)
  allowsCarryOver?: boolean; // 미사용 휴가 이월 허용 여부
  allowsPayout?: boolean; // 휴가 수당 지급 허용 여부
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
  days: number; // 양수: 증가, 음수: 감소
  reason: string;
  year?: number; // 지정하지 않으면 현재 연도
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
