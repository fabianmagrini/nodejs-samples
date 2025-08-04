import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { userService } from '../services/userService';
import { logger } from '../utils/logger';
import { metricsService } from '../monitoring/metrics';

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(1).max(100).required(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
});

export class UserController {
  public async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = createUserSchema.validate(req.body);
      if (error) {
        metricsService.recordError('validation_error', req.method, req.route?.path);
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message),
        });
        return;
      }

      const user = await userService.createUser(value);
      
      res.status(201).json({
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      logger.error('Failed to create user', error as Error, {
        method: req.method,
        url: req.url,
      });
      next(error);
    }
  }

  public async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const user = await userService.getUserById(id);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        message: 'User retrieved successfully',
        data: user,
      });
    } catch (error) {
      logger.error('Failed to get user', error as Error, {
        method: req.method,
        url: req.url,
        userId: req.params.id,
      });
      next(error);
    }
  }

  public async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const { error, value } = updateUserSchema.validate(req.body);
      if (error) {
        metricsService.recordError('validation_error', req.method, req.route?.path);
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message),
        });
        return;
      }

      const user = await userService.updateUser(id, value);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      logger.error('Failed to update user', error as Error, {
        method: req.method,
        url: req.url,
        userId: req.params.id,
      });
      next(error);
    }
  }

  public async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const deleted = await userService.deleteUser(id);
      
      if (!deleted) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete user', error as Error, {
        method: req.method,
        url: req.url,
        userId: req.params.id,
      });
      next(error);
    }
  }

  public async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.getAllUsers();
      
      res.json({
        message: 'Users retrieved successfully',
        data: users,
        count: users.length,
      });
    } catch (error) {
      logger.error('Failed to get all users', error as Error, {
        method: req.method,
        url: req.url,
      });
      next(error);
    }
  }
}

export const userController = new UserController();