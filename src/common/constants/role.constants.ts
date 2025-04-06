/**
 * User Role constant
 */
export enum Role {
  EMPLOYEE = "EMPLOYEE",
  MANAGER = "MANAGER",
  ADMIN = "ADMIN",
}

export const ROLES = {
  ALL_AUTHENTICATED: [Role.EMPLOYEE, Role.MANAGER, Role.ADMIN],
  ADMIN_ONLY: [Role.ADMIN],
  MANAGEMENT: [Role.MANAGER, Role.ADMIN],
};
