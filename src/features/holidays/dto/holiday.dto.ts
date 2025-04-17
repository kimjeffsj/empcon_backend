import { PaginatedResponse, SearchQueryParams } from "@/common/dto/common.dto";
import { StatutoryHoliday } from "@prisma/client";

export interface BaseHolidayDto {
  name: string;
  date: string | Date;
  year: number;
  province: string;
}

export interface CreateHolidayDto extends BaseHolidayDto {}

export interface UpdateHolidayDto extends Partial<BaseHolidayDto> {}

export interface HolidayQueryParams extends SearchQueryParams {
  year?: number;
  province?: string;
}

export type PaginatedHolidayResponse = PaginatedResponse<StatutoryHoliday>;
