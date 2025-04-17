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
import { Prisma, StatutoryHoliday } from "@prisma/client";
import {
  CreateHolidayDto,
  HolidayQueryParams,
  PaginatedHolidayResponse,
  UpdateHolidayDto,
} from "./dto/holiday.dto";
import { defaultHolidaySelect } from "./holidays.selections";

export class HolidaysService {
  /**
   * Find all holidays with pagination and filtering
   */
  async findAll(
    queryParams: HolidayQueryParams
  ): Promise<PaginatedHolidayResponse> {
    const { page, limit, search, year, province } = queryParams;
    const pagination = getPaginationParams(page, limit);

    // Build where clause
    const where: Prisma.StatutoryHolidayWhereInput = {};

    // Search filter
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Year filter
    if (year) {
      where.year = parseInt(year.toString(), 10);
    }

    // Province filter
    if (province) {
      where.province = province;
    }

    // Count total matching records
    const total = await prisma.statutoryHoliday.count({ where });

    // Get holidays
    const holidays = await prisma.statutoryHoliday.findMany({
      where,
      select: defaultHolidaySelect,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        date: "asc",
      },
    });

    return createPaginatedResponse(
      holidays,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Find holiday by ID
   */
  async findById(id: string): Promise<StatutoryHoliday> {
    const holiday = await prisma.statutoryHoliday.findUnique({
      where: { id },
      select: defaultHolidaySelect,
    });

    if (!holiday) {
      throw new NotFoundError("Statutory Holiday");
    }

    return holiday;
  }

  /**
   * Find holidays by year
   */
  async findByYear(year: number): Promise<StatutoryHoliday[]> {
    return prisma.statutoryHoliday.findMany({
      where: { year },
      select: defaultHolidaySelect,
      orderBy: {
        date: "asc",
      },
    });
  }

  /**
   * Create a new holiday
   */
  async create(createHolidayDto: CreateHolidayDto): Promise<StatutoryHoliday> {
    const { name, date, year, province } = createHolidayDto;

    // Check if holiday already exists for this date
    const holidayDate = new Date(date);
    const existingHoliday = await prisma.statutoryHoliday.findFirst({
      where: {
        date: {
          gte: new Date(holidayDate.setHours(0, 0, 0, 0)),
          lt: new Date(holidayDate.setHours(23, 59, 59, 999)),
        },
        province,
      },
    });

    if (existingHoliday) {
      throw new ConflictError(
        "date",
        `Holiday already exists for date ${new Date(date).toLocaleDateString()}`
      );
    }

    // Create holiday
    try {
      return await prisma.statutoryHoliday.create({
        data: {
          name,
          date: new Date(date),
          year,
          province,
        },
        select: defaultHolidaySelect,
      });
    } catch (error) {
      logger.error("Error creating holiday:", error);
      throw error;
    }
  }

  /**
   * Update an existing holiday
   */
  async update(
    id: string,
    updateHolidayDto: UpdateHolidayDto
  ): Promise<StatutoryHoliday> {
    // Check if holiday exists
    const holiday = await prisma.statutoryHoliday.findUnique({
      where: { id },
    });

    if (!holiday) {
      throw new NotFoundError("Statutory Holiday");
    }

    // Prepare update data
    const updateData: Prisma.StatutoryHolidayUpdateInput = {
      ...updateHolidayDto,
    };

    if (updateHolidayDto.date) {
      updateData.date = new Date(updateHolidayDto.date);
    }

    // Check for conflicts if date or province is changing
    if (updateHolidayDto.date || updateHolidayDto.province) {
      const holidayDate = updateHolidayDto.date
        ? new Date(updateHolidayDto.date)
        : holiday.date;

      const province = updateHolidayDto.province || holiday.province;

      const existingHoliday = await prisma.statutoryHoliday.findFirst({
        where: {
          id: { not: id },
          date: {
            gte: new Date(new Date(holidayDate).setHours(0, 0, 0, 0)),
            lt: new Date(new Date(holidayDate).setHours(23, 59, 59, 999)),
          },
          province,
        },
      });

      if (existingHoliday) {
        throw new ConflictError(
          "date",
          `Holiday already exists for date ${new Date(
            holidayDate
          ).toLocaleDateString()}`
        );
      }
    }

    // Update holiday
    try {
      return await prisma.statutoryHoliday.update({
        where: { id },
        data: updateData,
        select: defaultHolidaySelect,
      });
    } catch (error) {
      logger.error("Error updating holiday:", error);
      throw error;
    }
  }

  /**
   * Delete a holiday
   */
  async delete(id: string): Promise<void> {
    // Check if holiday exists
    const holiday = await prisma.statutoryHoliday.findUnique({
      where: { id },
    });

    if (!holiday) {
      throw new NotFoundError("Statutory Holiday");
    }

    // Delete holiday
    try {
      await prisma.statutoryHoliday.delete({
        where: { id },
      });
    } catch (error) {
      logger.error("Error deleting holiday:", error);
      throw error;
    }
  }

  /**
   * Check if user is eligible for statutory holiday pay
   * Eligible if:
   * - Employed for at least 30 days AND
   * - Worked at least 15 of the 30 days before the holiday
   */
  async isEligibleForHolidayPay(
    userId: string,
    holidayDate: Date
  ): Promise<boolean> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hireDate: true },
    });

    if (!user) {
      return false;
    }

    // Check if employed for at least 30 days
    const thirtyDaysBefore = new Date(holidayDate);
    thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);

    if (user.hireDate > thirtyDaysBefore) {
      return false; // Not employed for 30 days before the holiday
    }

    // Count days worked in the 30 days before the holiday
    const startDate = new Date(thirtyDaysBefore);
    const endDate = new Date(holidayDate);

    const timeClocks = await prisma.timeClock.findMany({
      where: {
        userId,
        clockInTime: {
          gte: startDate,
          lt: endDate,
        },
        clockOutTime: { not: null },
      },
      select: {
        clockInTime: true,
      },
      distinct: ["clockInTime"],
    });

    // Get unique days worked (in case of multiple clock-ins on same day)
    const daysWorked = new Set<string>();
    timeClocks.forEach((tc) => {
      daysWorked.add(tc.clockInTime.toISOString().split("T")[0]);
    });

    return daysWorked.size >= 15;
  }
}

export const holidaysService = new HolidaysService();
