import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/common/middleware/error.middleware";
import {
  createPaginatedResponse,
  getPaginationParams,
} from "@/common/utils/helpers.utils";
import { logger } from "@/common/utils/logger.utils";
import prisma from "@/entities/prisma";
import { Prisma } from "@prisma/client";
import {
  AdjustLeaveBalanceDto,
  CreateLeaveBalanceDto,
  LeaveBalanceOverview,
  LeaveBalanceQueryParams,
  PaginatedLeaveBalanceResponse,
  UpdateLeaveBalanceDto,
} from "./dto/leave.dto";
import {
  DefaultLeaveBalanceSelect,
  LeaveBalanceWithTypeAndUserSelect,
  defaultLeaveBalanceSelect,
  leaveBalanceWithTypeAndUserSelect,
} from "./leaves.selections";

export class LeaveBalancesService {
  /**
   * Find all leave balances with pagination and filtering
   */
  async findAll(
    queryParams: LeaveBalanceQueryParams
  ): Promise<PaginatedLeaveBalanceResponse> {
    const { page, limit, search, userId, leaveTypeId, year } = queryParams;
    const pagination = getPaginationParams(page, limit);

    // Build where clause
    const where: Prisma.LeaveBalanceWhereInput = {};

    // Basic filters
    if (userId) {
      where.userId = userId;
    }

    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }

    if (year) {
      where.year = parseInt(year.toString(), 10);
    }

    // Count total matching records
    const total = await prisma.leaveBalance.count({ where });

