import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { Task } from '../entities/task.entity';

@Injectable()
export class DatabaseTestService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
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
