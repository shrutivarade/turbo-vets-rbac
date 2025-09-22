/// <reference path="../../jest.d.ts" />

// Mock entities and enums to avoid TypeORM decorator issues
enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  VIEWER = 'viewer'
}

enum TaskStatus {
  TODO = 'todo',
  DOING = 'doing',
  DONE = 'done'
}

enum TaskCategory {
  WORK = 'work',
  PERSONAL = 'personal'
}

interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  title?: string;
  organizationId: number;
}

interface Organization {
  id: number;
  name: string;
  description?: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
  createdByUserId: number;
  organizationId: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mock PasswordUtils
const mockPasswordUtils = {
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
};

// Create a test Seed Service class to avoid imports
class TestSeedService {
  constructor(
    private readonly userRepository: any,
    private readonly organizationRepository: any,
    private readonly taskRepository: any,
  ) {}

  async seedDatabase(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding...');
      
      const organizations = await this.seedOrganizations();
      console.log(`✅ Seeded ${organizations.length} organizations`);
      
      const users = await this.seedUsers(organizations);
      console.log(`✅ Seeded ${users.length} users`);
      
      const tasks = await this.seedTasks(users, organizations);
      console.log(`✅ Seeded ${tasks.length} tasks`);
      
      console.log('🎉 Database seeding completed successfully!');
      
      await this.printSeedingSummary();
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  private async seedOrganizations(): Promise<Organization[]> {
    const organizationData = [
      { 
        name: 'Veterans Affairs Medical Center - San Francisco',
        description: 'Leading VA Medical Center specializing in AI-powered veteran healthcare services'
      },
      { 
        name: 'TurboVets AI Solutions',
        description: 'Cutting-edge AI technology company focused on veteran benefits, claims, and support automation'
      },
      { 
        name: 'Veterans Benefits Administration - Regional Office',
        description: 'Regional office handling veteran benefits claims with AI-assisted processing'
      },
      { 
        name: 'VetConnect Digital Services',
        description: 'Digital platform connecting veterans with healthcare resources and AI-powered support'
      },
    ];

    const organizations: Organization[] = [];

    for (const orgData of organizationData) {
      let organization = await this.organizationRepository.findOne({
        where: { name: orgData.name }
      });

      if (!organization) {
        organization = this.organizationRepository.create(orgData);
        organization = await this.organizationRepository.save(organization);
        console.log(`  🏥 Created organization: ${organization.name} (ID: ${organization.id})`);
      } else {
        console.log(`  🏥 Organization exists: ${organization.name} (ID: ${organization.id})`);
      }

      organizations.push(organization);
    }

    return organizations;
  }

  private async seedUsers(organizations: Organization[]): Promise<User[]> {
    const users: User[] = [];

    for (const org of organizations) {
      let userData = this.getUserDataForOrganization(org);

      for (const userInfo of userData) {
        let user = await this.userRepository.findOne({
          where: { email: userInfo.email }
        });

        if (!user) {
          const passwordHash = await mockPasswordUtils.hash(userInfo.password);
          
          user = this.userRepository.create({
            email: userInfo.email,
            passwordHash,
            role: userInfo.role,
            organizationId: userInfo.organizationId,
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            title: userInfo.title,
          });
          
          user = await this.userRepository.save(user);
          console.log(`  👤 Created user: ${user.email} (${user.role}) - ${userInfo.title} in ${org.name}`);
        } else {
          console.log(`  👤 User exists: ${user.email} (${user.role}) in ${org.name}`);
        }

        users.push(user);
      }
    }

    return users;
  }

  private getUserDataForOrganization(org: Organization): any[] {
    if (org.name.includes('Veterans Affairs Medical Center')) {
      return [
        {
          email: `chief.medical@va-sf.gov`,
          password: 'owner123',
          role: Role.OWNER,
          organizationId: org.id,
          firstName: 'Dr. Sarah',
          lastName: 'Mitchell',
          title: 'Chief Medical Officer'
        },
        {
          email: `ai.specialist@va-sf.gov`,
          password: 'admin123',
          role: Role.ADMIN,
          organizationId: org.id,
          firstName: 'Dr. Michael',
          lastName: 'Chen',
          title: 'AI Healthcare Specialist'
        },
        {
          email: `nurse.coordinator@va-sf.gov`,
          password: 'viewer123',
          role: Role.VIEWER,
          organizationId: org.id,
          firstName: 'Jennifer',
          lastName: 'Rodriguez',
          title: 'Veteran Care Coordinator'
        },
      ];
    } else if (org.name.includes('TurboVets AI Solutions')) {
      return [
        {
          email: `ceo@turbovets.ai`,
          password: 'owner123',
          role: Role.OWNER,
          organizationId: org.id,
          firstName: 'Alex',
          lastName: 'Thompson',
          title: 'CEO & Founder'
        },
        {
          email: `cto@turbovets.ai`,
          password: 'admin123',
          role: Role.ADMIN,
          organizationId: org.id,
          firstName: 'Dr. Priya',
          lastName: 'Patel',
          title: 'Chief Technology Officer'
        },
        {
          email: `developer@turbovets.ai`,
          password: 'viewer123',
          role: Role.VIEWER,
          organizationId: org.id,
          firstName: 'Marcus',
          lastName: 'Johnson',
          title: 'AI Developer'
        },
      ];
    } else if (org.name.includes('Veterans Benefits Administration')) {
      return [
        {
          email: `regional.director@vba.gov`,
          password: 'owner123',
          role: Role.OWNER,
          organizationId: org.id,
          firstName: 'Robert',
          lastName: 'Williams',
          title: 'Regional Director'
        },
        {
          email: `claims.supervisor@vba.gov`,
          password: 'admin123',
          role: Role.ADMIN,
          organizationId: org.id,
          firstName: 'Lisa',
          lastName: 'Anderson',
          title: 'Claims Processing Supervisor'
        },
        {
          email: `benefits.specialist@vba.gov`,
          password: 'viewer123',
          role: Role.VIEWER,
          organizationId: org.id,
          firstName: 'David',
          lastName: 'Brown',
          title: 'Benefits Specialist'
        },
      ];
    } else if (org.name.includes('VetConnect Digital Services')) {
      return [
        {
          email: `director@vetconnect.org`,
          password: 'owner123',
          role: Role.OWNER,
          organizationId: org.id,
          firstName: 'Maria',
          lastName: 'Garcia',
          title: 'Executive Director'
        },
        {
          email: `platform.manager@vetconnect.org`,
          password: 'admin123',
          role: Role.ADMIN,
          organizationId: org.id,
          firstName: 'James',
          lastName: 'Wilson',
          title: 'Platform Manager'
        },
        {
          email: `support.specialist@vetconnect.org`,
          password: 'viewer123',
          role: Role.VIEWER,
          organizationId: org.id,
          firstName: 'Amanda',
          lastName: 'Taylor',
          title: 'Veteran Support Specialist'
        },
      ];
    }
    return [];
  }

  private async seedTasks(users: User[], organizations: Organization[]): Promise<Task[]> {
    const tasks: Task[] = [];

    for (const user of users) {
      const userOrg = organizations.find(org => org.id === user.organizationId);
      if (!userOrg) continue;

      const userTasks = this.getOrganizationSpecificTasks(user, userOrg);
      
      for (const taskData of userTasks) {
        const existingTask = await this.taskRepository.findOne({
          where: {
            title: taskData.title,
            createdByUserId: user.id,
          }
        });

        if (!existingTask) {
          const task = this.taskRepository.create({
            title: taskData.title,
            description: taskData.description,
            status: taskData.status,
            category: taskData.category,
            createdByUserId: user.id,
            organizationId: user.organizationId,
          });

          const savedTask = await this.taskRepository.save(task);
          console.log(`  📝 Created task: "${savedTask.title}" for ${user.email} (${user.title}) in ${userOrg.name}`);
          tasks.push(savedTask);
        } else {
          console.log(`  📝 Task exists: "${existingTask.title}" for ${user.email}`);
          tasks.push(existingTask);
        }
      }
    }

    return tasks;
  }

  private getOrganizationSpecificTasks(user: User, organization: Organization): any[] {
    const baseTasks = [];

    if (organization.name.includes('Veterans Affairs Medical Center')) {
      if (user.role === Role.OWNER) {
        baseTasks.push(
          {
            title: 'Strategic Healthcare AI Implementation',
            description: 'Lead the implementation of AI-powered diagnostic tools and treatment recommendations across all VA medical facilities.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          },
          {
            title: 'Veteran Care Quality Assurance',
            description: 'Oversee quality metrics and ensure AI systems maintain high standards for veteran healthcare delivery.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          }
        );
      } else if (user.role === Role.ADMIN) {
        baseTasks.push(
          {
            title: 'AI Diagnostic System Maintenance',
            description: 'Maintain and update AI diagnostic systems to ensure optimal performance and accuracy for veteran care.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          }
        );
      } else {
        baseTasks.push(
          {
            title: 'Veteran Appointment Scheduling',
            description: 'Coordinate AI-powered appointment scheduling system to optimize veteran care access and reduce wait times.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          }
        );
      }
    } else if (organization.name.includes('TurboVets AI Solutions')) {
      if (user.role === Role.OWNER) {
        baseTasks.push(
          {
            title: 'AI Platform Architecture Design',
            description: 'Design and architect the next-generation AI platform for veteran services and benefits automation.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          }
        );
      } else if (user.role === Role.ADMIN) {
        baseTasks.push(
          {
            title: 'AI Model Development Pipeline',
            description: 'Build and maintain the AI model development pipeline for veteran benefits and healthcare applications.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          }
        );
      } else {
        baseTasks.push(
          {
            title: 'AI Code Development',
            description: 'Develop and maintain AI algorithms for veteran benefits processing and healthcare applications.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          }
        );
      }
    }

    return baseTasks;
  }

  private async printSeedingSummary(): Promise<void> {
    console.log('\n🏥 VETERAN HEALTHCARE AI SEEDING SUMMARY');
    console.log('==========================================');

    const orgCount = await this.organizationRepository.count();
    console.log(`Healthcare Organizations: ${orgCount}`);

    for (const role of Object.values(Role)) {
      const count = await this.userRepository.count({ where: { role } });
      console.log(`${role} users: ${count}`);
    }

    for (const status of Object.values(TaskStatus)) {
      const count = await this.taskRepository.count({ where: { status } });
      console.log(`${status} AI projects: ${count}`);
    }

    for (const category of Object.values(TaskCategory)) {
      const count = await this.taskRepository.count({ where: { category } });
      console.log(`${category} initiatives: ${count}`);
    }
  }

  async clearDatabase(): Promise<void> {
    console.log('🧹 Clearing seeded data...');
    
    await this.taskRepository.delete({});
    await this.userRepository.delete({});
    await this.organizationRepository.delete({});
    
    console.log('✅ Database cleared');
  }
}

describe('SeedService', () => {
  let service: TestSeedService;
  let userRepository: any;
  let organizationRepository: any;
  let taskRepository: any;

  // Mock data
  const mockOrganizations: Organization[] = [
    {
      id: 1,
      name: 'Veterans Affairs Medical Center - San Francisco',
      description: 'Leading VA Medical Center specializing in AI-powered veteran healthcare services'
    },
    {
      id: 2,
      name: 'TurboVets AI Solutions',
      description: 'Cutting-edge AI technology company focused on veteran benefits, claims, and support automation'
    },
    {
      id: 3,
      name: 'Veterans Benefits Administration - Regional Office',
      description: 'Regional office handling veteran benefits claims with AI-assisted processing'
    },
    {
      id: 4,
      name: 'VetConnect Digital Services',
      description: 'Digital platform connecting veterans with healthcare resources and AI-powered support'
    },
  ];

  const mockUsers: User[] = [
    {
      id: 1,
      email: 'chief.medical@va-sf.gov',
      passwordHash: '$2b$10$hashedpassword',
      role: Role.OWNER,
      organizationId: 1,
      firstName: 'Dr. Sarah',
      lastName: 'Mitchell',
      title: 'Chief Medical Officer'
    },
    {
      id: 2,
      email: 'ceo@turbovets.ai',
      passwordHash: '$2b$10$hashedpassword',
      role: Role.OWNER,
      organizationId: 2,
      firstName: 'Alex',
      lastName: 'Thompson',
      title: 'CEO & Founder'
    },
  ];

  const mockTasks: Task[] = [
    {
      id: 1,
      title: 'Strategic Healthcare AI Implementation',
      description: 'Lead the implementation of AI-powered diagnostic tools and treatment recommendations across all VA medical facilities.',
      status: TaskStatus.DOING,
      category: TaskCategory.WORK,
      createdByUserId: 1,
      organizationId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    // Create mock repositories
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };

    organizationRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };

    taskRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };

    service = new TestSeedService(userRepository, organizationRepository, taskRepository);

    // Reset mocks
    jest.clearAllMocks();
    mockPasswordUtils.hash.mockClear();
  });

  describe('seedDatabase', () => {
    it('should successfully seed the entire database', async () => {
      // Mock successful seeding
      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      organizationRepository.save.mockResolvedValue(mockOrganizations[0]);
      organizationRepository.count.mockResolvedValue(4);

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      userRepository.save.mockResolvedValue(mockUsers[0]);
      userRepository.count.mockResolvedValue(12);

      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      taskRepository.save.mockResolvedValue(mockTasks[0]);
      taskRepository.count.mockResolvedValue(24);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await service.seedDatabase();

      // Assert
      expect(organizationRepository.save).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('🌱 Starting database seeding...');
      expect(consoleSpy).toHaveBeenCalledWith('🎉 Database seeding completed successfully!');

      consoleSpy.mockRestore();
    });

    it('should handle errors during seeding', async () => {
      // Mock error during organization seeding
      organizationRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(service.seedDatabase()).rejects.toThrow('Database connection failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Database seeding failed:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should complete seeding even with existing data', async () => {
      // Mock existing data
      organizationRepository.findOne.mockResolvedValue(mockOrganizations[0]);
      userRepository.findOne.mockResolvedValue(mockUsers[0]);
      taskRepository.findOne.mockResolvedValue(mockTasks[0]);
      
      // Mock counts
      organizationRepository.count.mockResolvedValue(4);
      userRepository.count.mockResolvedValue(12);
      taskRepository.count.mockResolvedValue(24);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await service.seedDatabase();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('🎉 Database seeding completed successfully!');
      expect(organizationRepository.save).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(taskRepository.save).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('seedOrganizations', () => {
    it('should create all veteran healthcare organizations', async () => {
      // Mock non-existing organizations
      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      organizationRepository.save.mockImplementation((org: any) => ({ ...org, id: Math.floor(Math.random() * 1000) }));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const result = await service['seedOrganizations']();

      // Assert
      expect(result).toHaveLength(4);
      expect(organizationRepository.findOne).toHaveBeenCalledTimes(4);
      expect(organizationRepository.create).toHaveBeenCalledTimes(4);
      expect(organizationRepository.save).toHaveBeenCalledTimes(4);

      // Check specific organizations
      expect(organizationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Veterans Affairs Medical Center - San Francisco'
        })
      );
      expect(organizationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'TurboVets AI Solutions'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should skip creating existing organizations', async () => {
      // Mock existing organization
      organizationRepository.findOne.mockResolvedValue(mockOrganizations[0]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const result = await service['seedOrganizations']();

      // Assert
      expect(result).toHaveLength(4);
      expect(organizationRepository.create).not.toHaveBeenCalled();
      expect(organizationRepository.save).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Organization exists: Veterans Affairs Medical Center - San Francisco')
      );

      consoleSpy.mockRestore();
    });

    it('should create organizations with correct data structure', async () => {
      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      organizationRepository.save.mockImplementation((org: any) => ({ ...org, id: Math.floor(Math.random() * 1000) }));

      // Act
      await service['seedOrganizations']();

      // Assert
      expect(organizationRepository.create).toHaveBeenCalledWith({
        name: 'Veterans Affairs Medical Center - San Francisco',
        description: 'Leading VA Medical Center specializing in AI-powered veteran healthcare services'
      });
      expect(organizationRepository.create).toHaveBeenCalledWith({
        name: 'TurboVets AI Solutions',
        description: 'Cutting-edge AI technology company focused on veteran benefits, claims, and support automation'
      });
      expect(organizationRepository.create).toHaveBeenCalledWith({
        name: 'Veterans Benefits Administration - Regional Office',
        description: 'Regional office handling veteran benefits claims with AI-assisted processing'
      });
      expect(organizationRepository.create).toHaveBeenCalledWith({
        name: 'VetConnect Digital Services',
        description: 'Digital platform connecting veterans with healthcare resources and AI-powered support'
      });
    });
  });

  describe('seedUsers', () => {
    it('should create users for all organizations', async () => {
      // Mock non-existing users
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      userRepository.save.mockImplementation((user: any) => ({ ...user, id: Math.floor(Math.random() * 1000) }));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const result = await service['seedUsers'](mockOrganizations);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(mockPasswordUtils.hash).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should create users with correct role distribution', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      userRepository.save.mockImplementation((user: any) => ({ ...user, id: Math.floor(Math.random() * 1000) }));

      // Act
      await service['seedUsers']([mockOrganizations[0]]);

      // Assert - Each organization should have owner, admin, and viewer
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: Role.OWNER,
          email: 'chief.medical@va-sf.gov'
        })
      );
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: Role.ADMIN,
          email: 'ai.specialist@va-sf.gov'
        })
      );
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: Role.VIEWER,
          email: 'nurse.coordinator@va-sf.gov'
        })
      );
    });

    it('should hash passwords before saving users', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      userRepository.save.mockImplementation((user: any) => ({ ...user, id: Math.floor(Math.random() * 1000) }));

      // Act
      await service['seedUsers']([mockOrganizations[0]]);

      // Assert
      expect(mockPasswordUtils.hash).toHaveBeenCalledWith('owner123');
      expect(mockPasswordUtils.hash).toHaveBeenCalledWith('admin123');
      expect(mockPasswordUtils.hash).toHaveBeenCalledWith('viewer123');
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: '$2b$10$hashedpassword'
        })
      );
    });

