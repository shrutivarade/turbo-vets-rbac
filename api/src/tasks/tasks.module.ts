import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../entities/task.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TestTasksController } from './test-tasks.controller';
import { AuditModule } from '../audit/audit.module';

/**
 * Tasks Module
 * 
 * Provides comprehensive task management functionality including:
 * - Complete CRUD operations for tasks
 * - RBAC enforcement and organization-level data isolation
 * - Role-based permissions and access control
 * - Audit logging for all task operations
 * - Data validation and error handling
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    AuditModule,
  ],
  controllers: [TasksController, TestTasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
