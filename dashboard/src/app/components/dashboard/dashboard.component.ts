import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Task, TaskStats } from '../../models/task.models';
import { TasksService } from '../../services/tasks.service';
import { AuthService } from '../../services/auth.service';
import { TaskListComponent } from '../task-list/task-list.component';
import { TaskFormComponent } from '../task-form/task-form.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TaskListComponent, TaskFormComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  stats: TaskStats | null = null;
  viewMode: 'list' | 'grid' = 'list';
  showTaskForm = false;
  selectedTask: Task | undefined = undefined;
  isEditMode = false;

  private destroy$ = new Subject<void>();

  constructor(
    private tasksService: TasksService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get current user
    this.authService.getCurrentUserObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        // Only load stats if user is authenticated
        if (user && this.authService.isAuthenticated()) {
          this.loadStats();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStats(): void {
    this.tasksService.getTaskStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (error) => {
          console.error('Error loading task statistics:', error);
        }
      });
  }

  setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode = mode;
  }

  showCreateForm(): void {
    this.selectedTask = undefined;
    this.isEditMode = false;
    this.showTaskForm = true;
  }

  showEditForm(task: Task): void {
    this.selectedTask = task;
    this.isEditMode = true;
    this.showTaskForm = true;
  }

  hideTaskForm(): void {
    this.showTaskForm = false;
    this.selectedTask = undefined;
    this.isEditMode = false;
  }

  onSaveTask(taskData: any): void {
    if (this.isEditMode && this.selectedTask) {
      this.tasksService.updateTask(this.selectedTask.id, taskData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.hideTaskForm();
            this.loadStats();
            // Trigger refresh of task list if needed
          },
          error: (error) => {
            console.error('Error updating task:', error);
          }
        });
    } else {
      this.tasksService.createTask(taskData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.hideTaskForm();
            this.loadStats();
            // Trigger refresh of task list if needed
          },
          error: (error) => {
            console.error('Error creating task:', error);
          }
        });
    }
  }

  onDeleteTask(task: Task): void {
    this.tasksService.deleteTask(task.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadStats();
          // The task list will automatically refresh
        },
        error: (error) => {
          console.error('Error deleting task:', error);
        }
      });
  }

  logout(): void {
    this.authService.logout();
  }

  canCreateTasks(): boolean {
    return this.authService.canCreateTasks();
  }
}
