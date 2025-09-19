import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskCategory } from '../entities/task.entity';
import { CreateTaskDto, UpdateTaskDto, TaskDto } from '@rbac-workspace/data';
// Define RbacUser interface locally
interface RbacUser {
  id: number;
  email: string;
  role: string;
  organizationId: number;
}
// Import RBAC functions from local policy helpers
import { 
  canReadTasks, 
  canCreateTask, 
  canUpdateTask, 
  canDeleteTask, 
  scopeForTasks
} from '../auth/policy-helpers';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResult } from '../entities/audit-log.entity';

/**
 * Tasks Service
 * 
 * Handles all task-related business logic including:
 * - CRUD operations with RBAC enforcement
 * - Organization-level data isolation
 * - Role-based permissions and access control
 * - Audit logging for all operations
 * - Data validation and error handling
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all tasks for a user based on their role and organization
   * 
   * @param user - The authenticated user
   * @param filters - Optional filters for status, category, etc.
   * @returns Promise<TaskDto[]> - List of tasks the user can access
   */
  async findAll(user: RbacUser, filters?: {
    status?: TaskStatus;
    category?: TaskCategory;
    createdByUserId?: number;
  }): Promise<TaskDto[]> {
    try {
      // Check if user can read tasks
      if (!canReadTasks(user)) {
        throw new ForbiddenException('Access denied: Cannot read tasks');
      }

      // Build query with RBAC scoping
      const queryBuilder = this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.createdBy', 'user')
        .where('task.organizationId = :organizationId', { organizationId: user.organizationId });

      // Apply role-based scoping
      const scope = scopeForTasks(user);
      if (scope.createdByUserId) {
        queryBuilder.andWhere('task.createdByUserId = :createdByUserId', { 
          createdByUserId: scope.createdByUserId 
        });
      }

      // Apply filters
      if (filters?.status) {
        queryBuilder.andWhere('task.status = :status', { status: filters.status });
      }
      if (filters?.category) {
        queryBuilder.andWhere('task.category = :category', { category: filters.category });
      }
      if (filters?.createdByUserId) {
        queryBuilder.andWhere('task.createdByUserId = :createdByUserId', { 
          createdByUserId: filters.createdByUserId 
        });
      }

      // Order by creation date (newest first)
      queryBuilder.orderBy('task.createdAt', 'DESC');

      const tasks = await queryBuilder.getMany();

      // Log the read operation
      await this.auditService.logUserAction(
        AuditAction.TASK_VIEWED,
        AuditResult.SUCCESS,
        user,
        `Retrieved ${tasks.length} tasks`,
        'task'
      );

      this.logger.log(`User ${user.email} retrieved ${tasks.length} tasks`);
      return tasks.map(task => this.mapToDto(task));
    } catch (error: any) {
      await this.auditService.logUserAction(
        AuditAction.TASK_VIEWED,
        AuditResult.FAILURE,
        user,
        `Failed to retrieve tasks: ${error.message}`,
        'task'
      );
      throw error;
    }
  }

  /**
   * Get a specific task by ID
   * 
   * @param id - Task ID
   * @param user - The authenticated user
   * @returns Promise<TaskDto> - The task if accessible
   */
  async findOne(id: number, user: RbacUser): Promise<TaskDto> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id },
        relations: ['createdBy']
      });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      // Check if user can read tasks (general permission)
      if (!canReadTasks(user)) {
        throw new ForbiddenException('Access denied: Cannot read tasks');
      }

      // Check organization access
      if (task.organizationId !== user.organizationId) {
        throw new ForbiddenException('Access denied: Task belongs to different organization');
      }

      // Log the read operation
      await this.auditService.logUserAction(
        AuditAction.TASK_VIEWED,
        AuditResult.SUCCESS,
        user,
        `Retrieved task ${id}: ${task.title}`,
        'task',
        task.id
      );

      this.logger.log(`User ${user.email} retrieved task ${id}`);
      return this.mapToDto(task);
    } catch (error: any) {
      await this.auditService.logUserAction(
        AuditAction.TASK_VIEWED,
        AuditResult.FAILURE,
        user,
        `Failed to retrieve task ${id}: ${error.message}`,
        'task',
        id
      );
      throw error;
    }
  }

  /**
   * Create a new task
   * 
   * @param createTaskDto - Task creation data
   * @param user - The authenticated user
   * @returns Promise<TaskDto> - The created task
   */
  async create(createTaskDto: CreateTaskDto, user: RbacUser): Promise<TaskDto> {
    try {
      // Check if user can create tasks
      if (!canCreateTask(user)) {
        throw new ForbiddenException('Access denied: Cannot create tasks');
      }

      // Validate task data
      this.validateTaskData(createTaskDto);

      // Create the task
      const task = this.taskRepository.create({
        ...createTaskDto,
        createdByUserId: user.id,
        organizationId: user.organizationId,
      });

      const savedTask = await this.taskRepository.save(task);

      // Log the creation
      await this.auditService.logUserAction(
        AuditAction.TASK_CREATED,
        AuditResult.SUCCESS,
        user,
        `Created task: ${savedTask.title}`,
        'task',
        savedTask.id
      );

      this.logger.log(`User ${user.email} created task ${savedTask.id}: ${savedTask.title}`);
      return this.mapToDto(savedTask);
    } catch (error: any) {
      await this.auditService.logUserAction(
        AuditAction.TASK_CREATED,
        AuditResult.FAILURE,
        user,
        `Failed to create task: ${error.message}`,
        'task'
      );
      throw error;
    }
  }

  /**
   * Update an existing task
   * 
   * @param id - Task ID
   * @param updateTaskDto - Task update data
   * @param user - The authenticated user
   * @returns Promise<TaskDto> - The updated task
   */
  async update(id: number, updateTaskDto: UpdateTaskDto, user: RbacUser): Promise<TaskDto> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id },
        relations: ['createdBy']
      });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      // Check if user can update this task
      if (!canUpdateTask(user, task)) {
        throw new ForbiddenException('Access denied: Cannot update this task');
      }

      // Validate update data
      this.validateTaskUpdateData(updateTaskDto);

      // Update the task
      Object.assign(task, updateTaskDto);
      const savedTask = await this.taskRepository.save(task);

      // Log the update
      await this.auditService.logUserAction(
        AuditAction.TASK_UPDATED,
        AuditResult.SUCCESS,
        user,
        `Updated task ${id}: ${savedTask.title}`,
        'task',
        savedTask.id
      );

      this.logger.log(`User ${user.email} updated task ${id}: ${savedTask.title}`);
      return this.mapToDto(savedTask);
    } catch (error: any) {
      await this.auditService.logUserAction(
        AuditAction.TASK_UPDATED,
        AuditResult.FAILURE,
        user,
        `Failed to update task ${id}: ${error.message}`,
        'task',
        id
      );
      throw error;
    }
  }

  /**
   * Delete a task
   * 
   * @param id - Task ID
   * @param user - The authenticated user
   * @returns Promise<void>
   */
  async remove(id: number, user: RbacUser): Promise<void> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id },
        relations: ['createdBy']
      });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      // Check if user can delete this task
      if (!canDeleteTask(user, task)) {
        throw new ForbiddenException('Access denied: Cannot delete this task');
      }

      // Delete the task
      await this.taskRepository.remove(task);

      // Log the deletion
      await this.auditService.logUserAction(
        AuditAction.TASK_DELETED,
        AuditResult.SUCCESS,
        user,
        `Deleted task ${id}: ${task.title}`,
        'task',
        task.id
      );

      this.logger.log(`User ${user.email} deleted task ${id}: ${task.title}`);
    } catch (error: any) {
      await this.auditService.logUserAction(
        AuditAction.TASK_DELETED,
        AuditResult.FAILURE,
        user,
        `Failed to delete task ${id}: ${error.message}`,
        'task',
        id
      );
      throw error;
    }
  }

  /**
   * Get task statistics for a user
   * 
   * @param user - The authenticated user
   * @returns Promise<object> - Task statistics
   */
  async getStats(user: RbacUser): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    byCategory: Record<TaskCategory, number>;
    recent: TaskDto[];
  }> {
    try {
      // Check if user can read tasks
      if (!canReadTasks(user)) {
        throw new ForbiddenException('Access denied: Cannot read task statistics');
      }

      // Build query with RBAC scoping
      const queryBuilder = this.taskRepository.createQueryBuilder('task')
        .where('task.organizationId = :organizationId', { organizationId: user.organizationId });

      // Apply role-based scoping
      const scope = scopeForTasks(user);
      if (scope.createdByUserId) {
        queryBuilder.andWhere('task.createdByUserId = :createdByUserId', { 
          createdByUserId: scope.createdByUserId 
        });
      }

      const tasks = await queryBuilder.getMany();

      // Calculate statistics
      const total = tasks.length;
      const byStatus = {
        [TaskStatus.TODO]: tasks.filter(t => t.status === TaskStatus.TODO).length,
        [TaskStatus.DOING]: tasks.filter(t => t.status === TaskStatus.DOING).length,
        [TaskStatus.DONE]: tasks.filter(t => t.status === TaskStatus.DONE).length,
      };
      const byCategory = {
        [TaskCategory.WORK]: tasks.filter(t => t.category === TaskCategory.WORK).length,
        [TaskCategory.PERSONAL]: tasks.filter(t => t.category === TaskCategory.PERSONAL).length,
      };

      // Get recent tasks (last 5)
      const recent = tasks
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map(task => this.mapToDto(task));

      // Log the stats access
      await this.auditService.logUserAction(
        AuditAction.TASK_VIEWED,
        AuditResult.SUCCESS,
        user,
        `Retrieved task statistics: ${total} total tasks`,
        'task'
      );

      return { total, byStatus, byCategory, recent };
    } catch (error: any) {
      await this.auditService.logUserAction(
        AuditAction.TASK_VIEWED,
        AuditResult.FAILURE,
        user,
        `Failed to retrieve task statistics: ${error.message}`,
        'task'
      );
      throw error;
    }
  }

  /**
   * Validate task creation data
   */
  private validateTaskData(createTaskDto: CreateTaskDto): void {
    if (!createTaskDto.title || createTaskDto.title.trim().length === 0) {
      throw new BadRequestException('Task title is required');
    }
    if (createTaskDto.title.length > 255) {
      throw new BadRequestException('Task title must be less than 255 characters');
    }
    if (createTaskDto.description && createTaskDto.description.length > 1000) {
      throw new BadRequestException('Task description must be less than 1000 characters');
    }
    if (!Object.values(TaskStatus).includes(createTaskDto.status)) {
      throw new BadRequestException('Invalid task status');
    }
    if (!Object.values(TaskCategory).includes(createTaskDto.category)) {
      throw new BadRequestException('Invalid task category');
    }
  }

  /**
   * Validate task update data
   */
  private validateTaskUpdateData(updateTaskDto: UpdateTaskDto): void {
    if (updateTaskDto.title !== undefined) {
      if (!updateTaskDto.title || updateTaskDto.title.trim().length === 0) {
        throw new BadRequestException('Task title cannot be empty');
      }
      if (updateTaskDto.title.length > 255) {
        throw new BadRequestException('Task title must be less than 255 characters');
      }
    }
    if (updateTaskDto.description !== undefined && updateTaskDto.description && updateTaskDto.description.length > 1000) {
      throw new BadRequestException('Task description must be less than 1000 characters');
    }
    if (updateTaskDto.status !== undefined && !Object.values(TaskStatus).includes(updateTaskDto.status)) {
      throw new BadRequestException('Invalid task status');
    }
    if (updateTaskDto.category !== undefined && !Object.values(TaskCategory).includes(updateTaskDto.category)) {
      throw new BadRequestException('Invalid task category');
    }
  }

  /**
   * Map Task entity to TaskDto
   */
  private mapToDto(task: Task): TaskDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      category: task.category,
      createdByUserId: task.createdByUserId,
      organizationId: task.organizationId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
