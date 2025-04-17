import {
  ConflictError,
  NotFoundError,
} from "@/common/middleware/error.middleware";
import {
  createPaginatedResponse,
  getPaginationParams,
} from "@/common/utils/helpers.utils";
import { logger } from "@/common/utils/logger.utils";
import prisma from "@/entities/prisma";
import { Prisma } from "@prisma/client";
import {
  ClockInDto,
  ClockOutDto,
  PaginatedTimeClockResponse,
  TimeClockQueryParams,
  UpdateTimeClockDto,
} from "./dto/timeclock.dto";
import {
  TimeClockWithUserSelect,
  timeClockWithUserSelect,
} from "./timeclocks.selection";

export class TimeClocksService {
  /**
   * Find all time clocks with pagination and filtering
   */
  async findAll(
    queryParams: TimeClockQueryParams
  ): Promise<PaginatedTimeClockResponse> {
    const { page, limit, userId, departmentId, startDate, endDate, completed } =
      queryParams;
    const pagination = getPaginationParams(page, limit);

    // Build where clause
    const where: Prisma.TimeClockWhereInput = {};

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
          clockInTime: {
            gte: new Date(startDate),
          },
        });
      }

      if (endDate) {
        where.AND.push({
          clockInTime: {
            lt: new Date(
              new Date(endDate).setDate(new Date(endDate).getDate() + 1)
            ),
          },
        });
      }
    }

    // Completed filter
    if (completed !== undefined) {
      if (completed === "true") {
        where.clockOutTime = { not: null };
      } else if (completed === "false") {
        where.clockOutTime = null;
      }
    }

    // Count total matching records
    const total = await prisma.timeClock.count({ where });

    // Get time clocks with user info
    const timeClocks = await prisma.timeClock.findMany({
      where,
      select: timeClockWithUserSelect,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        clockInTime: "desc",
      },
    });

    return createPaginatedResponse(
      timeClocks as any,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Find time clock by ID
   */
  async findById(id: string): Promise<TimeClockWithUserSelect> {
    const timeClock = await prisma.timeClock.findUnique({
      where: { id },
      select: timeClockWithUserSelect,
    });

    if (!timeClock) {
      throw new NotFoundError("TimeClock");
    }

    return timeClock;
  }

  /**
   * Clock in
   */
  async clockIn(clockInDto: ClockInDto): Promise<TimeClockWithUserSelect> {
    const { userId, scheduleId, notes } = clockInDto;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // Check if user already has an active time clock
    const activeTimeClock = await prisma.timeClock.findFirst({
      where: {
        userId,
        clockOutTime: null,
      },
    });

    if (activeTimeClock) {
      throw new ConflictError(
        "timeclock",
        "User already has an active schedule time"
      );
    }

    // If schedule ID provided, verify it exists and belongs to the user
    if (scheduleId) {
      const schedule = await prisma.schedule.findFirst({
        where: {
          id: scheduleId,
          userId,
        },
      });

      if (!schedule) {
        throw new NotFoundError("Schedule");
      }
    }

    // Create time clock
    try {
      const now = new Date();
      const timeClock = await prisma.timeClock.create({
        data: {
          userId,
          clockInTime: now,
          scheduleId,
          notes,
        },
        select: timeClockWithUserSelect,
      });

      return timeClock;
    } catch (error) {
      logger.error("Error clocking in:", error);
      throw error;
    }
  }

  /**
   * Clock out
   */
  async clockOut(
    id: string,
    clockOutDto: ClockOutDto
  ): Promise<TimeClockWithUserSelect> {
    const { notes } = clockOutDto;

    // Check if time clock exists
    const timeClock = await prisma.timeClock.findUnique({
      where: { id },
    });

    if (!timeClock) {
      throw new NotFoundError("TimeClock");
    }

    // Check if already clocked out
    if (timeClock.clockOutTime) {
      throw new ConflictError(
        "timeclock",
        "Time clock already has a clock out time"
      );
    }

    // Clock out
    try {
      const now = new Date();
      const clockInTime = timeClock.clockInTime;

      // Calculate total minutes
      const totalMinutes = Math.round(
        (now.getTime() - clockInTime.getTime()) / 60000
      );

      // Update time clock
      const updatedTimeClock = await prisma.timeClock.update({
        where: { id },
        data: {
          clockOutTime: now,
          totalMinutes: totalMinutes > 0 ? totalMinutes : 0,
          notes: notes || timeClock.notes,
        },
        select: timeClockWithUserSelect,
      });

      return updatedTimeClock;
    } catch (error) {
      logger.error("Error clocking out:", error);
      throw error;
    }
  }

  /**
   * Update time clock
   */
  async update(
    id: string,
    updateTimeClockDto: UpdateTimeClockDto
  ): Promise<TimeClockWithUserSelect> {
    const { clockInTime, clockOutTime, scheduleId, notes } = updateTimeClockDto;

    // Check if time clock exists
    const timeClock = await prisma.timeClock.findUnique({
      where: { id },
    });

    if (!timeClock) {
      throw new NotFoundError("TimeClock");
    }

    // Prepare update data
    const updateData: Prisma.TimeClockUpdateInput = { notes };

    // Update times if provided
    if (clockInTime) {
      updateData.clockInTime = new Date(clockInTime);
    }

    if (clockOutTime !== undefined) {
      updateData.clockOutTime = clockOutTime ? new Date(clockOutTime) : null;
    }

    // If schedule ID provided, verify it exists and belongs to the user
    if (scheduleId) {
      const schedule = await prisma.schedule.findFirst({
        where: {
          id: scheduleId,
          userId: timeClock.userId,
        },
      });

      if (!schedule) {
        throw new NotFoundError("Schedule");
      }

      updateData.schedule = { connect: { id: scheduleId } };
    } else if (scheduleId === null) {
      updateData.schedule = { disconnect: true };
    }

    // Calculate total minutes if both in and out times are available
    const inTime = clockInTime ? new Date(clockInTime) : timeClock.clockInTime;
    const outTime = clockOutTime
      ? new Date(clockOutTime)
      : timeClock.clockOutTime;

    if (outTime) {
      const totalMinutes = Math.round(
        (outTime.getTime() - inTime.getTime()) / 60000
      );

      updateData.totalMinutes = totalMinutes > 0 ? totalMinutes : 0;
    } else {
      updateData.totalMinutes = null;
    }

    // Update time clock
    try {
      const updatedTimeClock = await prisma.timeClock.update({
        where: { id },
        data: updateData,
        select: timeClockWithUserSelect,
      });

      return updatedTimeClock;
    } catch (error) {
      logger.error("Error updating time clock:", error);
      throw error;
    }
  }

  /**
   * Delete time clock
   */
  async delete(id: string): Promise<void> {
    // Check if time clock exists
    const timeClock = await prisma.timeClock.findUnique({
      where: { id },
    });

    if (!timeClock) {
      throw new NotFoundError("TimeClock");
    }

    // Delete time clock
    try {
      await prisma.timeClock.delete({
        where: { id },
      });
    } catch (error) {
      logger.error("Error deleting time clock:", error);
      throw error;
    }
  }

  /**
   * Find active time clock for user
   */
  async findActiveByUser(
    userId: string
  ): Promise<TimeClockWithUserSelect | null> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // Find active time clock
    const activeTimeClock = await prisma.timeClock.findFirst({
      where: {
        userId,
        clockOutTime: null,
      },
      select: timeClockWithUserSelect,
    });

    return activeTimeClock;
  }

  /**
   * Find time clocks by user
   */
  async findByUser(
    userId: string,
    queryParams: any = {}
  ): Promise<PaginatedTimeClockResponse> {
    const { page, limit, startDate, endDate, completed } = queryParams;
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
    const where: Prisma.TimeClockWhereInput = { userId };

    // Date range filter
    if (startDate || endDate) {
      where.AND = [];

      if (startDate) {
        where.AND.push({
          clockInTime: {
            gte: new Date(startDate),
          },
        });
      }

      if (endDate) {
        where.AND.push({
          clockInTime: {
            lt: new Date(
              new Date(endDate).setDate(new Date(endDate).getDate() + 1)
            ),
          },
        });
      }
    }

    // Completed filter
    if (completed !== undefined) {
      if (completed === "true") {
        where.clockOutTime = { not: null };
      } else if (completed === "false") {
        where.clockOutTime = null;
      }
    }

    const total = await prisma.timeClock.count({ where });

    const timeClocks = await prisma.timeClock.findMany({
      where,
      select: timeClockWithUserSelect,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        clockInTime: "desc",
      },
    });

    return createPaginatedResponse(
      timeClocks as any,
      total,
      pagination.page,
      pagination.limit
    );
  }
}

export const timeClocksService = new TimeClocksService();
