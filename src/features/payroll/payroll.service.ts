import {
  ValidationError,
  NotFoundError,
} from "@/common/middleware/error.middleware";
import {
  createPaginatedResponse,
  getPaginationParams,
} from "@/common/utils/helpers.utils";
import { logger } from "@/common/utils/logger.utils";
import prisma from "@/entities/prisma";
import {
  Prisma,
  PayPeriodStatus,
  PayPeriodType,
  ScheduleType,
} from "@prisma/client";
import { holidaysService } from "../holidays/holidays.service";
import {
  CreatePayPeriodDto,
  PaginatedPayPeriodResponse,
  PayAdjustmentDto,
  PayCalculationResult,
  PayPeriodQueryParams,
  UpdatePayPeriodDto,
} from "./dto/payroll.dto";
import {
  payPeriodWithCalculationsSelect,
  defaultPayPeriodSelect,
  PayPeriodWithCalculationsSelect,
} from "./payroll.selections";

export class PayrollService {
  /**
   * Find all pay periods
   */
  async findAll(
    queryParams: PayPeriodQueryParams
  ): Promise<PaginatedPayPeriodResponse> {
    const { page, limit, search, startDate, endDate, status, type } =
      queryParams;
    const pagination = getPaginationParams(page, limit);

    // Build where clause
    const where: Prisma.PayPeriodWhereInput = {};

    // Date range filter
    if (startDate || endDate) {
      where.AND = [];

      if (startDate) {
        where.AND.push({
          startDate: {
            gte: new Date(startDate),
          },
        });
      }

      if (endDate) {
        where.AND.push({
          endDate: {
            lte: new Date(endDate),
          },
        });
      }
    }

    // Status filter
    if (status) {
      where.status = status as PayPeriodStatus;
    }

    // Type filter
    if (type) {
      where.type = type as PayPeriodType;
    }

    // Count total matching records
    const total = await prisma.payPeriod.count({ where });

    // Get pay periods with calculations
    const payPeriods = await prisma.payPeriod.findMany({
      where,
      select: payPeriodWithCalculationsSelect,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        startDate: "desc",
      },
    });

