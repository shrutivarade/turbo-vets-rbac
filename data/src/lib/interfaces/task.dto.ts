import { TaskStatus } from '../enums/task-status.enum.js';
import { TaskCategory } from '../enums/task-category.enum.js';

export interface TaskDto {
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

export interface CreateTaskDto {
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  category?: TaskCategory;
}
