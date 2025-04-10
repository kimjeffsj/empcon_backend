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
import { Prisma, ScheduleType } from "@prisma/client";
import {
  BatchScheduleDto,
  CreateScheduleDto,
  PaginatedScheduleResponse,
  ScheduleQueryParams,
  UpdateScheduleDto,
} from "./dto/schedule.dto";
import {
  scheduleWithDetailsSelect,
  scheduleWithUserSelect,
  ScheduleWithUserSelect,
  ScheduleWithDetailsSelect,
} from "./schedules.selections";

export class SchedulesService {
  /**
   * Find all schedules with pagination and filtering
   */
  async findAll(
    queryParams: ScheduleQueryParams
  ): Promise<PaginatedScheduleResponse> {
    const {
      page,
      limit,
      userId,
      departmentId,
      startDate,
      endDate,
      scheduleType,
    } = queryParams;
    const pagination = getPaginationParams(page, limit);

    // Build where clause
    const where: Prisma.ScheduleWhereInput = {};

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

    // Date range filter
    if (startDate || endDate) {
      where.AND = [];

      if (startDate) {
        where.AND.push({
          startTime: {
            gte: new Date(startDate),
          },
        });
      }

      if (endDate) {
        where.AND.push({
          endTime: {
            lte: new Date(endDate),
          },
        });
      }
    }

    // Schedule type filter
    if (scheduleType) {
      where.scheduleType = scheduleType as ScheduleType;
    }

    // Count total matching records
    const total = await prisma.schedule.count({ where });

    // Get schedules with user info
    const schedules = await prisma.schedule.findMany({
      where,
      select: scheduleWithUserSelect,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        startTime: "desc",
      },
    });

    return createPaginatedResponse(
      schedules as any,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Find schedule by ID
   */
  async findById(id: string): Promise<ScheduleWithDetailsSelect> {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      select: scheduleWithDetailsSelect,
    });

    if (!schedule) {
      throw new NotFoundError("Schedule");
    }

