import { PaginatedResponse, SearchQueryParams } from "@/common/dto/common.dto";
import { Position } from "@prisma/client";

/**
 * Base DTO for position operations
 */
export interface BasePositionDto {
  title: string;
  description?: string;
}

/**
 * Position creation DTO
 */
export interface CreatePositionDto extends BasePositionDto {}

/**
 * Position update DTO
 */
export interface UpdatePositionDto extends Partial<BasePositionDto> {}

/**
 * Query parameters for position listing
 */
export interface PositionQueryParams extends SearchQueryParams {}

/**
 * Response structure for paginated position lists
 */
export type PaginatedPositionResponse = PaginatedResponse<Position>;
