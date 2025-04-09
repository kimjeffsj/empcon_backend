import { PaginatedResponse, SearchQueryParams } from "@/common/dto/common.dto";
import { Department } from "@prisma/client";

export interface BaseDepartmentDto {
  name: string;
  description?: string;
}

export interface CreateDepartmentDto extends BaseDepartmentDto {}

export interface UpdateDepartmentDto extends BaseDepartmentDto {}

export interface DepartmentQueryParams extends SearchQueryParams {}

export type PaginatedDepartmentResponse = PaginatedResponse<Department>;
