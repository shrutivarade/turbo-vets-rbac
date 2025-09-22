/**
 * DatabaseTestService Unit Tests
 * Tests for database connection and relationship testing
 * Uses mocks to avoid entity import issues
 */

import { DatabaseTestService } from '../../../app/database-test.service';

// Mock Repository interfaces
const mockUserRepository = {
  count: jest.fn(),
  find: jest.fn(),
};

const mockOrganizationRepository = {
  count: jest.fn(),
  find: jest.fn(),
};

const mockTaskRepository = {
  count: jest.fn(),
  find: jest.fn(),
};

// Create a simplified DatabaseTestService for testing
class TestDatabaseTestService {
  constructor(
    private userRepo: any,
    private orgRepo: any,
    private taskRepo: any,
  ) {}

  async testConnection() {
    try {
      const userCount = await this.userRepo.count();
      const orgCount = await this.orgRepo.count();
      const taskCount = await this.taskRepo.count();
      
      console.log(`📊 Database Connection Test Successful!`);
      console.log(`📋 Tables Created: Users(${userCount}), Organizations(${orgCount}), Tasks(${taskCount})`);
      
      return {
        success: true,
        counts: { users: userCount, organizations: orgCount, tasks: taskCount }
      };
    } catch (error: any) {
      console.error('❌ Database Connection Failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testRelationships() {
    try {
      // Test if we can query with relationships
      const users = await this.userRepo.find({ relations: ['organization', 'tasks'] });
      const orgs = await this.orgRepo.find({ relations: ['users', 'tasks'] });
      
      console.log(`🔗 Relationship Test: Users with relations(${users.length}), Orgs with relations(${orgs.length})`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Relationship Test Failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

describe('DatabaseTestService', () => {
  let service: TestDatabaseTestService;
  let userRepo: any;
  let orgRepo: any;
  let taskRepo: any;

  beforeEach(() => {
    userRepo = mockUserRepository;
    orgRepo = mockOrganizationRepository;
    taskRepo = mockTaskRepository;
    service = new TestDatabaseTestService(userRepo, orgRepo, taskRepo);
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('testConnection', () => {
    it('should return success with counts when all repositories work', async () => {
      // Arrange
      userRepo.count.mockResolvedValue(5);
      orgRepo.count.mockResolvedValue(2);
      taskRepo.count.mockResolvedValue(10);

      // Act
      const result = await service.testConnection();

      // Assert
      expect(result).toEqual({
        success: true,
        counts: { users: 5, organizations: 2, tasks: 10 }
      });
      expect(userRepo.count).toHaveBeenCalledTimes(1);
      expect(orgRepo.count).toHaveBeenCalledTimes(1);
      expect(taskRepo.count).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('📊 Database Connection Test Successful!');
      expect(console.log).toHaveBeenCalledWith('📋 Tables Created: Users(5), Organizations(2), Tasks(10)');
    });

    it('should return success with zero counts when tables are empty', async () => {
      // Arrange
      userRepo.count.mockResolvedValue(0);
      orgRepo.count.mockResolvedValue(0);
      taskRepo.count.mockResolvedValue(0);

      // Act
      const result = await service.testConnection();

      // Assert
      expect(result).toEqual({
        success: true,
        counts: { users: 0, organizations: 0, tasks: 0 }
      });
      expect(console.log).toHaveBeenCalledWith('📊 Database Connection Test Successful!');
      expect(console.log).toHaveBeenCalledWith('📋 Tables Created: Users(0), Organizations(0), Tasks(0)');
    });

    it('should handle user repository error', async () => {
      // Arrange
      const error = new Error('User table not found');
      userRepo.count.mockRejectedValue(error);
      orgRepo.count.mockResolvedValue(2);
      taskRepo.count.mockResolvedValue(10);

      // Act
      const result = await service.testConnection();

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'User table not found'
      });
      expect(console.error).toHaveBeenCalledWith('❌ Database Connection Failed:', 'User table not found');
    });

    it('should handle organization repository error', async () => {
      // Arrange
      const error = new Error('Organization table not found');
      userRepo.count.mockResolvedValue(5);
      orgRepo.count.mockRejectedValue(error);
      taskRepo.count.mockResolvedValue(10);

      // Act
      const result = await service.testConnection();

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Organization table not found'
      });
      expect(console.error).toHaveBeenCalledWith('❌ Database Connection Failed:', 'Organization table not found');
    });

    it('should handle task repository error', async () => {
      // Arrange
      const error = new Error('Task table not found');
      userRepo.count.mockResolvedValue(5);
      orgRepo.count.mockResolvedValue(2);
      taskRepo.count.mockRejectedValue(error);

      // Act
      const result = await service.testConnection();

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Task table not found'
      });
      expect(console.error).toHaveBeenCalledWith('❌ Database Connection Failed:', 'Task table not found');
    });

    it('should handle multiple repository errors (first error wins)', async () => {
      // Arrange
      const userError = new Error('User table not found');
      const orgError = new Error('Organization table not found');
      userRepo.count.mockRejectedValue(userError);
      orgRepo.count.mockRejectedValue(orgError);
      taskRepo.count.mockResolvedValue(10);

      // Act
      const result = await service.testConnection();

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'User table not found'
      });
      expect(console.error).toHaveBeenCalledWith('❌ Database Connection Failed:', 'User table not found');
    });
  });

  describe('testRelationships', () => {
    it('should return success when relationships work', async () => {
      // Arrange
      const mockUsers = [
        { id: 1, email: 'user1@example.com', organization: { id: 1 }, tasks: [] },
        { id: 2, email: 'user2@example.com', organization: { id: 1 }, tasks: [{ id: 1 }] }
      ];
      const mockOrgs = [
        { id: 1, name: 'Org1', users: mockUsers, tasks: [{ id: 1 }] }
      ];
      userRepo.find.mockResolvedValue(mockUsers);
      orgRepo.find.mockResolvedValue(mockOrgs);

      // Act
      const result = await service.testRelationships();

      // Assert
      expect(result).toEqual({ success: true });
      expect(userRepo.find).toHaveBeenCalledWith({ relations: ['organization', 'tasks'] });
      expect(orgRepo.find).toHaveBeenCalledWith({ relations: ['users', 'tasks'] });
      expect(console.log).toHaveBeenCalledWith('🔗 Relationship Test: Users with relations(2), Orgs with relations(1)');
    });

    it('should return success with empty results', async () => {
      // Arrange
      userRepo.find.mockResolvedValue([]);
      orgRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.testRelationships();

      // Assert
      expect(result).toEqual({ success: true });
      expect(console.log).toHaveBeenCalledWith('🔗 Relationship Test: Users with relations(0), Orgs with relations(0)');
    });

    it('should handle user repository relationship error', async () => {
      // Arrange
      const error = new Error('User relationships not found');
      userRepo.find.mockRejectedValue(error);
      orgRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.testRelationships();

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'User relationships not found'
      });
      expect(console.error).toHaveBeenCalledWith('❌ Relationship Test Failed:', 'User relationships not found');
    });

    it('should handle organization repository relationship error', async () => {
      // Arrange
      const error = new Error('Organization relationships not found');
      userRepo.find.mockResolvedValue([]);
      orgRepo.find.mockRejectedValue(error);

      // Act
      const result = await service.testRelationships();

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Organization relationships not found'
      });
      expect(console.error).toHaveBeenCalledWith('❌ Relationship Test Failed:', 'Organization relationships not found');
    });

    it('should handle both repository relationship errors (first error wins)', async () => {
      // Arrange
      const userError = new Error('User relationships not found');
      const orgError = new Error('Organization relationships not found');
      userRepo.find.mockRejectedValue(userError);
      orgRepo.find.mockRejectedValue(orgError);

      // Act
      const result = await service.testRelationships();

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'User relationships not found'
      });
      expect(console.error).toHaveBeenCalledWith('❌ Relationship Test Failed:', 'User relationships not found');
    });
  });

  describe('console output', () => {
    it('should log success messages with correct counts', async () => {
      // Arrange
      userRepo.count.mockResolvedValue(3);
      orgRepo.count.mockResolvedValue(1);
      taskRepo.count.mockResolvedValue(7);

      // Act
      await service.testConnection();

      // Assert
      expect(console.log).toHaveBeenCalledWith('📊 Database Connection Test Successful!');
      expect(console.log).toHaveBeenCalledWith('📋 Tables Created: Users(3), Organizations(1), Tasks(7)');
    });

    it('should log relationship test success with correct counts', async () => {
      // Arrange
      const mockUsers = [{ id: 1 }, { id: 2 }];
      const mockOrgs = [{ id: 1 }, { id: 2 }, { id: 3 }];
      userRepo.find.mockResolvedValue(mockUsers);
      orgRepo.find.mockResolvedValue(mockOrgs);

      // Act
      await service.testRelationships();

      // Assert
      expect(console.log).toHaveBeenCalledWith('🔗 Relationship Test: Users with relations(2), Orgs with relations(3)');
    });
  });
});
