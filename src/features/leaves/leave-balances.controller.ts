import { NextFunction, Request, Response } from "express";
import { leaveBalancesService } from "./leave-balances.service";
import {
  AdjustLeaveBalanceDto,
  CreateLeaveBalanceDto,
  UpdateLeaveBalanceDto,
} from "./dto/leave.dto";
import { logger } from "@/common/utils/logger.utils";

export class LeaveBalancesController {
  /**
   * Get all leave balances
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leaveBalancesService.findAll(req.query);

      res.status(200).json({
        message: "Leave balances retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave balance by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const leaveBalance = await leaveBalancesService.findById(id);

      res.status(200).json({
        message: "Leave balance retrieved successfully",
        data: leaveBalance,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave balances for a specific user
   */
  async findByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const year = req.query.year
        ? parseInt(req.query.year as string, 10)
        : undefined;

      const userBalances = await leaveBalancesService.findByUser(userId, year);

      res.status(200).json({
        message: "User leave balances retrieved successfully",
        data: userBalances,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check leave balance for a specific request
   */
  async checkBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, leaveTypeId, days, year } = req.body;

      const balanceCheck = await leaveBalancesService.checkBalance(
        userId,
        leaveTypeId,
        days,
        year
      );

      res.status(200).json({
        message: "Leave balance check completed",
        data: balanceCheck,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new leave balance
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const leaveBalanceData: CreateLeaveBalanceDto = req.body;

      const newLeaveBalance = await leaveBalancesService.create(
        leaveBalanceData
      );

      res.status(201).json({
        message: "Leave balance created successfully",
        data: newLeaveBalance,
      });
      return;
    } catch (error) {
      logger.error("Error creating leave balance:", error);
      next(error);
    }
  }

  /**
   * Update a leave balance
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const leaveBalanceData: UpdateLeaveBalanceDto = req.body;

      const updatedLeaveBalance = await leaveBalancesService.update(
        id,
        leaveBalanceData
      );

      res.status(200).json({
        message: "Leave balance updated successfully",
        data: updatedLeaveBalance,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adjust leave balance
   */
  async adjustBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const adjustBalanceData: AdjustLeaveBalanceDto = req.body;

      const updatedLeaveBalance = await leaveBalancesService.adjustBalance(
        adjustBalanceData
      );

      res.status(200).json({
        message: "Leave balance adjusted successfully",
        data: updatedLeaveBalance,
      });
      return;
    } catch (error) {
      logger.error("Error adjusting leave balance:", error);
      next(error);
    }
  }

  /**
   * Delete a leave balance
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      await leaveBalancesService.delete(id);

      res.status(200).json({
        message: "Leave balance deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const leaveBalancesController = new LeaveBalancesController();