    // Get leave balances
    const leaveBalances = await prisma.leaveBalance.findMany({
      where,
      select: leaveBalanceWithTypeAndUserSelect,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        year: "desc",
      },
    });

    return createPaginatedResponse(
      leaveBalances,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Find leave balance by ID
   */
  async findById(id: string): Promise<LeaveBalanceWithTypeAndUserSelect> {
    const leaveBalance = await prisma.leaveBalance.findUnique({
      where: { id },
      select: leaveBalanceWithTypeAndUserSelect,
    });

    if (!leaveBalance) {
      throw new NotFoundError("Leave Balance");
    }

    return leaveBalance;
  }

  /**
   * Get leave balances for a specific user
   */
  async findByUser(
    userId: string,
    year?: number
  ): Promise<LeaveBalanceOverview> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // Get current year if not specified
    const targetYear = year || new Date().getFullYear();

    // Get all leave balances for this user in the specified year
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: {
        userId,
        year: targetYear,
      },
      include: {
        leaveType: true,
      },
    });

    // Get leave requests for this user in the specified year
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: {
          gte: new Date(`${targetYear}-01-01`),
          lt: new Date(`${targetYear + 1}-01-01`),
        },
      },
      include: {
        leaveType: true,
      },
    });

    // Calculate used days per leave type
    const usedDaysByType: Record<string, number> = {};
    leaveRequests.forEach((request) => {
      if (!request.leaveTypeId) return;

      if (!usedDaysByType[request.leaveTypeId]) {
        usedDaysByType[request.leaveTypeId] = 0;
      }
      usedDaysByType[request.leaveTypeId] += request.totalDays;
    });

    // Format the response
    const balances = leaveBalances.map((balance) => {
      const used = usedDaysByType[balance.leaveTypeId] || 0;
      return {
        leaveTypeId: balance.leaveTypeId,
        leaveTypeName: balance.leaveType.name,
        balanceDays: balance.balanceDays,
        used,
        remaining: balance.balanceDays - used,
        isPaid: balance.leaveType.paidLeave,
      };
    });

    return {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      balances,
    };
  }

  /**
   * Check leave balance
   */
  async checkBalance(
    userId: string,
    leaveTypeId: string,
    days: number,
    year?: number
  ): Promise<{
    sufficient: boolean;
    balance: number;
    required: number;
    remaining: number;
  }> {
    // Get current year if not specified
    const targetYear = year || new Date().getFullYear();

    // Get leave type
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });

    if (!leaveType) {
      throw new NotFoundError("Leave Type");
    }

    // If this leave type doesn't require balance, always return sufficient
    if (!leaveType.requiresBalance) {
      return {
        sufficient: true,
        balance: 0,
        required: days,
        remaining: 0,
      };
    }

    // Get leave balance for this user, type, and year
    const leaveBalance = await prisma.leaveBalance.findFirst({
      where: {
        userId,
        leaveTypeId,
        year: targetYear,
      },
    });

    // If no balance found, return insufficient
    if (!leaveBalance) {
      return {
        sufficient: false,
        balance: 0,
        required: days,
        remaining: -days,
      };
    }

    // Get used days for this leave type in the specified year
    const usedDays = await this.getUsedDays(userId, leaveTypeId, targetYear);
    const remainingDays = leaveBalance.balanceDays - usedDays;

    return {
      sufficient: remainingDays >= days,
      balance: leaveBalance.balanceDays,
      required: days,
      remaining: remainingDays - days,
    };
  }

  /**
   * Get used days for a specific leave type
   */
  private async getUsedDays(
    userId: string,
    leaveTypeId: string,
    year: number
  ): Promise<number> {
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        leaveTypeId,
        status: "APPROVED",
        startDate: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
      select: {
        totalDays: true,
      },
    });

    return leaveRequests.reduce((sum, request) => sum + request.totalDays, 0);
  }

  /**
   * Create a new leave balance
   */
  async create(
    createLeaveBalanceDto: CreateLeaveBalanceDto
  ): Promise<DefaultLeaveBalanceSelect> {
    const { userId, leaveTypeId, balanceDays, year } = createLeaveBalanceDto;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // Check if leave type exists
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });

    if (!leaveType) {
      throw new NotFoundError("Leave Type");
    }

    // Check if balance already exists for this user, type, and year
    const existingBalance = await prisma.leaveBalance.findFirst({
      where: {
        userId,
        leaveTypeId,
        year,
      },
    });

    if (existingBalance) {
      throw new ConflictError(
        "leave balance",
        `Leave balance already exists for this user, type, and year`
      );
    }

    // Create leave balance
    try {
      return await prisma.leaveBalance.create({
        data: {
          userId,
          leaveTypeId,
          balanceDays,
          year,
        },
        select: defaultLeaveBalanceSelect,
      });
    } catch (error) {
      logger.error("Error creating leave balance:", error);
      throw error;
    }
  }

  /**
   * Update an existing leave balance
   */
  async update(
    id: string,
    updateLeaveBalanceDto: UpdateLeaveBalanceDto
  ): Promise<DefaultLeaveBalanceSelect> {
    // Check if leave balance exists
    const leaveBalance = await prisma.leaveBalance.findUnique({
      where: { id },
    });

    if (!leaveBalance) {
      throw new NotFoundError("Leave Balance");
    }

    // Update leave balance
    try {
      return await prisma.leaveBalance.update({
        where: { id },
        data: updateLeaveBalanceDto,
        select: defaultLeaveBalanceSelect,
      });
    } catch (error) {
      logger.error("Error updating leave balance:", error);
      throw error;
    }
  }

  /**
   * Adjust leave balance (increase or decrease)
   */
  async adjustBalance(
    adjustLeaveBalanceDto: AdjustLeaveBalanceDto
  ): Promise<DefaultLeaveBalanceSelect> {
    const { userId, leaveTypeId, days, reason, year } = adjustLeaveBalanceDto;

    // Get current year if not specified
    const targetYear = year || new Date().getFullYear();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // Check if leave type exists
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });

    if (!leaveType) {
      throw new NotFoundError("Leave Type");
    }

    // If this leave type doesn't require balance, return error
    if (!leaveType.requiresBalance) {
      throw new ValidationError({
        leaveType: "This leave type does not use balance tracking",
      });
    }

    // Find or create leave balance
    let leaveBalance = await prisma.leaveBalance.findFirst({
      where: {
        userId,
        leaveTypeId,
        year: targetYear,
      },
    });

    try {
      if (leaveBalance) {
        // Update existing balance
        return await prisma.leaveBalance.update({
          where: { id: leaveBalance.id },
          data: {
            balanceDays: { increment: days },
          },
          select: defaultLeaveBalanceSelect,
        });
      } else {
        // Create new balance
        return await prisma.leaveBalance.create({
          data: {
            userId,
            leaveTypeId,
            balanceDays: Math.max(0, days), // Ensure not negative for new balance
            year: targetYear,
          },
          select: defaultLeaveBalanceSelect,
        });
      }
    } catch (error) {
      logger.error("Error adjusting leave balance:", error);
      throw error;
    }
  }

  /**
   * Delete a leave balance
   */
  async delete(id: string): Promise<void> {
    // Check if leave balance exists
    const leaveBalance = await prisma.leaveBalance.findUnique({
      where: { id },
    });

    if (!leaveBalance) {
      throw new NotFoundError("Leave Balance");
    }

    // Delete leave balance
    try {
      await prisma.leaveBalance.delete({
        where: { id },
      });
    } catch (error) {
      logger.error("Error deleting leave balance:", error);
      throw error;
    }
  }
}

export const leaveBalancesService = new LeaveBalancesService();