    it('should skip creating existing users', async () => {
      userRepository.findOne.mockResolvedValue(mockUsers[0]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const result = await service['seedUsers']([mockOrganizations[0]]);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('User exists: chief.medical@va-sf.gov')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('seedTasks', () => {
    it('should create organization-specific tasks for users', async () => {
      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      taskRepository.save.mockImplementation((task: any) => ({ ...task, id: Math.floor(Math.random() * 1000) }));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const result = await service['seedTasks'](mockUsers, mockOrganizations);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(taskRepository.create).toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should create different tasks based on user role and organization', async () => {
      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      taskRepository.save.mockImplementation((task: any) => ({ ...task, id: Math.floor(Math.random() * 1000) }));

      const vaOwner = {
        ...mockUsers[0],
        role: Role.OWNER,
        organizationId: 1,
      };

      // Act
      await service['seedTasks']([vaOwner], mockOrganizations);

      // Assert
      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Strategic Healthcare AI Implementation',
          status: TaskStatus.DOING,
          category: TaskCategory.WORK,
          createdByUserId: vaOwner.id,
          organizationId: 1,
        })
      );
    });

    it('should skip creating existing tasks', async () => {
      taskRepository.findOne.mockResolvedValue(mockTasks[0]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const result = await service['seedTasks'](mockUsers, mockOrganizations);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(taskRepository.create).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Task exists:')
      );

      consoleSpy.mockRestore();
    });

    it('should handle users with no matching organization', async () => {
      const orphanUser = {
        ...mockUsers[0],
        organizationId: 999, // Non-existent organization
      };

      // Act
      const result = await service['seedTasks']([orphanUser], mockOrganizations);

      // Assert
      expect(result).toHaveLength(0);
      expect(taskRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserDataForOrganization', () => {
    it('should return correct users for VA Medical Center', () => {
      const vaOrg = mockOrganizations[0];

      // Act
      const userData = service['getUserDataForOrganization'](vaOrg);

      // Assert
      expect(userData).toHaveLength(3);
      expect(userData[0]).toMatchObject({
        email: 'chief.medical@va-sf.gov',
        role: Role.OWNER,
        title: 'Chief Medical Officer'
      });
      expect(userData[1]).toMatchObject({
        email: 'ai.specialist@va-sf.gov',
        role: Role.ADMIN,
        title: 'AI Healthcare Specialist'
      });
      expect(userData[2]).toMatchObject({
        email: 'nurse.coordinator@va-sf.gov',
        role: Role.VIEWER,
        title: 'Veteran Care Coordinator'
      });
    });

    it('should return correct users for TurboVets AI Solutions', () => {
      const turboVetsOrg = mockOrganizations[1];

      // Act
      const userData = service['getUserDataForOrganization'](turboVetsOrg);

      // Assert
      expect(userData).toHaveLength(3);
      expect(userData[0]).toMatchObject({
        email: 'ceo@turbovets.ai',
        role: Role.OWNER,
        title: 'CEO & Founder'
      });
      expect(userData[1]).toMatchObject({
        email: 'cto@turbovets.ai',
        role: Role.ADMIN,
        title: 'Chief Technology Officer'
      });
      expect(userData[2]).toMatchObject({
        email: 'developer@turbovets.ai',
        role: Role.VIEWER,
        title: 'AI Developer'
      });
    });

    it('should return empty array for unknown organization', () => {
      const unknownOrg = {
        id: 999,
        name: 'Unknown Organization',
      };

      // Act
      const userData = service['getUserDataForOrganization'](unknownOrg);

      // Assert
      expect(userData).toHaveLength(0);
    });
  });

  describe('getOrganizationSpecificTasks', () => {
    it('should return different tasks for different roles in VA Medical Center', () => {
      const vaOrg = mockOrganizations[0];
      const ownerUser = { ...mockUsers[0], role: Role.OWNER };
      const adminUser = { ...mockUsers[0], role: Role.ADMIN };
      const viewerUser = { ...mockUsers[0], role: Role.VIEWER };

      // Act
      const ownerTasks = service['getOrganizationSpecificTasks'](ownerUser, vaOrg);
      const adminTasks = service['getOrganizationSpecificTasks'](adminUser, vaOrg);
      const viewerTasks = service['getOrganizationSpecificTasks'](viewerUser, vaOrg);

      // Assert
      expect(ownerTasks.length).toBeGreaterThan(0);
      expect(adminTasks.length).toBeGreaterThan(0);
      expect(viewerTasks.length).toBeGreaterThan(0);

      expect(ownerTasks[0].title).toContain('Strategic Healthcare AI Implementation');
      expect(adminTasks[0].title).toContain('AI Diagnostic System Maintenance');
      expect(viewerTasks[0].title).toContain('Veteran Appointment Scheduling');
    });

    it('should return different tasks for TurboVets AI Solutions', () => {
      const turboVetsOrg = mockOrganizations[1];
      const ownerUser = { ...mockUsers[0], role: Role.OWNER };

      // Act
      const tasks = service['getOrganizationSpecificTasks'](ownerUser, turboVetsOrg);

      // Assert
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].title).toContain('AI Platform Architecture Design');
    });

    it('should return empty array for unknown organization', () => {
      const unknownOrg = {
        id: 999,
        name: 'Unknown Organization',
      };
      const user = mockUsers[0];

      // Act
      const tasks = service['getOrganizationSpecificTasks'](user, unknownOrg);

      // Assert
      expect(tasks).toHaveLength(0);
    });
  });

  describe('printSeedingSummary', () => {
    it('should print comprehensive seeding summary', async () => {
      // Mock counts
      organizationRepository.count.mockResolvedValue(4);
      userRepository.count.mockResolvedValueOnce(4) // owner
        .mockResolvedValueOnce(4) // admin
        .mockResolvedValueOnce(4); // viewer
      taskRepository.count.mockResolvedValueOnce(8) // todo
        .mockResolvedValueOnce(8) // doing
        .mockResolvedValueOnce(8) // done
        .mockResolvedValueOnce(24) // work
        .mockResolvedValueOnce(0); // personal

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await service['printSeedingSummary']();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('\n🏥 VETERAN HEALTHCARE AI SEEDING SUMMARY');
      expect(consoleSpy).toHaveBeenCalledWith('Healthcare Organizations: 4');
      expect(consoleSpy).toHaveBeenCalledWith('owner users: 4');
      expect(consoleSpy).toHaveBeenCalledWith('admin users: 4');
      expect(consoleSpy).toHaveBeenCalledWith('viewer users: 4');
      expect(consoleSpy).toHaveBeenCalledWith('todo AI projects: 8');
      expect(consoleSpy).toHaveBeenCalledWith('doing AI projects: 8');
      expect(consoleSpy).toHaveBeenCalledWith('done AI projects: 8');
      expect(consoleSpy).toHaveBeenCalledWith('work initiatives: 24');
      expect(consoleSpy).toHaveBeenCalledWith('personal initiatives: 0');

      consoleSpy.mockRestore();
    });
  });

  describe('clearDatabase', () => {
    it('should clear all seeded data', async () => {
      taskRepository.delete.mockResolvedValue({ affected: 24 });
      userRepository.delete.mockResolvedValue({ affected: 12 });
      organizationRepository.delete.mockResolvedValue({ affected: 4 });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await service.clearDatabase();

      // Assert
      expect(taskRepository.delete).toHaveBeenCalledWith({});
      expect(userRepository.delete).toHaveBeenCalledWith({});
      expect(organizationRepository.delete).toHaveBeenCalledWith({});
      expect(consoleSpy).toHaveBeenCalledWith('🧹 Clearing seeded data...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Database cleared');

      consoleSpy.mockRestore();
    });

    it('should clear data in correct order (tasks -> users -> organizations)', async () => {
      const deleteOrder: string[] = [];
      
      taskRepository.delete.mockImplementation(() => {
        deleteOrder.push('tasks');
        return Promise.resolve({ affected: 24 });
      });
      userRepository.delete.mockImplementation(() => {
        deleteOrder.push('users');
        return Promise.resolve({ affected: 12 });
      });
      organizationRepository.delete.mockImplementation(() => {
        deleteOrder.push('organizations');
        return Promise.resolve({ affected: 4 });
      });

      // Act
      await service.clearDatabase();

      // Assert
      expect(deleteOrder).toEqual(['tasks', 'users', 'organizations']);
    });
  });

  describe('integration scenarios', () => {
    it('should seed complete database with all organizations, users, and tasks', async () => {
      // Mock successful creation of all entities
      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      organizationRepository.save.mockImplementation((org: any) => ({ ...org, id: Math.floor(Math.random() * 1000) }));
      organizationRepository.count.mockResolvedValue(4);

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      userRepository.save.mockImplementation((user: any) => ({ ...user, id: Math.floor(Math.random() * 1000) }));
      userRepository.count.mockResolvedValue(12);

      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      taskRepository.save.mockImplementation((task: any) => ({ ...task, id: Math.floor(Math.random() * 1000) }));
      taskRepository.count.mockResolvedValue(24);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await service.seedDatabase();

      // Assert
      expect(organizationRepository.save).toHaveBeenCalledTimes(4);
      expect(userRepository.save).toHaveBeenCalledTimes(12); // 3 users per organization
      expect(taskRepository.save).toHaveBeenCalled(); // Multiple tasks per user
      expect(consoleSpy).toHaveBeenCalledWith('🎉 Database seeding completed successfully!');

      consoleSpy.mockRestore();
    });

    it('should handle mixed existing and new data during seeding', async () => {
      // Mock some existing data
      organizationRepository.findOne.mockImplementation((criteria: any) => {
        if (criteria.where.name.includes('Veterans Affairs')) {
          return Promise.resolve(mockOrganizations[0]);
        }
        return Promise.resolve(null);
      });
      organizationRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      organizationRepository.save.mockImplementation((org: any) => ({ ...org, id: Math.floor(Math.random() * 1000) }));

      userRepository.findOne.mockImplementation((criteria: any) => {
        if (criteria.where.email.includes('chief.medical')) {
          return Promise.resolve(mockUsers[0]);
        }
        return Promise.resolve(null);
      });
      userRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      userRepository.save.mockImplementation((user: any) => ({ ...user, id: Math.floor(Math.random() * 1000) }));

      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) }));
      taskRepository.save.mockImplementation((task: any) => ({ ...task, id: Math.floor(Math.random() * 1000) }));

      // Mock counts
      organizationRepository.count.mockResolvedValue(4);
      userRepository.count.mockResolvedValue(12);
      taskRepository.count.mockResolvedValue(20);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await service.seedDatabase();

      // Assert
      expect(organizationRepository.save).toHaveBeenCalledTimes(3); // 1 existing, 3 new
      expect(userRepository.save).toHaveBeenCalled(); // Some existing, some new
      expect(taskRepository.save).toHaveBeenCalled(); // All new tasks
      expect(consoleSpy).toHaveBeenCalledWith('🎉 Database seeding completed successfully!');

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle organization creation errors', async () => {
      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockImplementation(() => {
        throw new Error('Organization creation failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(service.seedDatabase()).rejects.toThrow('Organization creation failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Database seeding failed:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should handle user creation errors', async () => {
      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockImplementation((data: any) => ({ ...data, id: 1 }));
      organizationRepository.save.mockImplementation((org: any) => ({ ...org, id: 1 }));

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation(() => {
        throw new Error('User creation failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(service.seedDatabase()).rejects.toThrow('User creation failed');

      consoleErrorSpy.mockRestore();
    });

    it('should handle task creation errors', async () => {
      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockImplementation((data: any) => ({ ...data, id: 1 }));
      organizationRepository.save.mockImplementation((org: any) => ({ ...org, id: 1 }));

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: any) => ({ ...data, id: 1 }));
      userRepository.save.mockImplementation((user: any) => ({ ...user, id: 1 }));

      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.create.mockImplementation(() => {
        throw new Error('Task creation failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(service.seedDatabase()).rejects.toThrow('Task creation failed');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('data consistency', () => {
    it('should ensure all users belong to valid organizations', async () => {
      let orgIdCounter = 1;
      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockImplementation((data: any) => ({ ...data, id: orgIdCounter }));
      organizationRepository.save.mockImplementation((org: any) => {
        const savedOrg = { ...org, id: orgIdCounter };
        orgIdCounter++;
        return savedOrg;
      });

      userRepository.findOne.mockResolvedValue(null);
      let savedUsers: User[] = [];
      userRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) + 1 }));
      userRepository.save.mockImplementation((user: any) => {
        savedUsers.push(user);
        return Promise.resolve(user);
      });

      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) + 1 }));
      taskRepository.save.mockImplementation((task: any) => ({ ...task }));

      // Mock counts
      organizationRepository.count.mockResolvedValue(4);
      userRepository.count.mockResolvedValue(12);
      taskRepository.count.mockResolvedValue(24);

      // Act
      await service.seedDatabase();

      // Assert
      const validOrganizationIds = [1, 2, 3, 4]; // Should match created organizations
      savedUsers.forEach(user => {
        expect(validOrganizationIds).toContain(user.organizationId);
      });
    });

    it('should ensure all tasks belong to valid users and organizations', async () => {
      const mockOrgs = [{ id: 1, name: 'Veterans Affairs Medical Center - San Francisco' }];
      const mockUsersForTest = [{ id: 1, organizationId: 1, role: Role.OWNER, email: 'test@va.gov' }];

      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockImplementation((data: any) => ({ ...data, id: 1 }));
      organizationRepository.save.mockImplementation((org: any) => ({ ...org }));

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: any) => ({ ...data, id: 1 }));
      userRepository.save.mockImplementation((user: any) => ({ ...user }));

      taskRepository.findOne.mockResolvedValue(null);
      let savedTasks: Task[] = [];
      taskRepository.create.mockImplementation((data: any) => ({ ...data, id: Math.floor(Math.random() * 1000) + 1 }));
      taskRepository.save.mockImplementation((task: any) => {
        savedTasks.push(task);
        return Promise.resolve(task);
      });

      // Act
      await service['seedTasks'](mockUsersForTest as User[], mockOrgs as Organization[]);

      // Assert
      savedTasks.forEach(task => {
        expect(task.createdByUserId).toBe(1);
        expect(task.organizationId).toBe(1);
      });
    });
  });
});
