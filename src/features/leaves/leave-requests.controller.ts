import { NextFunction, Request, Response } from "express";
import { leaveRequestsService } from "./leave-requests.service";
import {
  CreateLeaveRequestDto,
  ProcessLeaveRequestDto,
  UpdateLeaveRequestDto,
} from "./dto/leave.dto";
import { logger } from "@/common/utils/logger.utils";

export class LeaveRequestsController {
  /**
   * Get all leave requests
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leaveRequestsService.findAll(req.query);

      res.status(200).json({
        message: "Leave requests retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave request by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const leaveRequest = await leaveRequestsService.findById(id);

      res.status(200).json({
        message: "Leave request retrieved successfully",
        data: leaveRequest,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new leave request
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const leaveRequestData: CreateLeaveRequestDto = req.body;

      // If no userId provided, use current user
      if (!leaveRequestData.userId && req.user) {
        leaveRequestData.userId = req.user.userId;
      }

      const newLeaveRequest = await leaveRequestsService.create(
        leaveRequestData
      );

      res.status(201).json({
        message: "Leave request created successfully",
        data: newLeaveRequest,
      });
      return;
    } catch (error) {
      logger.error("Error creating leave request:", error);
      next(error);
    }
  }

  /**
   * Update a leave request
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const leaveRequestData: UpdateLeaveRequestDto = req.body;

      const updatedLeaveRequest = await leaveRequestsService.update(
        id,
        leaveRequestData
      );

      res.status(200).json({
        message: "Leave request updated successfully",
        data: updatedLeaveRequest,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process (approve/reject) a leave request
   */
  async processRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const processData: ProcessLeaveRequestDto = req.body;

      // Set approver to current user if not provided
      if (!processData.approvedBy && req.user) {
        processData.approvedBy = req.user.userId;
      }

      const processedRequest = await leaveRequestsService.processRequest(
        id,
        processData
      );

      const action =
        processData.status === "APPROVED" ? "approved" : "rejected";

      res.status(200).json({
        message: `Leave request ${action} successfully`,
        data: processedRequest,
      });
      return;
    } catch (error) {
      logger.error("Error processing leave request:", error);
      next(error);
    }
  }

  /**
   * Cancel a leave request
   */
  async cancelRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const cancelledRequest = await leaveRequestsService.cancelRequest(
        id,
        req.user.userId
      );

      res.status(200).json({
        message: "Leave request cancelled successfully",
        data: cancelledRequest,
      });
      return;
    } catch (error) {
      logger.error("Error cancelling leave request:", error);
      next(error);
    }
  }

  /**
   * Delete a leave request
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      await leaveRequestsService.delete(id);

      res.status(200).json({
        message: "Leave request deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const leaveRequestsController = new LeaveRequestsController();
