import { NextFunction, Request, Response } from "express";
import { positionsService } from "./positions.service";
import { CreatePositionDto, UpdatePositionDto } from "./dto/position.dto";
import { logger } from "@/common/utils/logger.utils";

export class PositionsController {
  /**
   * Get all positions
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await positionsService.findAll(req.query);

      res.status(200).json({
        message: "Positions retrieved successfully",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get position by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const position = await positionsService.findById(id);

      res.status(200).json({
        message: "Position retrieved successfully",
        data: position,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new position
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const positionData: CreatePositionDto = req.body;

      const newPosition = await positionsService.create(positionData);

      res.status(201).json({
        message: "Position created successfully",
        data: newPosition,
      });
      return;
    } catch (error) {
      logger.error("Error creating position:", error);
      next(error);
    }
  }

  /**
   * Update a position
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const positionData: UpdatePositionDto = req.body;

      const updatedPosition = await positionsService.update(id, positionData);

      res.status(200).json({
        message: "Position updated successfully",
        data: updatedPosition,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a position
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      await positionsService.delete(id);

      res.status(200).json({
        message: "Position deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users by position
   */
  async findUsersByPosition(req: Request, res: Response, next: NextFunction) {
    try {
      const positionId = req.params.id;

      const users = await positionsService.findUsersByPosition(
        positionId,
        req.query
      );

      res.status(200).json({
        message: "Position users retrieved successfully",
        ...users,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const positionsController = new PositionsController();
