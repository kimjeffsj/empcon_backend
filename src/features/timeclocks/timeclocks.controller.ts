import { NextFunction, Request, Response } from "express";
import { timeClocksService } from "./timeclocks.service";
import {
  ClockInDto,
  ClockOutDto,
  UpdateTimeClockDto,
} from "./dto/timeclock.dto";
import { logger } from "@/common/utils/logger.utils";
import { ValidationError } from "@/common/middleware/error.middleware";

export class TimeClocksController {
  /**
   * Get all time clocks
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await timeClocksService.findAll(req.query);

      res.status(200).json({
        message: "Time clocks retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get time clock by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const timeClock = await timeClocksService.findById(id);

      res.status(200).json({
        message: "Time clock retrieved successfully",
        data: timeClock,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clock in
   */
  async clockIn(req: Request, res: Response, next: NextFunction) {
    try {
      const clockInData: ClockInDto = req.body;

      // If no userId provided, use the authenticated user
      if (!clockInData.userId && req.user) {
        clockInData.userId = req.user.userId;
      }

      const timeClock = await timeClocksService.clockIn(clockInData);

      res.status(201).json({
        message: "Clock in successful",
        data: timeClock,
      });
      return;
    } catch (error) {
      logger.error("Error clocking in:", error);
      next(error);
    }
  }

  /**
   * Clock out
   */
  async clockOut(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const clockOutData: ClockOutDto = req.body;

      const timeClock = await timeClocksService.clockOut(id, clockOutData);

      res.status(200).json({
        message: "Clock out successful",
        data: timeClock,
      });
      return;
    } catch (error) {
      logger.error("Error clocking out:", error);
      next(error);
    }
  }

  /**
   * Update time clock
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const updateData: UpdateTimeClockDto = req.body;

      const updatedTimeClock = await timeClocksService.update(id, updateData);

      res.status(200).json({
        message: "Time clock updated successfully",
        data: updatedTimeClock,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete time clock
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      await timeClocksService.delete(id);

      res.status(200).json({
        message: "Time clock deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active time clock for user
   */
  async findActiveByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req.user ? req.user.userId : null);

      if (!userId) {
        throw new ValidationError("User ID is required");
      }

      const timeClock = await timeClocksService.findActiveByUser(userId);

      res.status(200).json({
        message: "Active time clock retrieved successfully",
        data: timeClock,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get time clocks by user
   */
  async findByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;

      const result = await timeClocksService.findByUser(userId, req.query);

      res.status(200).json({
        message: "User time clocks retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const timeClocksController = new TimeClocksController();
