import {
  NotFoundError,
  ValidationError,
} from "@/common/middleware/error.middleware";
import {
  createPaginatedResponse,
  getPaginationParams,
} from "@/common/utils/helpers.utils";
import { logger } from "@/common/utils/logger.utils";
import prisma from "@/entities/prisma";
import { LeaveRequestStatus, Prisma } from "@prisma/client";
import {
  CreateLeaveRequestDto,
  LeaveRequestQueryParams,
  PaginatedLeaveRequestResponse,
  ProcessLeaveRequestDto,
  UpdateLeaveRequestDto,
} from "./dto/leave.dto";
import {
  LeaveRequestWithDetailsSelect,
  leaveRequestWithDetailsSelect,
} from "./leaves.selections";
import { leaveBalancesService } from "./leave-balances.service";

export class LeaveRequestsService {
  /**
   * Find all leave requests with pagination and filtering
   */
  async findAll(
    queryParams: LeaveRequestQueryParams
  ): Promise<PaginatedLeaveRequestResponse> {
    const {
      page,
      limit,
      search,
      userId,
      departmentId,
      leaveTypeId,
      status,
      startDate,
      endDate,
    } = queryParams;
    const pagination = getPaginationParams(page, limit);

    // Build where clause
    const where: Prisma.LeaveRequestWhereInput = {};

    // User filter
    if (userId) {
      where.userId = userId;
    }

    // Department filter
    if (departmentId) {
      where.user = {
        departmentId,
      };
    }

    // Leave type filter
    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }

    // Status filter
    if (status) {
      where.status = status as LeaveRequestStatus;
    }

    // Date range filter
    if (startDate || endDate) {
      where.OR = [];

      if (startDate) {
        const startDateObj = new Date(startDate);
        where.OR.push({
          // Start date falls within request
          startDate: { lte: startDateObj },
          endDate: { gte: startDateObj },
        });
        where.OR.push({
          // End date falls within request
          startDate: { gte: startDateObj },
        });
      }

      if (endDate) {
        const endDateObj = new Date(endDate);
        where.OR.push({
          // End date falls within request
          endDate: { lte: endDateObj },
        });
      }
    }

    // Count total matching records
    const total = await prisma.leaveRequest.count({ where });

