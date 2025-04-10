import { Prisma } from "@prisma/client";

/**
 * Default schedule selection
 */
export const defaultScheduleSelect = {
  id: true,
  userId: true,
  startTime: true,
  endTime: true,
  breakTime: true,
  scheduleType: true,
  isStatutoryHoliday: true,
  notes: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Schedule selection with user info
 */
export const scheduleWithUserSelect = {
  ...defaultScheduleSelect,
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
} as const;

/**
 * Schedule selection with user and time clocks
 */
export const scheduleWithDetailsSelect = {
  ...scheduleWithUserSelect,
  timeClocks: {
    select: {
      id: true,
      clockInTime: true,
      clockOutTime: true,
      totalMinutes: true,
    },
  },
  adjustmentRequests: {
    select: {
      id: true,
      requestType: true,
      reason: true,
      status: true,
      requestedStartTime: true,
      requestedEndTime: true,
      requestedBreakTime: true,
    },
  },
} as const;

/**
 * Types for the selection results
 */
export type DefaultScheduleSelect = Prisma.ScheduleGetPayload<{
  select: typeof defaultScheduleSelect;
}>;

export type ScheduleWithUserSelect = Prisma.ScheduleGetPayload<{
  select: typeof scheduleWithUserSelect;
}>;

export type ScheduleWithDetailsSelect = Prisma.ScheduleGetPayload<{
  select: typeof scheduleWithDetailsSelect;
}>;
