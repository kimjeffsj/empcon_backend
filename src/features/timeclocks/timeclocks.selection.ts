import { Prisma } from "@prisma/client";

/**
 * Default time clock selection
 */
export const defaultTimeClockSelect = {
  id: true,
  userId: true,
  clockInTime: true,
  clockOutTime: true,
  totalMinutes: true,
  scheduleId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Time clock selection with user info
 */
export const timeClockWithUserSelect = {
  ...defaultTimeClockSelect,
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
  schedule: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      scheduleType: true,
    },
  },
} as const;

/**
 * Types for the selection results
 */
export type DefaultTimeClockSelect = Prisma.TimeClockGetPayload<{
  select: typeof defaultTimeClockSelect;
}>;

export type TimeClockWithUserSelect = Prisma.TimeClockGetPayload<{
  select: typeof timeClockWithUserSelect;
}>;
