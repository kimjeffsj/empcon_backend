import { Prisma } from "@prisma/client";

export const defaultLeaveTypeSelect = {
  id: true,
  name: true,
  description: true,
  paidLeave: true,
  requiresBalance: true,
  defaultDays: true,
  allowsCarryOver: true,
  allowsPayout: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const defaultLeaveBalanceSelect = {
  id: true,
  userId: true,
  leaveTypeId: true,
  balanceDays: true,
  year: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const leaveBalanceWithTypeAndUserSelect = {
  ...defaultLeaveBalanceSelect,
  leaveType: {
    select: {
      id: true,
      name: true,
      paidLeave: true,
      requiresBalance: true,
    },
  },
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export const defaultLeaveRequestSelect = {
  id: true,
  userId: true,
  leaveTypeId: true,
  startDate: true,
  endDate: true,
  totalDays: true,
  halfDay: true,
  status: true,
  notes: true,
  approvedBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const leaveRequestWithDetailsSelect = {
  ...defaultLeaveRequestSelect,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  leaveType: {
    select: {
      id: true,
      name: true,
      paidLeave: true,
      requiresBalance: true,
    },
  },
} as const;

// Types
export type DefaultLeaveTypeSelect = Prisma.LeaveTypeGetPayload<{
  select: typeof defaultLeaveTypeSelect;
}>;

export type DefaultLeaveBalanceSelect = Prisma.LeaveBalanceGetPayload<{
  select: typeof defaultLeaveBalanceSelect;
}>;

export type LeaveBalanceWithTypeAndUserSelect = any;

export type DefaultLeaveRequestSelect = Prisma.LeaveRequestGetPayload<{
  select: typeof defaultLeaveRequestSelect;
}>;

export type LeaveRequestWithDetailsSelect = any;
