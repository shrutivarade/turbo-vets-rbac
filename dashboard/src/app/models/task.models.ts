export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: number;
  organizationId: number;
}

export enum TaskStatus {
  TODO = 'todo',
  DOING = 'doing',
  DONE = 'done'
}

export enum TaskCategory {
  WORK = 'work',
  PERSONAL = 'personal'
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  category?: TaskCategory;
}

export interface TaskFilters {
  status?: string;
  category?: string;
  createdByUserId?: number;
}

export interface TaskStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byCategory: Record<TaskCategory, number>;
  recent: Task[];
}

export interface User {
  id: number;
  email: string;
  role: string;
  organizationId: number;
}

export interface TaskFormData {
  title: string;
  description: string;
  category: TaskCategory;
  status?: TaskStatus;
}
