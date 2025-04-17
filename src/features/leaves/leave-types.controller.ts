import { NextFunction, Request, Response } from "express";
import { leaveTypesService } from "./leave-types.service";
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from "./dto/leave.dto";
import { logger } from "@/common/utils/logger.utils";

export class LeaveTypesController {
  /**
   * Get all leave types
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leaveTypesService.findAll(req.query);

      res.status(200).json({
        message: "Leave types retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave type by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const leaveType = await leaveTypesService.findById(id);

      res.status(200).json({
        message: "Leave type retrieved successfully",
        data: leaveType,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new leave type
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const leaveTypeData: CreateLeaveTypeDto = req.body;

      const newLeaveType = await leaveTypesService.create(leaveTypeData);

      res.status(201).json({
        message: "Leave type created successfully",
        data: newLeaveType,
      });
      return;
    } catch (error) {
      logger.error("Error creating leave type:", error);
      next(error);
    }
  }

  /**
   * Update a leave type
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const leaveTypeData: UpdateLeaveTypeDto = req.body;

      const updatedLeaveType = await leaveTypesService.update(
        id,
        leaveTypeData
      );

      res.status(200).json({
        message: "Leave type updated successfully",
        data: updatedLeaveType,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a leave type
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      await leaveTypesService.delete(id);

      res.status(200).json({
        message: "Leave type deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const leaveTypesController = new LeaveTypesController();
