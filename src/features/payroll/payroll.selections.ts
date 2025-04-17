import { Prisma } from "@prisma/client";

export const defaultPayPeriodSelect = {
  id: true,
  startDate: true,
  endDate: true,
  type: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const payPeriodWithCalculationsSelect = {
  ...defaultPayPeriodSelect,
  calculations: {
    select: {
      id: true,
      userId: true,
      regularHours: true,
      overtimeHours: true,
      holidayHours: true,
      grossPay: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          payRate: true,
        },
      },
      adjustments: {
        select: {
          id: true,
          amount: true,
          reason: true,
          createdBy: true,
        },
      },
    },
  },
} as const;

export type DefaultPayPeriodSelect = Prisma.PayPeriodGetPayload<{
  select: typeof defaultPayPeriodSelect;
}>;

export type PayPeriodWithCalculationsSelect = Prisma.PayPeriodGetPayload<{
  select: typeof payPeriodWithCalculationsSelect;
}>;
