import { NextFunction, Request, Response } from "express";
import { schedulesService } from "./schedules.service";
import {
  BatchScheduleDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from "./dto/schedule.dto";
import { logger } from "@/common/utils/logger.utils";
import { ValidationError } from "@/common/middleware/error.middleware";

export class SchedulesController {
  /**
   * Get all schedules
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await schedulesService.findAll(req.query);

      res.status(200).json({
        message: "Schedules retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get schedule by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const schedule = await schedulesService.findById(id);

      res.status(200).json({
        message: "Schedule retrieved successfully",
        data: schedule,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new schedule
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const scheduleData: CreateScheduleDto = req.body;

      // Set created by to current user
      if (!scheduleData.createdBy && req.user) {
        scheduleData.createdBy = req.user.userId;
      }

      const newSchedule = await schedulesService.create(scheduleData);

      res.status(201).json({
        message: "Schedule created successfully",
        data: newSchedule,
      });
      return;
    } catch (error) {
      logger.error("Error creating schedule:", error);
      next(error);
    }
  }

  /**
   * Create multiple schedules (batch)
   */
  async createBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batchData: BatchScheduleDto = req.body;

      if (!batchData.schedules || !Array.isArray(batchData.schedules)) {
        throw new ValidationError({
          schedules: "Schedules must be an array",
        });
      }

      // Set created by to current user for all schedules
      if (req.user) {
        batchData.schedules = batchData.schedules.map((schedule) => ({
          ...schedule,
          createdBy: schedule.createdBy || req.user!.userId,
        }));
      }

      const result = await schedulesService.createBatch(batchData);

      res.status(201).json({
        message: `${result.count} schedules created successfully`,
        data: result,
      });
      return;
    } catch (error) {
      logger.error("Error creating batch schedules:", error);
      next(error);
    }
  }

  /**
   * Update a schedule
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const scheduleData: UpdateScheduleDto = req.body;

      const updatedSchedule = await schedulesService.update(id, scheduleData);

      res.status(200).json({
        message: "Schedule updated successfully",
        data: updatedSchedule,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a schedule
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      await schedulesService.delete(id);

      res.status(200).json({
        message: "Schedule deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get schedules by user
   */
  async findByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;

      const result = await schedulesService.findByUser(userId, req.query);

      res.status(200).json({
        message: "User schedules retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const schedulesController = new SchedulesController();
