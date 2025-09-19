import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  ParseIntPipe,
  BadRequestException
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import type { CreateTaskDto, UpdateTaskDto, TaskDto } from '@rbac-workspace/data';
import type { TaskStatus, TaskCategory } from '../entities/task.entity';

// Define RbacUser interface locally
interface RbacUser {
  id: number;
  email: string;
  role: string;
  organizationId: number;
}

/**
 * Tasks Controller
 * 
 * Provides comprehensive task management functionality with RBAC enforcement.
 * Implements all CRUD operations with role-based access control.
 */
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Get All Tasks
   * 
   * @route GET /tasks
   * @description Retrieves all tasks visible to the authenticated user based on RBAC policies.
   * @access Authenticated users (Owner, Admin, Viewer)
   * @security JWT Bearer Token required
   */
  @Get()
  async findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('createdByUserId') createdByUserId?: string,
  ): Promise<TaskDto[]> {
    const user: RbacUser = req.user;
    
    // Parse createdByUserId if provided
    let parsedCreatedByUserId: number | undefined;
    if (createdByUserId) {
      const parsed = parseInt(createdByUserId, 10);
      if (isNaN(parsed)) {
        throw new BadRequestException('createdByUserId must be a valid number');
      }
      parsedCreatedByUserId = parsed;
    }

    return this.tasksService.findAll(user, {
      status: status as TaskStatus,
      category: category as TaskCategory,
      createdByUserId: parsedCreatedByUserId,
    });
  }


  /**
   * Get Task Statistics
   * 
   * @route GET /tasks/stats
   * @description Retrieves statistics for tasks within the user's organization.
   * @access Authenticated users (Owner, Admin, Viewer)
   * @security JWT Bearer Token required
   */
  @Get('stats')
  async getTaskStats(@Request() req: any) {
    const user: RbacUser = req.user;
    return this.tasksService.getStats(user);
  }

  /**
   * Get My Tasks (Tasks created by the current user)
   * 
   * @route GET /tasks/my-tasks
   * @description Retrieves tasks created by the authenticated user.
   * @access Authenticated users (Owner, Admin, Viewer)
   * @security JWT Bearer Token required
   */
  @Get('my-tasks')
  async findMyTasks(@Request() req: any): Promise<TaskDto[]> {
    const user: RbacUser = req.user;
    return this.tasksService.findAll(user, { createdByUserId: user.id });
  }

  /**
   * Get a Task by ID
   * 
   * @route GET /tasks/:id
   * @description Retrieves a single task by its ID, respecting RBAC policies.
   * @access Authenticated users (Owner, Admin, Viewer)
   * @security JWT Bearer Token required
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<TaskDto> {
    const user: RbacUser = req.user;
    return this.tasksService.findOne(id, user);
  }

  /**
   * Create a New Task
   * 
   * @route POST /tasks
   * @description Creates a new task. Only Owners and Admins can create tasks.
   * @access Owners and Admins only
   * @security JWT Bearer Token required
   */
  @Post()
  async create(@Body() createTaskDto: CreateTaskDto, @Request() req: any): Promise<TaskDto> {
    const user: RbacUser = req.user;
    
    // Basic RBAC check - only owners and admins can create tasks
    if (user.role !== 'owner' && user.role !== 'admin') {
      throw new BadRequestException('Only owners and admins can create tasks');
    }
    
    return this.tasksService.create(createTaskDto, user);
  }

  /**
   * Update an Existing Task
   * 
   * @route PATCH /tasks/:id
   * @description Updates an existing task. Permissions vary by role.
   * @access Owners, Admins, and Viewers (for their own tasks)
   * @security JWT Bearer Token required
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: any,
  ): Promise<TaskDto> {
    const user: RbacUser = req.user;
    return this.tasksService.update(id, updateTaskDto, user);
  }

  /**
   * Delete a Task
   * 
   * @route DELETE /tasks/:id
   * @description Deletes a task. Only Owners can delete tasks.
   * @access Owners only
   * @security JWT Bearer Token required
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<void> {
    const user: RbacUser = req.user;
    
    // Basic RBAC check - only owners can delete tasks
    if (user.role !== 'owner') {
      throw new BadRequestException('Only owners can delete tasks');
    }
    
    await this.tasksService.remove(id, user);
  }
}
