import {
  ConflictError,
  NotFoundError,
} from "@/common/middleware/error.middleware";
import { dateUtils, getPaginationParams } from "@/common/utils/helpers.utils";
import { logger } from "@/common/utils/logger.utils";
import prisma from "@/entities/prisma";
import bcrypt from "bcryptjs";
import {
  CreateUserDto,
  PaginatedUserResponse,
  UpdateUserDto,
  UpdateUserProfileDto,
  UserQueryParams,
} from "./dto/user.dto";
import { Prisma, UserProfile } from "@prisma/client";
import {
  defaultUserSelect,
  UserListSelect,
  userListSelect,
  userWithRelationsSelect,
  UserWithRelationsSelect,
} from "./users.selections";

export class UsersService {
  /**
   * Find all users with pagination and filtering
   */
  async findAll(queryParams: UserQueryParams): Promise<PaginatedUserResponse> {
    const { page, limit, search, departmentId, role, isActive } = queryParams;
    const pagination = getPaginationParams(page, limit);

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Department filter
    if (departmentId) {
      where.departmentId = departmentId;
    }

    // Role filter
    if (role) {
      where.role = role;
    }

    // Active/Inactive filter
    if (isActive !== undefined) {
      const active = isActive === "true";
      where.terminationDate = active ? null : { not: null };
    }

    // Count total matching records
    const total = await prisma.user.count({ where });

    // Get users with safe fields
    const users = await prisma.user.findMany({
      where,
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
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Find a single user by ID
   */
  async findById(id: string): Promise<UserWithRelationsSelect> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: userWithRelationsSelect,
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    return user;
  }

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<UserWithRelationsSelect> {
    const { email, password, profile, ...userData } = createUserDto;

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError("email");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with profile in a transaction
    try {
      const user = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            ...userData,
          },
          select: defaultUserSelect,
        });

        // Create profile if provided
        if (profile) {
          await tx.userProfile.create({
            data: {
              ...profile,
              userId: newUser.id,
            },
          });
        }

        return tx.user.findUnique({
          where: { id: newUser.id },
          select: userWithRelationsSelect,
        });
      });

      if (!user) {
        throw new Error("Failed to create user");
      }

      return user;
    } catch (error) {
      logger.error("Error creating user:", error);
      throw error;
    }
  }

  /**
   * Update an existing user
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto
  ): Promise<UserWithRelationsSelect> {
    const { profile, password, ...userData } = updateUserDto;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      throw new NotFoundError("User");
    }

    // If email is being updated, check for duplicates
    if (userData.email && userData.email !== existingUser.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (duplicateEmail) {
        throw new ConflictError("email");
      }
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = { ...userData };

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user and profile in a transaction
    try {
      const user = await prisma.$transaction(async (tx) => {
        // Update user
        const updatedUser = await tx.user.update({
          where: { id },
          data: updateData,
          select: defaultUserSelect,
        });

        // Update profile if provided
        if (profile) {
          // Check if profile exists
          const existingProfile = await tx.userProfile.findUnique({
            where: { userId: id },
          });

          if (existingProfile) {
            await tx.userProfile.update({
              where: { userId: id },
              data: profile,
            });
          } else {
            await tx.userProfile.create({
              data: {
                ...profile,
                userId: id,
              },
            });
          }
        }

        return tx.user.findUnique({
          where: { id },
          select: userWithRelationsSelect,
        });
      });

      if (!user) {
        throw new Error("Failed to update user");
      }

      return user;
    } catch (error) {
      logger.error("Error updating user:", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateUserProfileDto
  ): Promise<UserProfile> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // Check if profile exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // Update or create profile
    if (existingProfile) {
      return prisma.userProfile.update({
        where: { userId },
        data: updateProfileDto,
      });
    } else {
      return prisma.userProfile.create({
        data: {
          ...updateProfileDto,
          userId,
        },
      });
    }
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<void> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // Delete user and related data in a transaction
    try {
      await prisma.$transaction(async (tx) => {
        // Delete profile if exists
        const profile = await tx.userProfile.findUnique({
          where: { userId: id },
        });

        if (profile) {
          await tx.userProfile.delete({
            where: { userId: id },
          });
        }

        // Delete user
        await tx.user.delete({
          where: { id },
        });
      });
    } catch (error) {
      logger.error("Error deleting user:", error);
      throw error;
    }
  }

  /**
   * Get new employees (hired in the last 30 days)
   */
  async getNewEmployees(): Promise<UserListSelect[]> {
    const thirtyDaysAgo = dateUtils.daysAgo(30);

    const newUsers = await prisma.user.findMany({
      where: {
        hireDate: {
          gte: thirtyDaysAgo,
        },
        terminationDate: null,
      },
      select: userListSelect,
      orderBy: {
        hireDate: "desc",
      },
    });

    return newUsers;
  }

  /**
   * Get resigned employees
   */
  async getResignedEmployees(): Promise<UserListSelect[]> {
    const resignedUsers = await prisma.user.findMany({
      where: {
        terminationDate: {
          not: null,
        },
      },
      select: userListSelect,
      orderBy: {
        terminationDate: "desc",
      },
    });

    return resignedUsers;
  }
}

export const usersService = new UsersService();
