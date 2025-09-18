import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseTestService } from './database-test.service';
import { SeedService } from '../seed/seed.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly databaseTestService: DatabaseTestService,
    private readonly seedService: SeedService,
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