    return createPaginatedResponse(
      payPeriods as any,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Find pay period by ID
   */
  async findById(id: string): Promise<PayPeriodWithCalculationsSelect> {
    const payPeriod = await prisma.payPeriod.findUnique({
      where: { id },
      select: payPeriodWithCalculationsSelect,
    });

    if (!payPeriod) {
      throw new NotFoundError("Pay Period");
    }

    return payPeriod;
  }

  /**
   * Create a new pay period
   */
  async create(
    createPayPeriodDto: CreatePayPeriodDto
  ): Promise<PayPeriodWithCalculationsSelect> {
    const { startDate, endDate, type, status } = createPayPeriodDto;

    // Validate dates
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (startDateTime >= endDateTime) {
      throw new ValidationError({
        date: "End date must be after start date",
      });
    }

    // Check for overlapping pay periods
    const overlappingPeriods = await prisma.payPeriod.findFirst({
      where: {
        OR: [
          {
            // Start date falls within existing period
            startDate: { lte: startDateTime },
            endDate: { gte: startDateTime },
          },
          {
            // End date falls within existing period
            startDate: { lte: endDateTime },
            endDate: { gte: endDateTime },
          },
          {
            // Period completely contains an existing period
            startDate: { gte: startDateTime },
            endDate: { lte: endDateTime },
          },
        ],
      },
      select: { id: true, startDate: true, endDate: true },
    });

    if (overlappingPeriods) {
      throw new ValidationError({
        date: `Pay period overlaps with existing period (${overlappingPeriods.startDate.toLocaleDateString()} - ${overlappingPeriods.endDate.toLocaleDateString()})`,
      });
    }

    // Create pay period
    try {
      const payPeriod = await prisma.payPeriod.create({
        data: {
          startDate: startDateTime,
          endDate: endDateTime,
          type: type,
          status: status || PayPeriodStatus.DRAFT,
        },
        select: payPeriodWithCalculationsSelect,
      });

      return payPeriod;
    } catch (error) {
      logger.error("Error creating pay period:", error);
      throw error;
    }
  }

  /**
   * Update an existing pay period
   */
  async update(
    id: string,
    updatePayPeriodDto: UpdatePayPeriodDto
  ): Promise<PayPeriodWithCalculationsSelect> {
    // Check if pay period exists
    const payPeriod = await prisma.payPeriod.findUnique({
      where: { id },
      select: {
        ...defaultPayPeriodSelect,
        calculations: { select: { id: true } },
      },
    });

    if (!payPeriod) {
      throw new NotFoundError("Pay Period");
    }

    // Don't allow updates if calculations exist and status is not DRAFT
    if (
      payPeriod.calculations.length > 0 &&
      payPeriod.status !== PayPeriodStatus.DRAFT &&
      (updatePayPeriodDto.startDate ||
        updatePayPeriodDto.endDate ||
        updatePayPeriodDto.type)
    ) {
      throw new ValidationError({
        update:
          "Cannot modify dates or type for a pay period with existing calculations",
      });
    }

    // Prepare update data
    const updateData: Prisma.PayPeriodUpdateInput = { ...updatePayPeriodDto };

    if (updatePayPeriodDto.startDate) {
      updateData.startDate = new Date(updatePayPeriodDto.startDate);
    }

    if (updatePayPeriodDto.endDate) {
      updateData.endDate = new Date(updatePayPeriodDto.endDate);
    }

    // If dates are changing, validate them
    if (updatePayPeriodDto.startDate || updatePayPeriodDto.endDate) {
      const startDateTime = updatePayPeriodDto.startDate
        ? new Date(updatePayPeriodDto.startDate)
        : payPeriod.startDate;

      const endDateTime = updatePayPeriodDto.endDate
        ? new Date(updatePayPeriodDto.endDate)
        : payPeriod.endDate;

      if (startDateTime >= endDateTime) {
        throw new ValidationError({
          date: "End date must be after start date",
        });
      }

      // Check for overlapping pay periods
      const overlappingPeriods = await prisma.payPeriod.findFirst({
        where: {
          id: { not: id },
          OR: [
            {
              // Start date falls within existing period
              startDate: { lte: startDateTime },
              endDate: { gte: startDateTime },
            },
            {
              // End date falls within existing period
              startDate: { lte: endDateTime },
              endDate: { gte: endDateTime },
            },
            {
              // Period completely contains an existing period
              startDate: { gte: startDateTime },
              endDate: { lte: endDateTime },
            },
          ],
        },
        select: { id: true, startDate: true, endDate: true },
      });

      if (overlappingPeriods) {
        throw new ValidationError({
          date: `Pay period overlaps with existing period (${overlappingPeriods.startDate.toLocaleDateString()} - ${overlappingPeriods.endDate.toLocaleDateString()})`,
        });
      }
    }

    // Update pay period
    try {
      const updatedPayPeriod = await prisma.payPeriod.update({
        where: { id },
        data: updateData,
        select: payPeriodWithCalculationsSelect,
      });

      return updatedPayPeriod;
    } catch (error) {
      logger.error("Error updating pay period:", error);
      throw error;
    }
  }

  /**
   * Delete a pay period
   */
  async delete(id: string): Promise<void> {
    // Check if pay period exists
    const payPeriod = await prisma.payPeriod.findUnique({
      where: { id },
      include: {
        calculations: { select: { id: true }, take: 1 },
      },
    });

    if (!payPeriod) {
      throw new NotFoundError("Pay Period");
    }

    // Don't allow deletion if calculations exist
    if (payPeriod.calculations.length > 0) {
      throw new ValidationError({
        delete: "Cannot delete pay period with existing calculations",
      });
    }

    // Delete pay period
    try {
      await prisma.payPeriod.delete({
        where: { id },
      });
    } catch (error) {
      logger.error("Error deleting pay period:", error);
      throw error;
    }
  }

  /**
   * Calculate pay for all employees in a pay period
   */
  async calculatePayroll(payPeriodId: string): Promise<number> {
    // Check if pay period exists
    const payPeriod = await prisma.payPeriod.findUnique({
      where: { id: payPeriodId },
    });

    if (!payPeriod) {
      throw new NotFoundError("Pay Period");
    }

    // Get all active employees
    const employees = await prisma.user.findMany({
      where: {
        OR: [
          { terminationDate: null },
          { terminationDate: { gt: payPeriod.endDate } },
        ],
      },
      select: {
        id: true,
        payRate: true,
        overtimeEnabled: true,
      },
    });

    // Set pay period to PROCESSING
    await prisma.payPeriod.update({
      where: { id: payPeriodId },
      data: { status: PayPeriodStatus.PROCESSING },
    });

    let count = 0;

    try {
      // Calculate pay for each employee
      for (const employee of employees) {
        // Skip employees without pay rate
        if (!employee.payRate) continue;

        // Get time records for this employee within the pay period
        const timeClocks = await prisma.timeClock.findMany({
          where: {
            userId: employee.id,
            clockInTime: {
              gte: payPeriod.startDate,
              lte: payPeriod.endDate,
            },
            clockOutTime: { not: null },
          },
          select: {
            id: true,
            clockInTime: true,
            clockOutTime: true,
            totalMinutes: true,
            schedule: {
              select: {
                id: true,
                scheduleType: true,
                isStatutoryHoliday: true,
                startTime: true,
                endTime: true,
              },
            },
          },
        });

        if (timeClocks.length === 0) continue;

        // Calculate pay for this employee
        const payCalculation = await this.calculateEmployeePay(
          employee.id,
          timeClocks,
          employee.payRate,
          employee.overtimeEnabled,
          payPeriod.startDate,
          payPeriod.endDate
        );

        // Store the calculation
        await prisma.payCalculation.create({
          data: {
            payPeriodId: payPeriodId,
            userId: employee.id,
            regularHours: payCalculation.regularHours,
            overtimeHours: payCalculation.overtimeHours,
            holidayHours: payCalculation.holidayHours,
            grossPay: payCalculation.grossPay,
          },
        });

        count++;
      }

      // Set pay period to COMPLETED
      await prisma.payPeriod.update({
        where: { id: payPeriodId },
        data: { status: PayPeriodStatus.COMPLETED },
      });

      return count;
    } catch (error) {
      logger.error("Error calculating payroll:", error);
      // Reset to DRAFT on error
      await prisma.payPeriod.update({
        where: { id: payPeriodId },
        data: { status: PayPeriodStatus.DRAFT },
      });
      throw error;
    }
  }

  /**
   * Calculate pay for a single employee
   * Implements BC labor law overtime rules:
   * - Daily overtime: > 8 hours = 1.5x, > 12 hours = 2x
   * - Weekly overtime: > 40 hours = 1.5x
   */
  private async calculateEmployeePay(
    userId: string,
    timeClocks: any[], // Using any[] for simplicity
    hourlyRate: number,
    overtimeEnabled: boolean,
    startDate: Date,
    endDate: Date
  ): Promise<PayCalculationResult> {
    // Initialize result
    const result: PayCalculationResult = {
      userId,
      regularHours: 0,
      overtimeHours: 0,
      holidayHours: 0,
      grossPay: 0,
    };

    // Group time clocks by day
    const dailyHours: Record<string, number> = {};
    const weeklyHours: Record<string, number> = {};

    // Get statutory holidays within the pay period
    const holidays = await prisma.statutoryHoliday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const holidayDates = new Set(
      holidays.map((h) => h.date.toISOString().split("T")[0])
    );

    // Process each time clock
    for (const tc of timeClocks) {
      if (!tc.clockOutTime || !tc.totalMinutes) continue;

      const hours = tc.totalMinutes / 60;
      const day = tc.clockInTime.toISOString().split("T")[0];
      const weekStart = this.getWeekStart(tc.clockInTime)
        .toISOString()
        .split("T")[0];

      // Initialize if not exists
      if (!dailyHours[day]) dailyHours[day] = 0;
      if (!weeklyHours[weekStart]) weeklyHours[weekStart] = 0;

      // Add hours to daily and weekly totals
      dailyHours[day] += hours;
      weeklyHours[weekStart] += hours;

      // Check if this is a statutory holiday
      const isHoliday =
        holidayDates.has(day) ||
        (tc.schedule && tc.schedule.isStatutoryHoliday);

      if (isHoliday) {
        const isEligible = await holidaysService.isEligibleForHolidayPay(
          userId,
          new Date(day)
        );

        if (isEligible) {
          // All hours on a holiday are paid at holiday rate
          result.holidayHours += hours;
        } else {
          // Not eligible for holiday pay, treat as regular hours
          result.regularHours += hours;
        }
      } else if (
        tc.schedule &&
        tc.schedule.scheduleType === ScheduleType.OVERTIME
      ) {
        // Pre-approved overtime hours
        result.overtimeHours += hours;
      } else {
        // Regular hours
        result.regularHours += hours;
      }
    }

    // Apply daily overtime rules if enabled
    if (overtimeEnabled) {
      // Reset counts for recalculation
      result.regularHours = 0;
      result.overtimeHours = 0;

      // Process daily overtime
      for (const day in dailyHours) {
        const isHoliday = holidayDates.has(day);

        if (isHoliday) {
          // Holiday hours are already counted separately
          continue;
        }

        const hoursForDay = dailyHours[day];

        if (hoursForDay <= 8) {
          // All regular hours
          result.regularHours += hoursForDay;
        } else if (hoursForDay <= 12) {
          // 8 regular hours + overtime at 1.5x
          result.regularHours += 8;
          result.overtimeHours += (hoursForDay - 8) * 1.5;
        } else {
          // 8 regular hours + 4 hours at 1.5x + remaining at 2x
          result.regularHours += 8;
          result.overtimeHours += 4 * 1.5 + (hoursForDay - 12) * 2;
        }
      }

      // Process weekly overtime (40+ hours in a week at 1.5x)
      for (const weekStart in weeklyHours) {
        const totalWeeklyHours = weeklyHours[weekStart];
        if (totalWeeklyHours > 40) {
          // Add additional overtime for weekly hours over 40
          // This is a simplified approach; a more accurate implementation
          // would need to track which specific hours were already counted as daily OT
          const weeklyOvertimeHours = totalWeeklyHours - 40;
          // Only add if it's greater than already calculated daily overtime
          const additionalWeeklyOT = Math.max(
            0,
            weeklyOvertimeHours - result.overtimeHours / 1.5
          );
          if (additionalWeeklyOT > 0) {
            result.overtimeHours += additionalWeeklyOT * 1.5;
            result.regularHours -= additionalWeeklyOT; // Adjust regular hours
          }
        }
      }
    }

    // Calculate gross pay
    result.grossPay =
      result.regularHours * hourlyRate +
      result.overtimeHours * hourlyRate + // Already factored in 1.5x/2x
      result.holidayHours * hourlyRate * 1.5; // Holiday pay at 1.5x

    return result;
  }

  /**
   * Helper method to get the start of the week for a given date
   * BC workweek starts on Sunday
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
    d.setDate(d.getDate() - day); // Subtract days to get to Sunday
    d.setHours(0, 0, 0, 0); // Start of day
    return d;
  }

  /**
   * Add a pay adjustment to a calculation
   */
  async addAdjustment(
    payAdjustmentDto: PayAdjustmentDto
  ): Promise<PayPeriodWithCalculationsSelect> {
    const { payCalculationId, amount, reason, createdBy } = payAdjustmentDto;

    // Check if pay calculation exists
    const payCalculation = await prisma.payCalculation.findUnique({
      where: { id: payCalculationId },
      include: { payPeriod: true },
    });

    if (!payCalculation) {
      throw new NotFoundError("Pay Calculation");
    }

    // Don't allow adjustments if pay period is PAID
    if (payCalculation.payPeriod.status === PayPeriodStatus.PAID) {
      throw new ValidationError({
        status: "Cannot add adjustments to a paid pay period",
      });
    }

    // Create adjustment
    try {
      await prisma.payAdjustment.create({
        data: {
          payCalculationId,
          amount,
          reason,
          createdBy,
        },
      });

      // Update gross pay
      await prisma.payCalculation.update({
        where: { id: payCalculationId },
        data: {
          grossPay: { increment: amount }, // Can be positive or negative
        },
      });

      // Return updated pay period with calculations
      return this.findById(payCalculation.payPeriod.id);
    } catch (error) {
      logger.error("Error adding pay adjustment:", error);
      throw error;
    }
  }

  /**
   * Set pay period status to PAID
   */
  async markAsPaid(id: string): Promise<PayPeriodWithCalculationsSelect> {
    // Check if pay period exists
    const payPeriod = await prisma.payPeriod.findUnique({
      where: { id },
    });

    if (!payPeriod) {
      throw new NotFoundError("Pay Period");
    }

    // Check if status is COMPLETED
    if (payPeriod.status !== PayPeriodStatus.COMPLETED) {
      throw new ValidationError({
        status: "Pay period must be in COMPLETED status to mark as PAID",
      });
    }

    // Update status
    try {
      const updatedPayPeriod = await prisma.payPeriod.update({
        where: { id },
        data: { status: PayPeriodStatus.PAID },
        select: payPeriodWithCalculationsSelect,
      });

      return updatedPayPeriod;
    } catch (error) {
      logger.error("Error marking pay period as paid:", error);
      throw error;
    }
  }

  /**
   * Generate payroll export data
   */
  async generatePayrollExport(payPeriodId: string): Promise<any[]> {
    // Check if pay period exists
    const payPeriod = await prisma.payPeriod.findUnique({
      where: { id: payPeriodId },
      include: {
        calculations: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                payRate: true,
              },
            },
            adjustments: true,
          },
        },
      },
    });

    if (!payPeriod) {
      throw new NotFoundError("Pay Period");
    }

    // Format data for export
    const exportData = payPeriod.calculations.map((calc, index) => {
      const totalAdjustments = calc.adjustments.reduce(
        (sum, adj) => sum + adj.amount,
        0
      );

      return {
        RowNumber: index + 1,
        LastName: calc.user.lastName,
        FirstName: calc.user.firstName,
        RegularHours: calc.regularHours.toFixed(2),
        OvertimeHours: calc.overtimeHours.toFixed(2),
        HolidayHours: calc.holidayHours.toFixed(2),
        TotalHours: (
          calc.regularHours +
          calc.overtimeHours +
          calc.holidayHours
        ).toFixed(2),
        PayRate: calc.user.payRate?.toFixed(2) || "0.00",
        Adjustments: totalAdjustments.toFixed(2),
        GrossPay: calc.grossPay.toFixed(2),
      };
    });

    return exportData;
  }
}

export const payrollService = new PayrollService();
