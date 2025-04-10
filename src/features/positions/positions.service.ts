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
import { Position, Prisma } from "@prisma/client";
import {
  CreatePositionDto,
  PaginatedPositionResponse,
  PositionQueryParams,
  UpdatePositionDto,
} from "./dto/position.dto";
import { UserListSelect, userListSelect } from "../users/users.selections";

export class PositionsService {
  /**
   * Find all positions
   */
  async findAll(
    queryParams: PositionQueryParams
  ): Promise<PaginatedPositionResponse> {
    const { page, limit, search } = queryParams;
    const pagination = getPaginationParams(page, limit);

    const where: Prisma.PositionWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Count total matching records
    const total = await prisma.position.count({ where });

    // Get positions
    const positions = await prisma.position.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        title: "asc",
      },
    });

    return createPaginatedResponse(
      positions,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Find position by ID
   */
  async findById(id: string): Promise<Position> {
    const position = await prisma.position.findUnique({
      where: { id },
    });

    if (!position) {
      throw new NotFoundError("Position");
    }

    return position;
  }

  /**
   * Create a new position
   */
  async create(createPositionDto: CreatePositionDto): Promise<Position> {
    const { title, description } = createPositionDto;

    // Check if position with this title already exists
    const existingPosition = await prisma.position.findFirst({
      where: { title: { equals: title, mode: "insensitive" } },
    });

    if (existingPosition) {
      throw new ConflictError(
        "title",
        `Position with title '${title}' already exists`
      );
    }

    // Create position
    try {
      const position = await prisma.position.create({
        data: {
          title,
          description,
        },
      });

      return position;
    } catch (error) {
      logger.error("Error creating position:", error);
      throw error;
    }
  }

  /**
   * Update an existing position
   */
  async update(
    id: string,
    updatePositionDto: UpdatePositionDto
  ): Promise<Position> {
    const { title, description } = updatePositionDto;

    // Check if position exists
    const existingPosition = await prisma.position.findUnique({
      where: { id },
    });

    if (!existingPosition) {
      throw new NotFoundError("Position");
    }

    // If title is being updated, check for duplicates
    if (title && title !== existingPosition.title) {
      const duplicateTitle = await prisma.position.findFirst({
        where: {
          title: { equals: title, mode: "insensitive" },
          id: { not: id },
        },
      });

      if (duplicateTitle) {
        throw new ConflictError(
          "title",
          `Position with title '${title}' already exists`
        );
      }
    }

    // Update position
    try {
      const position = await prisma.position.update({
        where: { id },
        data: {
          title,
          description,
        },
      });

      return position;
    } catch (error) {
      logger.error("Error updating position:", error);
      throw error;
    }
  }

  /**
   * Delete a position
   */
  async delete(id: string): Promise<void> {
    // Check if position exists
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true },
        },
      },
    });

    if (!position) {
      throw new NotFoundError("Position");
    }

    // Check if position has users
    if (position.users.length > 0) {
      throw new ConflictError(
        "position",
        "Cannot delete position with associated users"
      );
    }

    // Delete position
    try {
      await prisma.position.delete({
        where: { id },
      });
    } catch (error) {
      logger.error("Error deleting position:", error);
      throw error;
    }
  }

  /**
   * Find users by position
   */
  async findUsersByPosition(
    positionId: string,
    queryParams: any = {}
  ): Promise<{ data: UserListSelect[]; total: number }> {
    const { page, limit } = queryParams;
    const pagination = getPaginationParams(page, limit);

    // Check if position exists
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      throw new NotFoundError("Position");
    }

    // Count total users in position
    const total = await prisma.user.count({
      where: { positionId },
    });

    // Get users in position
    const users = await prisma.user.findMany({
      where: { positionId },
      select: userListSelect,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        lastName: "asc",
      },
    });

    return {
      data: users,
      total,
    };
  }
}

export const positionsService = new PositionsService();
