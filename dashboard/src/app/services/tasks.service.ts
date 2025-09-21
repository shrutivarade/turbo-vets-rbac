import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { 
  Task, 
  CreateTaskRequest, 
  UpdateTaskRequest, 
  TaskFilters, 
  TaskStats,
  TaskStatus
} from '../models/task.models';

@Injectable({
  providedIn: 'root'
})
export class TasksService {
  private apiUrl = 'http://localhost:3000/api';
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$ = this.tasksSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get all tasks with optional filters
   */
  getTasks(filters?: TaskFilters): Observable<Task[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.category) {
        params = params.set('category', filters.category);
      }
      if (filters.createdByUserId) {
        params = params.set('createdByUserId', filters.createdByUserId.toString());
      }
    }

    return this.http.get<Task[]>(`${this.apiUrl}/tasks`, { params })
      .pipe(
        tap(tasks => {
          this.tasksSubject.next(tasks);
        })
      );
  }

  /**
   * Get a single task by ID
   */
  getTask(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/tasks/${id}`);
  }

  /**
   * Create a new task
   */
  createTask(taskData: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/tasks`, taskData)
      .pipe(
        tap(newTask => {
          const currentTasks = this.tasksSubject.value;
          this.tasksSubject.next([newTask, ...currentTasks]);
        })
      );
  }

  /**
   * Update an existing task
   */
  updateTask(id: number, taskData: UpdateTaskRequest): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/tasks/${id}`, taskData)
      .pipe(
        tap(updatedTask => {
          const currentTasks = this.tasksSubject.value;
          const index = currentTasks.findIndex(task => task.id === id);
          if (index !== -1) {
            currentTasks[index] = updatedTask;
            this.tasksSubject.next([...currentTasks]);
          }
        })
      );
  }

  /**
   * Delete a task
   */
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tasks/${id}`)
      .pipe(
        tap(() => {
          const currentTasks = this.tasksSubject.value;
          const filteredTasks = currentTasks.filter(task => task.id !== id);
          this.tasksSubject.next(filteredTasks);
        })
      );
  }

  /**
   * Get task statistics
   */
  getTaskStats(): Observable<TaskStats> {
    return this.http.get<TaskStats>(`${this.apiUrl}/tasks/stats`);
  }

  /**
   * Get my tasks (tasks created by current user)
   */
  getMyTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/tasks/my-tasks`)
      .pipe(
        tap(tasks => {
          this.tasksSubject.next(tasks);
        })
      );
  }

  /**
   * Update task status
   */
  updateTaskStatus(id: number, status: TaskStatus): Observable<Task> {
    return this.updateTask(id, { status });
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Observable<Task[]> {
    return this.getTasks({ status });
  }

  /**
   * Get current tasks from cache
   */
  getCurrentTasks(): Task[] {
    return this.tasksSubject.value;
  }

  /**
   * Refresh tasks
   */
  refreshTasks(filters?: TaskFilters): Observable<Task[]> {
    return this.getTasks(filters);
  }
}
