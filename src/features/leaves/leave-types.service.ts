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
  CreateLeaveTypeDto,
  LeaveTypeQueryParams,
  PaginatedLeaveTypeResponse,
  UpdateLeaveTypeDto,
} from "./dto/leave.dto";
import {
  DefaultLeaveTypeSelect,
  defaultLeaveTypeSelect,
} from "./leaves.selections";

export class LeaveTypesService {
  /**
   * Find all leave types with pagination and filtering
   */
  async findAll(
    queryParams: LeaveTypeQueryParams
  ): Promise<PaginatedLeaveTypeResponse> {
    const { page, limit, search } = queryParams;
    const pagination = getPaginationParams(page, limit);

    // Build where clause
    const where: Prisma.LeaveTypeWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Count total matching records
    const total = await prisma.leaveType.count({ where });

    // Get leave types
    const leaveTypes = await prisma.leaveType.findMany({
      where,
      select: defaultLeaveTypeSelect,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        name: "asc",
      },
    });

    return createPaginatedResponse(
      leaveTypes,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Find leave type by ID
   */
  async findById(id: string): Promise<DefaultLeaveTypeSelect> {
    const leaveType = await prisma.leaveType.findUnique({
      where: { id },
      select: defaultLeaveTypeSelect,
    });

    if (!leaveType) {
      throw new NotFoundError("Leave Type");
    }

    return leaveType;
  }

  /**
   * Create a new leave type
   */
  async create(
    createLeaveTypeDto: CreateLeaveTypeDto
  ): Promise<DefaultLeaveTypeSelect> {
    const {
      name,
      description,
      paidLeave,
      requiresBalance,
      defaultDays,
      allowsCarryOver,
      allowsPayout,
    } = createLeaveTypeDto;

    // Check if leave type with this name already exists
    const existingLeaveType = await prisma.leaveType.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existingLeaveType) {
      throw new ConflictError(
        "name",
        `Leave type with name '${name}' already exists`
      );
    }

    // Create leave type
    try {
      return await prisma.leaveType.create({
        data: {
          name,
          description,
          paidLeave: paidLeave !== undefined ? paidLeave : true,
          requiresBalance:
            requiresBalance !== undefined ? requiresBalance : true,
          defaultDays,
          allowsCarryOver:
            allowsCarryOver !== undefined ? allowsCarryOver : false,
          allowsPayout: allowsPayout !== undefined ? allowsPayout : false,
        },
        select: defaultLeaveTypeSelect,
      });
    } catch (error) {
      logger.error("Error creating leave type:", error);
      throw error;
    }
  }

  /**
   * Update an existing leave type
   */
  async update(
    id: string,
    updateLeaveTypeDto: UpdateLeaveTypeDto
  ): Promise<DefaultLeaveTypeSelect> {
    // Check if leave type exists
    const leaveType = await prisma.leaveType.findUnique({
      where: { id },
    });

    if (!leaveType) {
      throw new NotFoundError("Leave Type");
    }

    const { name } = updateLeaveTypeDto;

    // Check for name conflicts if name is being updated
    if (name && name !== leaveType.name) {
      const existingLeaveType = await prisma.leaveType.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
        },
      });

      if (existingLeaveType) {
        throw new ConflictError(
          "name",
          `Leave type with name '${name}' already exists`
        );
      }
    }

    // Update leave type
    try {
      return await prisma.leaveType.update({
        where: { id },
        data: updateLeaveTypeDto,
        select: defaultLeaveTypeSelect,
      });
    } catch (error) {
      logger.error("Error updating leave type:", error);
      throw error;
    }
  }

  /**
   * Delete a leave type
   */
  async delete(id: string): Promise<void> {
    // Check if leave type exists
    const leaveType = await prisma.leaveType.findUnique({
      where: { id },
      include: {
        requests: {
          take: 1,
        },
      },
    });

    if (!leaveType) {
      throw new NotFoundError("Leave Type");
    }

    // Check if leave type has related requests
    if (leaveType.requests.length > 0) {
      throw new ConflictError(
        "leave type",
        "Cannot delete leave type with associated leave requests"
      );
    }

    // Delete leave type
    try {
      await prisma.leaveType.delete({
        where: { id },
      });
    } catch (error) {
      logger.error("Error deleting leave type:", error);
      throw error;
    }
  }
}

export const leaveTypesService = new LeaveTypesService();