    return schedule;
  }

  /**
   * Create a new schedule
   */
  async create(
    createScheduleDto: CreateScheduleDto
  ): Promise<ScheduleWithUserSelect> {
    const { userId, startTime, endTime, ...scheduleData } = createScheduleDto;

    // Validate start and end times
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      throw new ValidationError({
        time: "End time must be after start time",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // Check for schedule conflicts
    await this.checkScheduleConflicts(userId, startDate, endDate);

    // Create schedule
    try {
      const schedule = await prisma.schedule.create({
        data: {
          userId,
          startTime: startDate,
          endTime: endDate,
          ...scheduleData,
        },
        select: scheduleWithUserSelect,
      });

      return schedule;
    } catch (error) {
      logger.error("Error creating schedule:", error);
      throw error;
    }
  }

  /**
   * Create multiple schedules at once
   */
  async createBatch(
    batchScheduleDto: BatchScheduleDto
  ): Promise<{ count: number }> {
    const { schedules } = batchScheduleDto;

    if (!schedules || schedules.length === 0) {
      throw new ValidationError({
        schedules: "At least one schedule is required",
      });
    }

    // Create all schedules in a transaction
    try {
      const result = await prisma.$transaction(async (tx) => {
        let createdCount = 0;

        for (const scheduleDto of schedules) {
          const { userId, startTime, endTime } = scheduleDto;

          // Validate start and end times
          const startDate = new Date(startTime);
          const endDate = new Date(endTime);

          if (startDate >= endDate) {
            continue; // Skip invalid schedules
          }

          // Check if user exists
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true },
          });

          if (!user) {
            continue; // Skip if user doesn't exist
          }

          // Check for conflicts (simplified for batch operations)
          const conflictingSchedule = await tx.schedule.findFirst({
            where: {
              userId,
              OR: [
                {
                  // Start time falls within existing schedule
                  startTime: { lt: endDate },
                  endTime: { gt: startDate },
                },
                {
                  // End time falls within existing schedule
                  startTime: { lt: endDate },
                  endTime: { gte: endDate },
                },
                {
                  // Schedule completely contains an existing schedule
                  startTime: { gte: startDate },
                  endTime: { lte: endDate },
                },
              ],
            },
          });

          if (conflictingSchedule) {
            continue; // Skip conflicts
          }

          // Extract remaining properties excluding fields we already handled
          const {
            userId: _,
            startTime: __,
            endTime: ___,
            ...scheduleRest
          } = scheduleDto;

          // Create schedule
          await tx.schedule.create({
            data: {
              userId,
              startTime: startDate,
              endTime: endDate,
              ...scheduleRest,
            },
          });

          createdCount++;
        }

        return { count: createdCount };
      });

      return result;
    } catch (error) {
      logger.error("Error creating batch schedules:", error);
      throw error;
    }
  }

  /**
   * Update an existing schedule
   */
  async update(
    id: string,
    updateScheduleDto: UpdateScheduleDto
  ): Promise<ScheduleWithUserSelect> {
    const { userId, startTime, endTime, ...scheduleData } = updateScheduleDto;

    // Check if schedule exists
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      throw new NotFoundError("Schedule");
    }

    // Prepare data for update
    const updateData: Prisma.ScheduleUpdateInput = { ...scheduleData };

    // If changing userId, check if user exists
    if (userId && userId !== existingSchedule.userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundError("User");
      }

      updateData.user = { connect: { id: userId } };
    }

    let startDate = existingSchedule.startTime;
    let endDate = existingSchedule.endTime;

    // Update times if provided
    if (startTime) {
      startDate = new Date(startTime);
      updateData.startTime = startDate;
    }

    if (endTime) {
      endDate = new Date(endTime);
      updateData.endTime = endDate;
    }

    // Validate start and end times
    if (startDate >= endDate) {
      throw new ValidationError({
        time: "End time must be after start time",
      });
    }

    // Check for schedule conflicts (excluding this schedule)
    await this.checkScheduleConflicts(
      userId || existingSchedule.userId,
      startDate,
      endDate,
      id
    );

    // Update schedule
    try {
      const schedule = await prisma.schedule.update({
        where: { id },
        data: updateData,
        select: scheduleWithUserSelect,
      });

      return schedule;
    } catch (error) {
      logger.error("Error updating schedule:", error);
      throw error;
    }
  }

  /**
   * Delete a schedule
   */
  async delete(id: string): Promise<void> {
    // Check if schedule exists
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        timeClocks: { select: { id: true }, take: 1 },
        adjustmentRequests: {
          where: { status: "PENDING" },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!schedule) {
      throw new NotFoundError("Schedule");
    }

    // Check if schedule has related timeClocks
    if (schedule.timeClocks.length > 0) {
      throw new ConflictError(
        "schedule",
        "Cannot delete schedule with associated time clock records"
      );
    }

    // Check for pending adjustment requests
    if (schedule.adjustmentRequests.length > 0) {
      throw new ConflictError(
        "schedule",
        "Cannot delete schedule with pending adjustment requests"
      );
    }

    // Delete schedule
    try {
      await prisma.schedule.delete({
        where: { id },
      });
    } catch (error) {
      logger.error("Error deleting schedule:", error);
      throw error;
    }
  }

  /**
   * Find schedules by user
   */
  async findByUser(
    userId: string,
    queryParams: any = {}
  ): Promise<PaginatedScheduleResponse> {
    const { page, limit, startDate, endDate, scheduleType } = queryParams;
    const pagination = getPaginationParams(page, limit);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // Build where clause
    const where: Prisma.ScheduleWhereInput = { userId };

    // Date range filter
    if (startDate || endDate) {
      where.AND = [];

      if (startDate) {
        where.AND.push({
          startTime: {
            gte: new Date(startDate),
          },
        });
      }

      if (endDate) {
        where.AND.push({
          endTime: {
            lte: new Date(endDate),
          },
        });
      }
    }

    // Schedule type filter
    if (scheduleType) {
      where.scheduleType = scheduleType as ScheduleType;
    }

    const total = await prisma.schedule.count({ where });

    const schedules = await prisma.schedule.findMany({
      where,
      select: scheduleWithUserSelect,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        startTime: "desc",
      },
    });

    return createPaginatedResponse(
      schedules as any,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Helper method to check for schedule conflicts
   */
  private async checkScheduleConflicts(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeScheduleId?: string
  ): Promise<void> {
    // Build where clause for conflict check
    const where: Prisma.ScheduleWhereInput = {
      userId,
      OR: [
        {
          // Start time falls within existing schedule
          startTime: { lte: startDate },
          endTime: { gt: startDate },
        },
        {
          // End time falls within existing schedule
          startTime: { lt: endDate },
          endTime: { gte: endDate },
        },
        {
          // Schedule completely contains an existing schedule
          startTime: { gte: startDate },
          endTime: { lte: endDate },
        },
      ],
    };

    // Exclude current schedule when updating
    if (excludeScheduleId) {
      where.id = { not: excludeScheduleId };
    }

    const conflictingSchedule = await prisma.schedule.findFirst({
      where,
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    if (conflictingSchedule) {
      throw new ConflictError(
        "schedule",
        `Schedule conflicts with existing schedule (${conflictingSchedule.startTime.toLocaleString()} - ${conflictingSchedule.endTime.toLocaleString()})`
      );
    }
  }
}

export const schedulesService = new SchedulesService();
