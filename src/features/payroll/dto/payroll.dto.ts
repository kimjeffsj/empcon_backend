import { PaginatedResponse, SearchQueryParams } from "@/common/dto/common.dto";
import { PayPeriodStatus, PayPeriodType } from "@prisma/client";

export interface BasePayPeriodDto {
  startDate: string | Date;
  endDate: string | Date;
  type: PayPeriodType;
  status?: PayPeriodStatus;
}

export interface CreatePayPeriodDto extends BasePayPeriodDto {}

export interface UpdatePayPeriodDto extends Partial<BasePayPeriodDto> {}

export interface PayPeriodQueryParams extends SearchQueryParams {
  status?: PayPeriodStatus;
  startDate?: string;
  endDate?: string;
  type?: PayPeriodType;
}

export interface PayCalculationResult {
  userId: string;
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  grossPay: number;
}

export interface PayAdjustmentDto {
  payCalculationId: string;
  amount: number;
  reason: string;
  createdBy: string;
}

export interface PayPeriodWithCalculations {
  id: string;
  startDate: Date;
  endDate: Date;
  type: PayPeriodType;
  status: PayPeriodStatus;
  calculations: {
    id: string;
    userId: string;
    regularHours: number;
    overtimeHours: number;
    holidayHours: number;
    grossPay: number;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      payRate: number | null;
    };
    adjustments: {
      id: string;
      amount: number;
      reason: string;
      createdBy: string;
    }[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export type PaginatedPayPeriodResponse =
  PaginatedResponse<PayPeriodWithCalculations>;

export interface ExportPayrollDto {
  payPeriodId: string;
  format?: "xlsx" | "csv";
}
