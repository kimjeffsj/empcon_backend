import { PayPeriodType, Role } from "@prisma/client";

/**
 * Base DTO for user creation and update operations
 */
export interface BaseUserDto {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  hireDate: string;
  terminationDate?: string;
  role?: Role;
  departmentId?: string;
  positionId?: string;
  payRate?: number;
  payPeriodType?: PayPeriodType;
  overtimeEnabled?: boolean;
}

/**
 * User creation DTO
 */
export interface CreateUserDto extends BaseUserDto {
  password: string;
  confirmPassword?: string;
  profile?: {
    address?: string;
    socialInsuranceNumber?: string;
    comments?: string;
    emergencyContact?: string;
  };
}

/**
 * User update DTO
 */
export interface UpdateUserDto extends Partial<BaseUserDto> {
  password?: string;
  confirmPassword?: string;
  profile?: {
    address?: string;
    socialInsuranceNumber?: string;
    comments?: string;
    emergencyContact?: string;
  };
}

/**
 * User profile update DTO
 */
export interface UpdateUserProfileDto {
  address?: string;
  socialInsuranceNumber?: string;
  comments?: string;
  emergencyContact?: string;
}

/**
 * Query parameters for user listing
 */
export interface UserQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  departmentId?: string;
  role?: Role;
  isActive?: string; // "true" or "false"
}

/**
 * Response structure for paginated user lists
 */
export interface PaginatedUserResponse {
  data: Array<any>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
