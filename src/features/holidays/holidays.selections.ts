import { Prisma } from "@prisma/client";

export const defaultHolidaySelect = {
  id: true,
  name: true,
  date: true,
  year: true,
  province: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type DefaultHolidaySelect = Prisma.StatutoryHolidayGetPayload<{
  select: typeof defaultHolidaySelect;
}>;
