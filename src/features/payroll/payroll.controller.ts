import { NextFunction, Request, Response } from "express";
import { payrollService } from "./payroll.service";
import {
  CreatePayPeriodDto,
  PayAdjustmentDto,
  UpdatePayPeriodDto,
} from "./dto/payroll.dto";
import { logger } from "@/common/utils/logger.utils";

export class PayrollController {
  /**
   * Get all pay periods
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await payrollService.findAll(req.query);

      res.status(200).json({
        message: "Pay periods retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pay period by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const payPeriod = await payrollService.findById(id);

      res.status(200).json({
        message: "Pay period retrieved successfully",
        data: payPeriod,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new pay period
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payPeriodData: CreatePayPeriodDto = req.body;

      const newPayPeriod = await payrollService.create(payPeriodData);

      res.status(201).json({
        message: "Pay period created successfully",
        data: newPayPeriod,
      });
      return;
    } catch (error) {
      logger.error("Error creating pay period:", error);
      next(error);
    }
  }

  /**
   * Update a pay period
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const payPeriodData: UpdatePayPeriodDto = req.body;

      const updatedPayPeriod = await payrollService.update(id, payPeriodData);

      res.status(200).json({
        message: "Pay period updated successfully",
        data: updatedPayPeriod,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a pay period
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      await payrollService.delete(id);

      res.status(200).json({
        message: "Pay period deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate payroll for a pay period
   */
  async calculatePayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const payPeriodId = req.params.id;

      const count = await payrollService.calculatePayroll(payPeriodId);

      res.status(200).json({
        message: `Payroll calculated successfully for ${count} employees`,
        data: { employeeCount: count },
      });
      return;
    } catch (error) {
      logger.error("Error calculating payroll:", error);
      next(error);
    }
  }

  /**
   * Add adjustment to a pay calculation
   */
  async addAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const adjustmentData: PayAdjustmentDto = req.body;

      // Set created by if not provided
      if (!adjustmentData.createdBy && req.user) {
        adjustmentData.createdBy = req.user.userId;
      }

      const updatedPayPeriod = await payrollService.addAdjustment(
        adjustmentData
      );

      res.status(200).json({
        message: "Payment adjustment added successfully",
        data: updatedPayPeriod,
      });
      return;
    } catch (error) {
      logger.error("Error adding payment adjustment:", error);
      next(error);
    }
  }

  /**
   * Mark pay period as paid
   */
  async markAsPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const payPeriodId = req.params.id;

      const updatedPayPeriod = await payrollService.markAsPaid(payPeriodId);

      res.status(200).json({
        message: "Pay period marked as paid successfully",
        data: updatedPayPeriod,
      });
      return;
    } catch (error) {
      logger.error("Error marking pay period as paid:", error);
      next(error);
    }
  }

  /**
   * Export payroll data
   */
  async exportPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const payPeriodId = req.params.id;

      // Generate export data
      const exportData = await payrollService.generatePayrollExport(
        payPeriodId
      );

      res.status(200).json({
        message: "Payroll export generated successfully",
        data: exportData,
      });
      return;
    } catch (error) {
      logger.error("Error exporting payroll:", error);
      next(error);
    }
  }
}

export const payrollController = new PayrollController();
