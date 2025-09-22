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
   * Seed organizations - creates veteran healthcare service organizations
   */
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

  /**
   * Seed users with veteran healthcare service roles
   */
  private async seedUsers(organizations: Organization[]): Promise<User[]> {
    const users: User[] = [];

    for (const org of organizations) {
      let userData = [];
      
      // Define organization-specific user roles
      if (org.name.includes('Veterans Affairs Medical Center')) {
        userData = [
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
        userData = [
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
        userData = [
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
        userData = [
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

  /**
   * Seed tasks for veteran healthcare AI services - organization and role specific
   */
  private async seedTasks(users: User[], organizations: Organization[]): Promise<Task[]> {
    const tasks: Task[] = [];

    for (const user of users) {
      const userOrg = organizations.find(org => org.id === user.organizationId);
      if (!userOrg) continue;

      // Get organization-specific tasks based on user role
      const userTasks = this.getOrganizationSpecificTasks(user, userOrg);
      
      for (const taskData of userTasks) {
        // Check if task already exists (by title and user)
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

  /**
   * Get organization and role-specific tasks
   */
  private getOrganizationSpecificTasks(user: User, organization: Organization): any[] {
    const baseTasks = [];

    if (organization.name.includes('Veterans Affairs Medical Center')) {
      // VA Medical Center - Healthcare focused tasks
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
          },
          {
            title: 'Medical Staff AI Training Program',
            description: 'Develop comprehensive training program for medical staff on AI-assisted healthcare tools and protocols.',
            status: TaskStatus.DOING,
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
          },
          {
            title: 'Patient Data Integration',
            description: 'Integrate patient data from multiple VA systems to provide comprehensive health records for AI analysis.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'AI Model Performance Monitoring',
            description: 'Monitor AI model performance and accuracy for medical diagnosis and treatment recommendations.',
            status: TaskStatus.DONE,
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
          },
          {
            title: 'Patient Care Documentation',
            description: 'Document veteran care interactions and update patient records using AI-assisted documentation tools.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'Veteran Support Services',
            description: 'Provide direct support to veterans navigating AI-powered healthcare services and benefits.',
            status: TaskStatus.DONE,
            category: TaskCategory.WORK,
          }
        );
      }
    } else if (organization.name.includes('TurboVets AI Solutions')) {
      // TurboVets AI - Technology focused tasks
      if (user.role === Role.OWNER) {
        baseTasks.push(
          {
            title: 'AI Platform Architecture Design',
            description: 'Design and architect the next-generation AI platform for veteran services and benefits automation.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          },
          {
            title: 'Strategic Partnership Development',
            description: 'Develop partnerships with VA and other veteran organizations to expand AI service offerings.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'AI Ethics and Compliance Framework',
            description: 'Establish ethical guidelines and compliance framework for AI systems serving veteran populations.',
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
          },
          {
            title: 'API Integration Management',
            description: 'Manage API integrations with VA systems and third-party veteran service providers.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'AI System Security Implementation',
            description: 'Implement comprehensive security measures for AI systems handling sensitive veteran data.',
            status: TaskStatus.DONE,
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
          },
          {
            title: 'Testing and Quality Assurance',
            description: 'Test AI models and applications to ensure reliability and accuracy for veteran services.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'Documentation and Training',
            description: 'Create technical documentation and provide training for AI systems and applications.',
            status: TaskStatus.DONE,
            category: TaskCategory.WORK,
          }
        );
      }
    } else if (organization.name.includes('Veterans Benefits Administration')) {
      // VBA - Benefits processing focused tasks
      if (user.role === Role.OWNER) {
        baseTasks.push(
          {
            title: 'Benefits Processing AI Strategy',
            description: 'Develop strategic roadmap for AI implementation in veteran benefits claims processing and adjudication.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          },
          {
            title: 'Regional Office AI Rollout',
            description: 'Lead the rollout of AI-powered benefits processing systems across regional VBA offices.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'Stakeholder Engagement',
            description: 'Engage with veteran organizations and stakeholders to ensure AI systems meet veteran needs.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          }
        );
      } else if (user.role === Role.ADMIN) {
        baseTasks.push(
          {
            title: 'Claims Processing AI Optimization',
            description: 'Optimize AI algorithms for faster and more accurate veteran benefits claims processing.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          },
          {
            title: 'Data Quality Management',
            description: 'Ensure data quality and integrity for AI systems processing veteran benefits information.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'System Performance Monitoring',
            description: 'Monitor AI system performance and accuracy for benefits claims processing and decision-making.',
            status: TaskStatus.DONE,
            category: TaskCategory.WORK,
          }
        );
      } else {
        baseTasks.push(
          {
            title: 'Benefits Claims Review',
            description: 'Review and process veteran benefits claims using AI-assisted decision support tools.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          },
          {
            title: 'Veteran Communication',
            description: 'Communicate with veterans about their benefits claims status and required documentation.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'Claims Documentation',
            description: 'Document and maintain records of benefits claims processing and AI-assisted decisions.',
            status: TaskStatus.DONE,
            category: TaskCategory.WORK,
          }
        );
      }
    } else if (organization.name.includes('VetConnect Digital Services')) {
      // VetConnect - Digital platform focused tasks
      if (user.role === Role.OWNER) {
        baseTasks.push(
          {
            title: 'Digital Platform Strategy',
            description: 'Develop strategic vision for AI-powered digital platform connecting veterans with healthcare resources.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          },
          {
            title: 'Veteran Community Building',
            description: 'Build and nurture veteran community through AI-powered digital engagement and support platforms.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'Partnership and Funding',
            description: 'Secure partnerships and funding to expand AI-powered veteran support services and platform capabilities.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          }
        );
      } else if (user.role === Role.ADMIN) {
        baseTasks.push(
          {
            title: 'Platform AI Integration',
            description: 'Integrate AI capabilities into the digital platform to enhance veteran user experience and support.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          },
          {
            title: 'User Analytics and Insights',
            description: 'Analyze user behavior and platform usage to improve AI-powered veteran support services.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'Content Management System',
            description: 'Manage and curate AI-generated content and resources for veteran support and education.',
            status: TaskStatus.DONE,
            category: TaskCategory.WORK,
          }
        );
      } else {
        baseTasks.push(
          {
            title: 'Veteran Support Chat',
            description: 'Provide direct support to veterans through AI-powered chat and communication platforms.',
            status: TaskStatus.DOING,
            category: TaskCategory.WORK,
          },
          {
            title: 'Resource Coordination',
            description: 'Coordinate veteran access to healthcare resources and benefits through digital platform tools.',
            status: TaskStatus.TODO,
            category: TaskCategory.WORK,
          },
          {
            title: 'Community Engagement',
            description: 'Engage with veteran community members and facilitate peer support through digital platforms.',
            status: TaskStatus.DONE,
            category: TaskCategory.WORK,
          }
        );
      }
    }

    return baseTasks;
  }

  /**
   * Print a summary of seeded veteran healthcare AI data
   */
  private async printSeedingSummary(): Promise<void> {
    console.log('\n🏥 VETERAN HEALTHCARE AI SEEDING SUMMARY');
    console.log('==========================================');

    // Count organizations
    const orgCount = await this.organizationRepository.count();
    console.log(`Healthcare Organizations: ${orgCount}`);

    // Count users by role
    for (const role of Object.values(Role)) {
      const count = await this.userRepository.count({ where: { role } });
      console.log(`${role} users: ${count}`);
    }

    // Count tasks by status
    for (const status of Object.values(TaskStatus)) {
      const count = await this.taskRepository.count({ where: { status } });
      console.log(`${status} AI projects: ${count}`);
    }

    // Count tasks by category
    for (const category of Object.values(TaskCategory)) {
      const count = await this.taskRepository.count({ where: { category } });
      console.log(`${category} initiatives: ${count}`);
    }

    console.log('\n🔑 VETERAN HEALTHCARE AI TEST ACCOUNTS');
    console.log('======================================');
    console.log('Veterans Affairs Medical Center - San Francisco:');
    console.log('  chief.medical@va-sf.gov / owner123 (Chief Medical Officer)');
    console.log('  ai.specialist@va-sf.gov / admin123 (AI Healthcare Specialist)');
    console.log('  nurse.coordinator@va-sf.gov / viewer123 (Veteran Care Coordinator)');
    console.log('\nTurboVets AI Solutions:');
    console.log('  ceo@turbovets.ai / owner123 (CEO & Founder)');
    console.log('  cto@turbovets.ai / admin123 (Chief Technology Officer)');
    console.log('  developer@turbovets.ai / viewer123 (AI Developer)');
    console.log('\nVeterans Benefits Administration - Regional Office:');
    console.log('  regional.director@vba.gov / owner123 (Regional Director)');
    console.log('  claims.supervisor@vba.gov / admin123 (Claims Processing Supervisor)');
    console.log('  benefits.specialist@vba.gov / viewer123 (Benefits Specialist)');
    console.log('\nVetConnect Digital Services:');
    console.log('  director@vetconnect.org / owner123 (Executive Director)');
    console.log('  platform.manager@vetconnect.org / admin123 (Platform Manager)');
    console.log('  support.specialist@vetconnect.org / viewer123 (Veteran Support Specialist)');
    console.log('\n🎯 AI TECHNOLOGY FOR ALL THINGS VETERAN:');
    console.log('   BENEFITS, CLAIMS, RESOURCES, AND SUPPORT');
    console.log('   SIMPLIFIED, FAST-TRACKED, AND SECURED');
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
