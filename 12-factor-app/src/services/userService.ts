import { v4 as uuidv4 } from 'uuid';
import { User, CreateUserRequest, UpdateUserRequest } from '../models/user';
import { logger } from '../utils/logger';
import { tracingService } from '../monitoring/tracing';
import { resilienceService } from '../utils/resilience';
import { metricsService } from '../monitoring/metrics';

export class UserService {
  private users: Map<string, User> = new Map();

  public async createUser(request: CreateUserRequest): Promise<User> {
    return tracingService.createSpan('UserService.createUser', async () => {
      logger.info('Creating new user', { email: request.email });

      const user: User = {
        id: uuidv4(),
        email: request.email,
        name: request.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simulate database operation with resilience
      await resilienceService.executeWithResilience(
        'user-database-create',
        async () => {
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10));
          this.users.set(user.id, user);
        },
        {
          retry: { attempts: 3, delay: 100 },
          timeout: { timeout: 5000 },
        }
      );

      metricsService.recordBusinessEvent('user_created', 'success');
      logger.info('User created successfully', { userId: user.id, email: user.email });

      return user;
    });
  }

  public async getUserById(id: string): Promise<User | null> {
    return tracingService.createSpan('UserService.getUserById', async () => {
      logger.debug('Fetching user by ID', { userId: id });

      const user = await resilienceService.executeWithResilience(
        'user-database-read',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          return this.users.get(id) || null;
        },
        {
          retry: { attempts: 2, delay: 50 },
          timeout: { timeout: 3000 },
        }
      );

      if (user) {
        logger.debug('User found', { userId: id });
        metricsService.recordBusinessEvent('user_retrieved', 'success');
      } else {
        logger.warn('User not found', { userId: id });
        metricsService.recordBusinessEvent('user_retrieved', 'failure');
      }

      return user;
    });
  }

  public async updateUser(id: string, request: UpdateUserRequest): Promise<User | null> {
    return tracingService.createSpan('UserService.updateUser', async () => {
      logger.info('Updating user', { userId: id });

      const existingUser = await this.getUserById(id);
      if (!existingUser) {
        logger.warn('Cannot update non-existent user', { userId: id });
        return null;
      }

      const updatedUser: User = {
        ...existingUser,
        ...request,
        updatedAt: new Date(),
      };

      await resilienceService.executeWithResilience(
        'user-database-update',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 8));
          this.users.set(id, updatedUser);
        },
        {
          retry: { attempts: 3, delay: 100 },
          timeout: { timeout: 5000 },
        }
      );

      metricsService.recordBusinessEvent('user_updated', 'success');
      logger.info('User updated successfully', { userId: id });

      return updatedUser;
    });
  }

  public async deleteUser(id: string): Promise<boolean> {
    return tracingService.createSpan('UserService.deleteUser', async () => {
      logger.info('Deleting user', { userId: id });

      const existed = await resilienceService.executeWithResilience(
        'user-database-delete',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          return this.users.delete(id);
        },
        {
          retry: { attempts: 3, delay: 100 },
          timeout: { timeout: 5000 },
        }
      );

      if (existed) {
        metricsService.recordBusinessEvent('user_deleted', 'success');
        logger.info('User deleted successfully', { userId: id });
      } else {
        metricsService.recordBusinessEvent('user_deleted', 'failure');
        logger.warn('Cannot delete non-existent user', { userId: id });
      }

      return existed;
    });
  }

  public async getAllUsers(): Promise<User[]> {
    return tracingService.createSpan('UserService.getAllUsers', async () => {
      logger.debug('Fetching all users');

      const users = await resilienceService.executeWithResilience(
        'user-database-list',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 15));
          return Array.from(this.users.values());
        },
        {
          retry: { attempts: 2, delay: 50 },
          timeout: { timeout: 10000 },
        }
      );

      logger.debug('Users retrieved', { count: users.length });
      metricsService.recordBusinessEvent('users_listed', 'success');

      return users;
    });
  }
}

export const userService = new UserService();