    // Get leave requests
    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      select: leaveRequestWithDetailsSelect,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: [
        { status: "asc" }, // Pending first
        { startDate: "asc" },
      ],
    });

    return createPaginatedResponse(
      leaveRequests,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Find leave request by ID
   */
  async findById(id: string): Promise<LeaveRequestWithDetailsSelect> {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      select: leaveRequestWithDetailsSelect,
    });

    if (!leaveRequest) {
      throw new NotFoundError("Leave Request");
    }

    return leaveRequest;
  }

  /**
   * Create a new leave request
   */
  async create(
    createLeaveRequestDto: CreateLeaveRequestDto
  ): Promise<LeaveRequestWithDetailsSelect> {
    const { userId, leaveTypeId, startDate, endDate, halfDay, notes } =
      createLeaveRequestDto;

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

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (start > end) {
      throw new ValidationError({
        date: "End date must be after start date",
      });
    }

    // Calculate total days (excluding weekends)
    const totalDays = halfDay ? 0.5 : this.calculateBusinessDays(start, end);

    // Check for overlapping leave requests
    const overlappingRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: {
          in: ["PENDING", "APPROVED"],
        },
        OR: [
          {
            // Start date falls within existing request
            startDate: { lte: start },
            endDate: { gte: start },
          },
          {
            // End date falls within existing request
            startDate: { lte: end },
            endDate: { gte: end },
          },
          {
            // Request completely contains an existing request
            startDate: { gte: start },
            endDate: { lte: end },
          },
        ],
      },
    });

    if (overlappingRequests.length > 0) {
      throw new ValidationError({
        overlap: "This leave request overlaps with an existing request",
      });
    }

    // If leave type requires balance, check balance
    if (leaveType.requiresBalance) {
      const year = start.getFullYear();
      const balanceCheck = await leaveBalancesService.checkBalance(
        userId,
        leaveTypeId,
        totalDays,
        year
      );

      if (!balanceCheck.sufficient) {
        throw new ValidationError({
          balance: `Insufficient leave balance. Required: ${totalDays} days, Available: ${
            balanceCheck.balance -
            (await this.getUsedDays(userId, leaveTypeId, year))
          } days`,
        });
      }
    }

    // Create leave request
    try {
      return await prisma.leaveRequest.create({
        data: {
          userId,
          leaveTypeId,
          startDate: start,
          endDate: end,
          totalDays,
          halfDay: halfDay || false,
          notes,
          status: LeaveRequestStatus.PENDING,
        },
        select: leaveRequestWithDetailsSelect,
      });
    } catch (error) {
      logger.error("Error creating leave request:", error);
      throw error;
    }
  }

  /**
   * Update an existing leave request
   */
  async update(
    id: string,
    updateLeaveRequestDto: UpdateLeaveRequestDto
  ): Promise<LeaveRequestWithDetailsSelect> {
    // Check if leave request exists
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
      },
    });

    if (!leaveRequest) {
      throw new NotFoundError("Leave Request");
    }

    // Only allow updates to PENDING requests
    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new ValidationError({
        status: "Cannot update a request that is not in PENDING status",
      });
    }

    // Prepare update data
    const updateData: Prisma.LeaveRequestUpdateInput = {
      ...updateLeaveRequestDto,
    };
    let totalDays = leaveRequest.totalDays;

    // If dates are changing, recalculate days
    if (
      updateLeaveRequestDto.startDate ||
      updateLeaveRequestDto.endDate ||
      updateLeaveRequestDto.halfDay !== undefined
    ) {
      const start = updateLeaveRequestDto.startDate
        ? new Date(updateLeaveRequestDto.startDate)
        : leaveRequest.startDate;

      const end = updateLeaveRequestDto.endDate
        ? new Date(updateLeaveRequestDto.endDate)
        : leaveRequest.endDate;

      const halfDay =
        updateLeaveRequestDto.halfDay !== undefined
          ? updateLeaveRequestDto.halfDay
          : leaveRequest.halfDay;

      // Validate dates
      if (start > end) {
        throw new ValidationError({
          date: "End date must be after start date",
        });
      }

      // Calculate total days
      totalDays = halfDay ? 0.5 : this.calculateBusinessDays(start, end);
      updateData.totalDays = totalDays;

      // Check for overlapping leave requests
      const overlappingRequests = await prisma.leaveRequest.findMany({
        where: {
          userId: leaveRequest.userId,
          id: { not: id },
          status: {
            in: ["PENDING", "APPROVED"],
          },
          OR: [
            {
              // Start date falls within existing request
              startDate: { lte: start },
              endDate: { gte: start },
            },
            {
              // End date falls within existing request
              startDate: { lte: end },
              endDate: { gte: end },
            },
            {
              // Request completely contains an existing request
              startDate: { gte: start },
              endDate: { lte: end },
            },
          ],
        },
      });

      if (overlappingRequests.length > 0) {
        throw new ValidationError({
          overlap: "This leave request overlaps with an existing request",
        });
      }
    }

    // If leave type is changing or days are changing, check balance
    if (
      (updateLeaveRequestDto.leaveTypeId &&
        leaveRequest.leaveTypeId &&
        updateLeaveRequestDto.leaveTypeId !== leaveRequest.leaveTypeId) ||
      totalDays !== leaveRequest.totalDays
    ) {
      const leaveTypeId =
        updateLeaveRequestDto.leaveTypeId || leaveRequest.leaveTypeId;

      if (!leaveTypeId) {
        throw new ValidationError({
          leaveType: "Leave Type required",
        });
      }

      // Check if leave type exists and requires balance
      const leaveType = await prisma.leaveType.findUnique({
        where: { id: leaveTypeId },
      });

      if (!leaveType) {
        throw new NotFoundError("Leave Type");
      }

      if (leaveType.requiresBalance) {
        const year = leaveRequest.startDate.getFullYear();

        // For existing leave type, we need to account for the days already allocated
        let requiredDays = totalDays;
        if (leaveTypeId === leaveRequest.leaveTypeId) {
          requiredDays -= leaveRequest.totalDays;
        }

        const balanceCheck = await leaveBalancesService.checkBalance(
          leaveRequest.userId,
          leaveTypeId,
          requiredDays,
          year
        );

        if (!balanceCheck.sufficient) {
          throw new ValidationError({
            balance: `Insufficient leave balance. Required: ${requiredDays} days, Available: ${
              balanceCheck.balance -
              (await this.getUsedDays(leaveRequest.userId, leaveTypeId, year))
            } days`,
          });
        }
      }
    }

    // Update leave request
    try {
      return await prisma.leaveRequest.update({
        where: { id },
        data: updateData,
        select: leaveRequestWithDetailsSelect,
      });
    } catch (error) {
      logger.error("Error updating leave request:", error);
      throw error;
    }
  }

  /**
   * Process (approve/reject) a leave request
   */
  async processRequest(
    id: string,
    processLeaveRequestDto: ProcessLeaveRequestDto
  ): Promise<LeaveRequestWithDetailsSelect> {
    const { status, approvedBy, notes } = processLeaveRequestDto;

    // Check if leave request exists
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
      },
    });

    if (!leaveRequest) {
      throw new NotFoundError("Leave Request");
    }

    // Only allow processing of PENDING requests
    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new ValidationError({
        status: "Cannot process a request that is not in PENDING status",
      });
    }

    // Process request
    try {
      const updatedRequest = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status,
          approvedBy,
          notes: notes || leaveRequest.notes,
        },
        select: leaveRequestWithDetailsSelect,
      });

      // If approved and leave type requires balance, deduct from balance
      if (
        status === LeaveRequestStatus.APPROVED &&
        leaveRequest.leaveType &&
        leaveRequest.leaveType.requiresBalance
      ) {
        try {
          // Deduct days from balance
          await leaveBalancesService.adjustBalance({
            userId: leaveRequest.userId,
            leaveTypeId: leaveRequest.leaveTypeId!,
            days: -leaveRequest.totalDays, // Negative to deduct
            reason: `Approved leave request #${id}`,
            year: leaveRequest.startDate.getFullYear(),
          });
        } catch (error) {
          logger.error("Error adjusting leave balance after approval:", error);
          // Don't throw here, just log the error
        }
      }

      return updatedRequest;
    } catch (error) {
      logger.error("Error processing leave request:", error);
      throw error;
    }
  }

  /**
   * Cancel a leave request
   */
  async cancelRequest(
    id: string,
    userId: string
  ): Promise<LeaveRequestWithDetailsSelect> {
    // Check if leave request exists
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
      },
    });

    if (!leaveRequest) {
      throw new NotFoundError("Leave Request");
    }

    // Only allow cancellation of user's own requests or by managers
    if (leaveRequest.userId !== userId) {
      throw new ValidationError({
        authorization: "You can only cancel your own leave requests",
      });
    }

    // Only allow cancellation of PENDING or APPROVED requests
    if (
      leaveRequest.status !== LeaveRequestStatus.PENDING &&
      leaveRequest.status !== LeaveRequestStatus.APPROVED
    ) {
      throw new ValidationError({
        status: "Cannot cancel a request that is already processed",
      });
    }

    // If request is APPROVED and has not started yet, refund the balance
    const needsRefund =
      leaveRequest.status === LeaveRequestStatus.APPROVED &&
      leaveRequest.startDate > new Date() &&
      leaveRequest.leaveType &&
      leaveRequest.leaveType.requiresBalance;

    // Cancel request
    try {
      const updatedRequest = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveRequestStatus.CANCELLED,
        },
        select: leaveRequestWithDetailsSelect,
      });

      // Refund leave balance if needed
      if (needsRefund) {
        try {
          await leaveBalancesService.adjustBalance({
            userId: leaveRequest.userId,
            leaveTypeId: leaveRequest.leaveTypeId!,
            days: leaveRequest.totalDays, // Positive to refund
            reason: `Cancelled leave request #${id}`,
            year: leaveRequest.startDate.getFullYear(),
          });
        } catch (error) {
          logger.error(
            "Error refunding leave balance after cancellation:",
            error
          );
          // Don't throw here, just log the error
        }
      }

      return updatedRequest;
    } catch (error) {
      logger.error("Error cancelling leave request:", error);
      throw error;
    }
  }

  /**
   * Delete a leave request (admin only)
   */
  async delete(id: string): Promise<void> {
    // Check if leave request exists
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundError("Leave Request");
    }

    // Delete leave request
    try {
      await prisma.leaveRequest.delete({
        where: { id },
      });
    } catch (error) {
      logger.error("Error deleting leave request:", error);
      throw error;
    }
  }

  /**
   * Calculate business days between two dates (excluding weekends)
   */
  private calculateBusinessDays(startDate: Date, endDate: Date): number {
    let days = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
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
}

export const leaveRequestsService = new LeaveRequestsService();
