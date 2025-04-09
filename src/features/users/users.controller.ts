import { ValidationError } from "@/common/middleware/error.middleware";
import { NextFunction, Request, Response } from "express";
import { usersService } from "./users.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { logger } from "@/common/utils/logger.utils";

export class UsersController {
  /**
   * Get all users
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.findAll(req.query);

      res.status(200).json({
        message: "Users retrieved successfully",
        ...result,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      const user = await usersService.findById(id);

      res.status(200).json({
        message: "User retrieved successfully",
        data: user,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new user
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userData: CreateUserDto = req.body;

      // Validate password confirmation if provided
      if (
        userData.confirmPassword &&
        userData.password !== userData.confirmPassword
      ) {
        throw new ValidationError({ password: "Passwords do not match" });
      }

      const newUser = await usersService.create(userData);

      res.status(201).json({
        message: "User created successfully",
        data: newUser,
      });
      return;
    } catch (error) {
      logger.error("Error creating user:", error);
      next(error);
    }
  }

  /**
   * Update a user
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const userData: UpdateUserDto = req.body;

      // Validate password confirmation if provided
      if (
        userData.confirmPassword &&
        userData.password !== userData.confirmPassword
      ) {
        throw new ValidationError({ password: "Passwords do not match" });
      }

      const updatedUser = await usersService.update(id, userData);

      res.status(200).json({
        message: "User updated successfully",
        data: updatedUser,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;
      const profileData = req.body;

      const updatedProfile = await usersService.updateProfile(
        userId,
        profileData
      );

      res.status(200).json({
        message: "User profile updated successfully",
        data: updatedProfile,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a user
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      await usersService.delete(id);

      res.status(200).json({
        message: "User deleted successfully",
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get new employees (hired in last 30 days)
   */
  async getNewEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const newEmployees = await usersService.getNewEmployees();

      res.status(200).json({
        message: "New employees retrieved successfully",
        data: newEmployees,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get resigned employees
   */
  async getResignedEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const resignedEmployees = await usersService.getResignedEmployees();

      res.status(200).json({
        message: "Resigned employees retrieved successfully",
        data: resignedEmployees,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
