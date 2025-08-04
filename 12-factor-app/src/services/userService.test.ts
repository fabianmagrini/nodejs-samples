import { UserService } from './userService';
import { User, CreateUserRequest, UpdateUserRequest } from '../models/user';
import { logger } from '../utils/logger';
import { tracingService } from '../monitoring/tracing';
import { resilienceService } from '../utils/resilience';
import { metricsService } from '../monitoring/metrics';

jest.mock('../utils/logger');
jest.mock('../monitoring/tracing');
jest.mock('../utils/resilience');
jest.mock('../monitoring/metrics');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('UserService', () => {
  let userService: UserService;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockTracingService = tracingService as jest.Mocked<typeof tracingService>;
  const mockResilienceService = resilienceService as jest.Mocked<typeof resilienceService>;
  const mockMetricsService = metricsService as jest.Mocked<typeof metricsService>;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();

    // Mock tracing service to just execute the callback
    mockTracingService.createSpan.mockImplementation(async (_name, callback) => {
      return callback();
    });

    // Mock resilience service to just execute the callback
    mockResilienceService.executeWithResilience.mockImplementation(async (_name, callback) => {
      return callback();
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const request: CreateUserRequest = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = await userService.createUser(request);

      expect(result).toEqual({
        id: 'mock-uuid-123',
        email: request.email,
        name: request.name,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(mockTracingService.createSpan).toHaveBeenCalledWith('UserService.createUser', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Creating new user', { email: request.email });
      expect(mockLogger.info).toHaveBeenCalledWith('User created successfully', { 
        userId: 'mock-uuid-123', 
        email: request.email 
      });
      expect(mockResilienceService.executeWithResilience).toHaveBeenCalledWith(
        'user-database-create',
        expect.any(Function),
        {
          retry: { attempts: 3, delay: 100 },
          timeout: { timeout: 5000 },
        }
      );
      expect(mockMetricsService.recordBusinessEvent).toHaveBeenCalledWith('user_created', 'success');
    });

    it('should handle resilience service errors', async () => {
      const request: CreateUserRequest = {
        email: 'test@example.com',
        name: 'Test User',
      };
      const error = new Error('Database error');

      mockResilienceService.executeWithResilience.mockRejectedValue(error);

      await expect(userService.createUser(request)).rejects.toThrow('Database error');
      expect(mockLogger.info).toHaveBeenCalledWith('Creating new user', { email: request.email });
    });
  });

  describe('getUserById', () => {
    it('should get user successfully when user exists', async () => {
      const userId = 'existing-user-id';
      const existingUser: User = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create user first
      await userService.createUser({ email: existingUser.email, name: existingUser.name });
      
      // Mock resilience service to return the user
      mockResilienceService.executeWithResilience.mockResolvedValue(existingUser);

      const result = await userService.getUserById(userId);

      expect(result).toEqual(existingUser);
      expect(mockTracingService.createSpan).toHaveBeenCalledWith('UserService.getUserById', expect.any(Function));
      expect(mockLogger.debug).toHaveBeenCalledWith('Fetching user by ID', { userId });
      expect(mockLogger.debug).toHaveBeenCalledWith('User found', { userId });
      expect(mockMetricsService.recordBusinessEvent).toHaveBeenCalledWith('user_retrieved', 'success');
    });

    it('should return null when user does not exist', async () => {
      const userId = 'non-existent-user-id';

      mockResilienceService.executeWithResilience.mockResolvedValue(null);

      const result = await userService.getUserById(userId);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('User not found', { userId });
      expect(mockMetricsService.recordBusinessEvent).toHaveBeenCalledWith('user_retrieved', 'failure');
    });

    it('should handle resilience service errors', async () => {
      const userId = 'test-user-id';
      const error = new Error('Database error');

      mockResilienceService.executeWithResilience.mockRejectedValue(error);

      await expect(userService.getUserById(userId)).rejects.toThrow('Database error');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully when user exists', async () => {
      const userId = 'existing-user-id';
      const existingUser: User = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };
      const updateRequest: UpdateUserRequest = {
        name: 'Updated Test User',
      };

      // Mock getUserById to return existing user
      jest.spyOn(userService, 'getUserById').mockResolvedValue(existingUser);

      const result = await userService.updateUser(userId, updateRequest);

      expect(result).toEqual({
        ...existingUser,
        name: updateRequest.name,
        updatedAt: expect.any(Date),
      });

      expect(mockTracingService.createSpan).toHaveBeenCalledWith('UserService.updateUser', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Updating user', { userId });
      expect(mockLogger.info).toHaveBeenCalledWith('User updated successfully', { userId });
      expect(mockMetricsService.recordBusinessEvent).toHaveBeenCalledWith('user_updated', 'success');
    });

    it('should return null when user does not exist', async () => {
      const userId = 'non-existent-user-id';
      const updateRequest: UpdateUserRequest = {
        name: 'Updated Test User',
      };

      // Mock getUserById to return null
      jest.spyOn(userService, 'getUserById').mockResolvedValue(null);

      const result = await userService.updateUser(userId, updateRequest);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('Cannot update non-existent user', { userId });
    });

    it('should handle resilience service errors', async () => {
      const userId = 'test-user-id';
      const existingUser: User = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateRequest: UpdateUserRequest = {
        name: 'Updated Test User',
      };
      const error = new Error('Database error');

      jest.spyOn(userService, 'getUserById').mockResolvedValue(existingUser);
      mockResilienceService.executeWithResilience.mockRejectedValue(error);

      await expect(userService.updateUser(userId, updateRequest)).rejects.toThrow('Database error');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully when user exists', async () => {
      const userId = 'existing-user-id';

      mockResilienceService.executeWithResilience.mockResolvedValue(true);

      const result = await userService.deleteUser(userId);

      expect(result).toBe(true);
      expect(mockTracingService.createSpan).toHaveBeenCalledWith('UserService.deleteUser', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Deleting user', { userId });
      expect(mockLogger.info).toHaveBeenCalledWith('User deleted successfully', { userId });
      expect(mockMetricsService.recordBusinessEvent).toHaveBeenCalledWith('user_deleted', 'success');
    });

    it('should return false when user does not exist', async () => {
      const userId = 'non-existent-user-id';

      mockResilienceService.executeWithResilience.mockResolvedValue(false);

      const result = await userService.deleteUser(userId);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Cannot delete non-existent user', { userId });
      expect(mockMetricsService.recordBusinessEvent).toHaveBeenCalledWith('user_deleted', 'failure');
    });

    it('should handle resilience service errors', async () => {
      const userId = 'test-user-id';
      const error = new Error('Database error');

      mockResilienceService.executeWithResilience.mockRejectedValue(error);

      await expect(userService.deleteUser(userId)).rejects.toThrow('Database error');
    });
  });

  describe('getAllUsers', () => {
    it('should get all users successfully', async () => {
      const users: User[] = [
        {
          id: '1',
          email: 'user1@example.com',
          name: 'User 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          email: 'user2@example.com',
          name: 'User 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockResilienceService.executeWithResilience.mockResolvedValue(users);

      const result = await userService.getAllUsers();

      expect(result).toEqual(users);
      expect(mockTracingService.createSpan).toHaveBeenCalledWith('UserService.getAllUsers', expect.any(Function));
      expect(mockLogger.debug).toHaveBeenCalledWith('Fetching all users');
      expect(mockLogger.debug).toHaveBeenCalledWith('Users retrieved', { count: users.length });
      expect(mockMetricsService.recordBusinessEvent).toHaveBeenCalledWith('users_listed', 'success');
    });

    it('should return empty array when no users exist', async () => {
      mockResilienceService.executeWithResilience.mockResolvedValue([]);

      const result = await userService.getAllUsers();

      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith('Users retrieved', { count: 0 });
      expect(mockMetricsService.recordBusinessEvent).toHaveBeenCalledWith('users_listed', 'success');
    });

    it('should handle resilience service errors', async () => {
      const error = new Error('Database error');

      mockResilienceService.executeWithResilience.mockRejectedValue(error);

      await expect(userService.getAllUsers()).rejects.toThrow('Database error');
    });
  });
});