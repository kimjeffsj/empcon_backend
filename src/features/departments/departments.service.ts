import {
  createPaginatedResponse,
  getPaginationParams,
} from "@/common/utils/helpers.utils";
import {
  CreateDepartmentDto,
  DepartmentQueryParams,
  PaginatedDepartmentResponse,
  UpdateDepartmentDto,
} from "./dto/department.dto";
import { Department, Prisma } from "@prisma/client";
import prisma from "@/entities/prisma";
import {
  ConflictError,
  NotFoundError,
} from "@/common/middleware/error.middleware";
import { logger } from "@/common/utils/logger.utils";
import { userListSelect, UserListSelect } from "../users/users.selections";

export class DepartmentsService {
  /**
   * Find all departments
   */
  async findAll(
    queryParams: DepartmentQueryParams
  ): Promise<PaginatedDepartmentResponse> {
    const { page, limit, search } = queryParams;
    const pagination = getPaginationParams(page, limit);

    const where: Prisma.DepartmentWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.department.count({ where });

    const department = await prisma.department.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        name: "asc",
      },
    });

    return createPaginatedResponse(
      department,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Find department by Id
   */
  async findById(id: string): Promise<Department> {
    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundError("Department");
    }

    return department;
  }

  /**
   * Create a new department
   */
  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const { name, description } = createDepartmentDto;

    const existingDepartment = await prisma.department.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existingDepartment) {
      throw new ConflictError(
        "name",
        `Department with name '${name}' already exists`
      );
    }

    // Create department
    try {
      const department = await prisma.department.create({
        data: {
          name,
          description,
        },
      });

      return department;
    } catch (error) {
      logger.error("Error creating department: ", error);
      throw error;
    }
  }

  /**
   * Update an existing department
   */
  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto
  ): Promise<Department> {
    const { name, description } = updateDepartmentDto;

    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      throw new NotFoundError("Department");
    }

    if (name && name !== existingDepartment.name) {
      const duplicateName = await prisma.department.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
        },
      });

      if (duplicateName) {
        throw new ConflictError(
          "name",
          `Department with name '${name}' already exists`
        );
      }
    }

    // Update department
    try {
      const department = await prisma.department.update({
        where: { id },
        data: {
          name,
          description,
        },
      });

      return department;
    } catch (error) {
      logger.error("Error updating department: ", error);
      throw error;
    }
  }

  /**
   * Delete a department
   */
  async delete(id: string): Promise<void> {
    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true },
        },
      },
    });

    if (!department) {
      throw new NotFoundError("Department");
    }

    if (department.users.length > 0) {
      throw new ConflictError(
        "department",
        "Cannot delete department with associated users"
      );
    }

    // Delete department
    try {
      await prisma.department.delete({
        where: { id },
      });
    } catch (error) {
      logger.error("Error deleting department: ", error);
      throw error;
    }
  }

  /**
   * Find users by department
   */
  async findUsersByDepartment(
    departmentId: string,
    queryParams: any = {}
  ): Promise<{ data: UserListSelect[]; total: number }> {
    const { page, limit } = queryParams;
    const pagination = getPaginationParams(page, limit);

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new NotFoundError("Department");
    }

    const total = await prisma.user.count({
      where: { departmentId },
    });

    // Get users
    const users = await prisma.user.findMany({
      where: { departmentId },
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

export const departmentsService = new DepartmentsService();
