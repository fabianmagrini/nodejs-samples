import { Request, Response, NextFunction } from 'express';
import { UserController } from './userController';
import { userService } from '../services/userService';
import { logger } from '../utils/logger';
import { metricsService } from '../monitoring/metrics';

jest.mock('../services/userService');
jest.mock('../utils/logger');
jest.mock('../monitoring/metrics');

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockUserService = userService as jest.Mocked<typeof userService>;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockMetricsService = metricsService as jest.Mocked<typeof metricsService>;

  beforeEach(() => {
    userController = new UserController();
    mockRequest = {
      body: {},
      params: {},
      method: 'POST',
      url: '/api/users',
      route: { path: '/api/users' },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const createdUser = { id: '123', ...userData, createdAt: new Date(), updatedAt: new Date() };
      
      mockRequest.body = userData;
      mockUserService.createUser.mockResolvedValue(createdUser);

      await userController.createUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.createUser).toHaveBeenCalledWith(userData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User created successfully',
        data: createdUser,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid email', async () => {
      const invalidData = { email: 'invalid-email', name: 'Test User' };
      mockRequest.body = invalidData;

      await userController.createUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockMetricsService.recordError).toHaveBeenCalledWith('validation_error', 'POST', '/api/users');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array),
      });
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should return validation error for missing name', async () => {
      const invalidData = { email: 'test@example.com', name: '' };
      mockRequest.body = invalidData;

      await userController.createUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array),
      });
    });

    it('should handle service errors', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const error = new Error('Database error');
      
      mockRequest.body = userData;
      mockUserService.createUser.mockRejectedValue(error);

      await userController.createUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create user', error, {
        method: 'POST',
        url: '/api/users',
      });
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserById', () => {
    it('should get user successfully', async () => {
      const userId = '123';
      const user = { id: userId, email: 'test@example.com', name: 'Test User', createdAt: new Date(), updatedAt: new Date() };
      
      mockRequest.params = { id: userId };
      mockUserService.getUserById.mockResolvedValue(user);

      await userController.getUserById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User retrieved successfully',
        data: user,
      });
    });

    it('should return 404 for non-existent user', async () => {
      const userId = 'non-existent';
      
      mockRequest.params = { id: userId };
      mockUserService.getUserById.mockResolvedValue(null);

      await userController.getUserById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 400 for missing user ID', async () => {
      mockRequest.params = {};

      await userController.getUserById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User ID is required' });
      expect(mockUserService.getUserById).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const userId = '123';
      const error = new Error('Database error');
      
      mockRequest.params = { id: userId };
      mockUserService.getUserById.mockRejectedValue(error);

      await userController.getUserById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get user', error, {
        method: 'POST',
        url: '/api/users',
        userId,
      });
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = '123';
      const updateData = { name: 'Updated Name' };
      const updatedUser = { id: userId, email: 'test@example.com', name: 'Updated Name', createdAt: new Date(), updatedAt: new Date() };
      
      mockRequest.params = { id: userId };
      mockRequest.body = updateData;
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      await userController.updateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, updateData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User updated successfully',
        data: updatedUser,
      });
    });

    it('should return 404 for non-existent user', async () => {
      const userId = 'non-existent';
      const updateData = { name: 'Updated Name' };
      
      mockRequest.params = { id: userId };
      mockRequest.body = updateData;
      mockUserService.updateUser.mockResolvedValue(null);

      await userController.updateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return validation error for invalid data', async () => {
      const userId = '123';
      const invalidData = { name: '' };
      
      mockRequest.params = { id: userId };
      mockRequest.body = invalidData;

      await userController.updateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockMetricsService.recordError).toHaveBeenCalledWith('validation_error', 'POST', '/api/users');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array),
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = '123';
      
      mockRequest.params = { id: userId };
      mockUserService.deleteUser.mockResolvedValue(true);

      await userController.deleteUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.deleteUser).toHaveBeenCalledWith(userId);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should return 404 for non-existent user', async () => {
      const userId = 'non-existent';
      
      mockRequest.params = { id: userId };
      mockUserService.deleteUser.mockResolvedValue(false);

      await userController.deleteUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 400 for missing user ID', async () => {
      mockRequest.params = {};

      await userController.deleteUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User ID is required' });
    });
  });

  describe('getAllUsers', () => {
    it('should get all users successfully', async () => {
      const users = [
        { id: '1', email: 'user1@example.com', name: 'User 1', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', email: 'user2@example.com', name: 'User 2', createdAt: new Date(), updatedAt: new Date() },
      ];
      
      mockUserService.getAllUsers.mockResolvedValue(users);

      await userController.getAllUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.getAllUsers).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Users retrieved successfully',
        data: users,
        count: users.length,
      });
    });

    it('should handle empty user list', async () => {
      mockUserService.getAllUsers.mockResolvedValue([]);

      await userController.getAllUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Users retrieved successfully',
        data: [],
        count: 0,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockUserService.getAllUsers.mockRejectedValue(error);

      await userController.getAllUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get all users', error, {
        method: 'POST',
        url: '/api/users',
      });
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});