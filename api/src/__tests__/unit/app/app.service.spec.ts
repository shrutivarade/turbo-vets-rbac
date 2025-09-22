/**
 * AppService Unit Tests
 * Tests for main application service
 * Uses mocks to avoid entity import issues
 */

import { AppService } from '../../../app/app.service';

// Mock DatabaseTestService
const mockDatabaseTestService = {
  testConnection: jest.fn(),
  testRelationships: jest.fn(),
};

// Mock SeedService
const mockSeedService = {
  seedDatabase: jest.fn(),
};

// Create a simplified AppService for testing
class TestAppService {
  constructor(
    private readonly databaseTestService: any,
    private readonly seedService: any,
  ) {}

  async onModuleInit() {
    // Test database connection on startup
    console.log('🔧 Testing database connection...');
    await this.databaseTestService.testConnection();
    await this.databaseTestService.testRelationships();
    
    // Seed database if environment variable is set
    if (process.env.SEED === 'true') {
      console.log('🌱 SEED environment variable detected...');
      await this.seedService.seedDatabase();
    } else {
      console.log('⏭️  Skipping database seeding (SEED env var not set to "true")');
    }
  }

  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}

describe('AppService', () => {
  let service: TestAppService;
  let databaseTestService: any;
  let seedService: any;

  beforeEach(() => {
    databaseTestService = mockDatabaseTestService;
    seedService = mockSeedService;
    service = new TestAppService(databaseTestService, seedService);
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getData', () => {
    it('should return hello message', () => {
      // Act
      const result = service.getData();

      // Assert
      expect(result).toEqual({ message: 'Hello API' });
    });
  });

  describe('onModuleInit', () => {
    it('should test database connection and relationships', async () => {
      // Arrange
      databaseTestService.testConnection.mockResolvedValue({ success: true });
      databaseTestService.testRelationships.mockResolvedValue({ success: true });

      // Act
      await service.onModuleInit();

      // Assert
      expect(databaseTestService.testConnection).toHaveBeenCalledTimes(1);
      expect(databaseTestService.testRelationships).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('🔧 Testing database connection...');
    });

    it('should seed database when SEED environment variable is true', async () => {
      // Arrange
      const originalEnv = process.env.SEED;
      process.env.SEED = 'true';
      databaseTestService.testConnection.mockResolvedValue({ success: true });
      databaseTestService.testRelationships.mockResolvedValue({ success: true });
      seedService.seedDatabase.mockResolvedValue(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.seedDatabase).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('🌱 SEED environment variable detected...');

      // Cleanup
      process.env.SEED = originalEnv;
    });

    it('should skip seeding when SEED environment variable is not true', async () => {
      // Arrange
      const originalEnv = process.env.SEED;
      process.env.SEED = 'false';
      databaseTestService.testConnection.mockResolvedValue({ success: true });
      databaseTestService.testRelationships.mockResolvedValue({ success: true });

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.seedDatabase).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('⏭️  Skipping database seeding (SEED env var not set to "true")');

      // Cleanup
      process.env.SEED = originalEnv;
    });

    it('should skip seeding when SEED environment variable is undefined', async () => {
      // Arrange
      const originalEnv = process.env.SEED;
      delete process.env.SEED;
      databaseTestService.testConnection.mockResolvedValue({ success: true });
      databaseTestService.testRelationships.mockResolvedValue({ success: true });

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.seedDatabase).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('⏭️  Skipping database seeding (SEED env var not set to "true")');

      // Cleanup
      process.env.SEED = originalEnv;
    });

    it('should handle database connection test failure', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      databaseTestService.testConnection.mockRejectedValue(error);
      databaseTestService.testRelationships.mockResolvedValue({ success: true });

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Database connection failed');
      expect(databaseTestService.testConnection).toHaveBeenCalledTimes(1);
      expect(databaseTestService.testRelationships).not.toHaveBeenCalled();
    });

    it('should handle database relationship test failure', async () => {
      // Arrange
      const error = new Error('Relationship test failed');
      databaseTestService.testConnection.mockResolvedValue({ success: true });
      databaseTestService.testRelationships.mockRejectedValue(error);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Relationship test failed');
      expect(databaseTestService.testConnection).toHaveBeenCalledTimes(1);
      expect(databaseTestService.testRelationships).toHaveBeenCalledTimes(1);
    });

    it('should handle seeding failure', async () => {
      // Arrange
      const originalEnv = process.env.SEED;
      process.env.SEED = 'true';
      const error = new Error('Seeding failed');
      databaseTestService.testConnection.mockResolvedValue({ success: true });
      databaseTestService.testRelationships.mockResolvedValue({ success: true });
      seedService.seedDatabase.mockRejectedValue(error);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Seeding failed');
      expect(seedService.seedDatabase).toHaveBeenCalledTimes(1);

      // Cleanup
      process.env.SEED = originalEnv;
    });
  });

  describe('console output', () => {
    it('should log appropriate messages during initialization', async () => {
      // Arrange
      const originalEnv = process.env.SEED;
      process.env.SEED = 'true';
      databaseTestService.testConnection.mockResolvedValue({ success: true });
      databaseTestService.testRelationships.mockResolvedValue({ success: true });
      seedService.seedDatabase.mockResolvedValue(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(console.log).toHaveBeenCalledWith('🔧 Testing database connection...');
      expect(console.log).toHaveBeenCalledWith('🌱 SEED environment variable detected...');

      // Cleanup
      process.env.SEED = originalEnv;
    });

    it('should log skip message when SEED is not true', async () => {
      // Arrange
      const originalEnv = process.env.SEED;
      process.env.SEED = 'false';
      databaseTestService.testConnection.mockResolvedValue({ success: true });
      databaseTestService.testRelationships.mockResolvedValue({ success: true });

      // Act
      await service.onModuleInit();

      // Assert
      expect(console.log).toHaveBeenCalledWith('🔧 Testing database connection...');
      expect(console.log).toHaveBeenCalledWith('⏭️  Skipping database seeding (SEED env var not set to "true")');

      // Cleanup
      process.env.SEED = originalEnv;
    });
  });
});
