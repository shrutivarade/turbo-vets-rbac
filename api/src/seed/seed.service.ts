import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { Task, TaskStatus, TaskCategory } from '../entities/task.entity';
import { PasswordUtils } from '../auth/password.utils';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  /**
   * Main seeding method - orchestrates all seeding operations
   */
  async seedDatabase(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding...');
      
      // Seed organizations first
      const organizations = await this.seedOrganizations();
      console.log(`✅ Seeded ${organizations.length} organizations`);
      
      // Seed users for each organization
      const users = await this.seedUsers(organizations);
      console.log(`✅ Seeded ${users.length} users`);
      
      // Seed tasks for the users
      const tasks = await this.seedTasks(users, organizations);
      console.log(`✅ Seeded ${tasks.length} tasks`);
      
      console.log('🎉 Database seeding completed successfully!');
      
      // Provide summary
      await this.printSeedingSummary();
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Seed organizations - creates test companies
   */
  private async seedOrganizations(): Promise<Organization[]> {
    const organizationData = [
      { name: 'TechCorp Industries' },
      { name: 'StartupXYZ' },
    ];

    const organizations: Organization[] = [];

    for (const orgData of organizationData) {
      let organization = await this.organizationRepository.findOne({
        where: { name: orgData.name }
      });

      if (!organization) {
        organization = this.organizationRepository.create(orgData);
        organization = await this.organizationRepository.save(organization);
        console.log(`  📊 Created organization: ${organization.name} (ID: ${organization.id})`);
      } else {
        console.log(`  📊 Organization exists: ${organization.name} (ID: ${organization.id})`);
      }

      organizations.push(organization);
    }

    return organizations;
  }

  /**
   * Seed users with different roles for each organization
   */
  private async seedUsers(organizations: Organization[]): Promise<User[]> {
    const users: User[] = [];

    for (const org of organizations) {
      const orgPrefix = org.name === 'TechCorp Industries' ? 'techcorp' : 'startup';
      
      const userData = [
        {
          email: `owner@${orgPrefix}.com`,
          password: 'owner123',
          role: Role.OWNER,
          organizationId: org.id,
        },
        {
          email: `admin@${orgPrefix}.com`,
          password: 'admin123',
          role: Role.ADMIN,
          organizationId: org.id,
        },
        {
          email: `viewer@${orgPrefix}.com`,
          password: 'viewer123',
          role: Role.VIEWER,
          organizationId: org.id,
        },
      ];

      for (const userInfo of userData) {
        let user = await this.userRepository.findOne({
          where: { email: userInfo.email }
        });

        if (!user) {
          // Hash the password
          const passwordHash = await PasswordUtils.hash(userInfo.password);
          
          user = this.userRepository.create({
            email: userInfo.email,
            passwordHash,
            role: userInfo.role,
            organizationId: userInfo.organizationId,
          });
          
          user = await this.userRepository.save(user);
          console.log(`  👤 Created user: ${user.email} (${user.role}) in ${org.name}`);
        } else {
          console.log(`  👤 User exists: ${user.email} (${user.role}) in ${org.name}`);
        }

        users.push(user);
      }
    }

    return users;
  }

  /**
   * Seed tasks for users to demonstrate RBAC
   */
  private async seedTasks(users: User[], organizations: Organization[]): Promise<Task[]> {
    const tasks: Task[] = [];

    // Task templates for variety
    const taskTemplates = [
      {
        title: 'Setup Development Environment',
        description: 'Configure local development setup with all necessary tools and dependencies.',
        status: TaskStatus.DOING,
        category: TaskCategory.WORK,
      },
      {
        title: 'Review Security Protocols',
        description: 'Conduct quarterly review of security protocols and update documentation.',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
      },
      {
        title: 'Plan Team Building Event',
        description: 'Organize team building activities for the next quarter.',
        status: TaskStatus.DONE,
        category: TaskCategory.WORK,
      },
      {
        title: 'Personal Goal Setting',
        description: 'Define personal development goals for the year.',
        status: TaskStatus.TODO,
        category: TaskCategory.PERSONAL,
      },
      {
        title: 'Complete Online Course',
        description: 'Finish the advanced TypeScript course on learning platform.',
        status: TaskStatus.DOING,
        category: TaskCategory.PERSONAL,
      },
      {
        title: 'Update Resume',
        description: 'Update professional resume with recent projects and achievements.',
        status: TaskStatus.DONE,
        category: TaskCategory.PERSONAL,
      },
    ];

    let taskIndex = 0;

    for (const user of users) {
      // Create 2 tasks per user
      for (let i = 0; i < 2; i++) {
        const template = taskTemplates[taskIndex % taskTemplates.length];
        
        // Check if task already exists (by title and user)
        const existingTask = await this.taskRepository.findOne({
          where: {
            title: `${template.title} - ${user.role}`,
            createdByUserId: user.id,
          }
        });

        if (!existingTask) {
          const task = this.taskRepository.create({
            title: `${template.title} - ${user.role}`,
            description: template.description,
            status: template.status,
            category: template.category,
            createdByUserId: user.id,
            organizationId: user.organizationId,
          });

          const savedTask = await this.taskRepository.save(task);
          console.log(`  📝 Created task: "${savedTask.title}" for ${user.email}`);
          tasks.push(savedTask);
        } else {
          console.log(`  📝 Task exists: "${existingTask.title}" for ${user.email}`);
          tasks.push(existingTask);
        }

        taskIndex++;
      }
    }

    return tasks;
  }

  /**
   * Print a summary of seeded data for verification
   */
  private async printSeedingSummary(): Promise<void> {
    console.log('\n📊 SEEDING SUMMARY');
    console.log('==================');

    // Count organizations
    const orgCount = await this.organizationRepository.count();
    console.log(`Organizations: ${orgCount}`);

    // Count users by role
    for (const role of Object.values(Role)) {
      const count = await this.userRepository.count({ where: { role } });
      console.log(`${role} users: ${count}`);
    }

    // Count tasks by status
    for (const status of Object.values(TaskStatus)) {
      const count = await this.taskRepository.count({ where: { status } });
      console.log(`${status} tasks: ${count}`);
    }

    // Count tasks by category
    for (const category of Object.values(TaskCategory)) {
      const count = await this.taskRepository.count({ where: { category } });
      console.log(`${category} tasks: ${count}`);
    }

    console.log('\n🔑 TEST ACCOUNTS');
    console.log('================');
    console.log('TechCorp Industries:');
    console.log('  owner@techcorp.com / owner123 (Owner)');
    console.log('  admin@techcorp.com / admin123 (Admin)');
    console.log('  viewer@techcorp.com / viewer123 (Viewer)');
    console.log('\nStartupXYZ:');
    console.log('  owner@startup.com / owner123 (Owner)');
    console.log('  admin@startup.com / admin123 (Admin)');
    console.log('  viewer@startup.com / viewer123 (Viewer)');
    console.log('');
  }

  /**
   * Clear all seeded data (for testing purposes)
   */
  async clearDatabase(): Promise<void> {
    console.log('🧹 Clearing seeded data...');
    
    await this.taskRepository.delete({});
    await this.userRepository.delete({});
    await this.organizationRepository.delete({});
    
    console.log('✅ Database cleared');
  }
}
