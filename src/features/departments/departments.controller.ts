import { NextFunction, Request, Response } from "express";
import { departmentsService } from "./departments.service";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./dto/department.dto";
import { logger } from "@/common/utils/logger.utils";

export class DepartmentsController {
  /**
   * Get all departments
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await departmentsService.findAll(req.query);

      res.status(200).json({
        message: "Departments retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get department By ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const department = await departmentsService.findById(id);

      res.status(200).json({
        message: "Department retrieved successfully",
        data: department,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new department
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const departmentData: CreateDepartmentDto = req.body;

      const newDepartment = await departmentsService.create(departmentData);

      res.status(201).json({
        message: "Department created successfully",
        data: newDepartment,
      });
      return;
    } catch (error) {
      logger.error("Error creating department: ", error);
      next(error);
    }
  }

  /**
   * Update a department
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const departmentData: UpdateDepartmentDto = req.body;

      const updatedDepartment = await departmentsService.update(
        id,
        departmentData
      );

      res.status(200).json({
        message: "Department updated successfully",
        data: updatedDepartment,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a department
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      await departmentsService.delete(id);

      res.status(200).json({
        message: "Department deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users by department
   */
  async findUsersByDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const departmentId = req.params.id;

      const users = await departmentsService.findUsersByDepartment(
        departmentId,
        req.query
      );

      res.status(200).json({
        message: "Department users retrieved successfully",
        ...users,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const departmentsController = new DepartmentsController();
