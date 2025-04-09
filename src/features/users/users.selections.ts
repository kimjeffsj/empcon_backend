import { Prisma } from "@prisma/client";

/**
 * Default user selection without password
 */
export const defaultUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  hireDate: true,
  terminationDate: true,
  role: true,
  departmentId: true,
  positionId: true,
  payRate: true,
  payPeriodType: true,
  overtimeEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * User selection with relations (profile, department, position)
 */
export const userWithRelationsSelect = {
  ...defaultUserSelect,
  profile: true,
  department: true,
  position: true,
} as const;

/**
 * User selection for list views (fewer fields)
 */
export const userListSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  hireDate: true,
  terminationDate: true,
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  position: {
    select: {
      id: true,
      title: true,
    },
  },
} as const;

/**
 * Types for the selection results
 */
export type DefaultUserSelect = Prisma.UserGetPayload<{
  select: typeof defaultUserSelect;
}>;

export type UserWithRelationsSelect = Prisma.UserGetPayload<{
  select: typeof userWithRelationsSelect;
}>;

export type UserListSelect = Prisma.UserGetPayload<{
  select: typeof userListSelect;
}>;
