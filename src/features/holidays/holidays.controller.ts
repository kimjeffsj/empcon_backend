import { NextFunction, Request, Response } from "express";
import { holidaysService } from "./holidays.service";
import { CreateHolidayDto, UpdateHolidayDto } from "./dto/holiday.dto";
import { logger } from "@/common/utils/logger.utils";

export class HolidaysController {
  /**
   * Get all holidays
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await holidaysService.findAll(req.query);

      res.status(200).json({
        message: "Statutory holidays retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get holiday by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const holiday = await holidaysService.findById(id);

      res.status(200).json({
        message: "Statutory holiday retrieved successfully",
        data: holiday,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get holidays by year
   */
  async findByYear(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.params.year, 10);

      if (isNaN(year)) {
        res.status(400).json({
          success: false,
          message: "Invalid year parameter",
        });
        return;
      }

      const holidays = await holidaysService.findByYear(year);

      res.status(200).json({
        message: `Statutory holidays for ${year} retrieved successfully`,
        data: holidays,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new holiday
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const holidayData: CreateHolidayDto = req.body;

      const newHoliday = await holidaysService.create(holidayData);

      res.status(201).json({
        message: "Statutory holiday created successfully",
        data: newHoliday,
      });
      return;
    } catch (error) {
      logger.error("Error creating statutory holiday:", error);
      next(error);
    }
  }

  /**
   * Update a holiday
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const holidayData: UpdateHolidayDto = req.body;

      const updatedHoliday = await holidaysService.update(id, holidayData);

      res.status(200).json({
        message: "Statutory holiday updated successfully",
        data: updatedHoliday,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a holiday
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      await holidaysService.delete(id);

      res.status(200).json({
        message: "Statutory holiday deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const holidaysController = new HolidaysController();
