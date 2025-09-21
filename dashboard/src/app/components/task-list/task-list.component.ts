import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { Task, TaskFilters, TaskStatus, TaskCategory } from '../../models/task.models';
import { TasksService } from '../../services/tasks.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css'
})
export class TaskListComponent implements OnInit, OnDestroy {
  @Output() createTask = new EventEmitter<void>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<Task>();

  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  stats: any = null;
  isLoading = false;
  searchQuery = '';
  quickFilter = 'all';

  filters: TaskFilters = {
    status: undefined,
    category: undefined,
    createdByUserId: undefined
  };

  statusOptions = Object.values(TaskStatus);
  categoryOptions = Object.values(TaskCategory);

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private tasksService: TasksService,
    public authService: AuthService
  ) {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.loadTasks();
      this.loadStats();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTasks(): void {
    this.isLoading = true;
    this.tasksService.getTasks(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks: Task[]) => {
          this.tasks = tasks;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading tasks:', error);
          this.isLoading = false;
        }
      });
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

  onSearchChange(): void {
    this.searchSubject$.next(this.searchQuery);
  }

  applyFilters(): void {
    let filtered = [...this.tasks];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      );
    }

    // Apply quick filters
    if (this.quickFilter !== 'all') {
      switch (this.quickFilter) {
        case 'todo':
          filtered = filtered.filter(task => task.status === TaskStatus.TODO);
          break;
        case 'doing':
          filtered = filtered.filter(task => task.status === TaskStatus.DOING);
          break;
        case 'done':
          filtered = filtered.filter(task => task.status === TaskStatus.DONE);
          break;
      }
    }

    this.filteredTasks = filtered;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.quickFilter = 'all';
    this.filters = {
      status: undefined,
      category: undefined,
      createdByUserId: undefined
    };
    this.applyFilters();
  }

  setQuickFilter(filter: string): void {
    this.quickFilter = filter;
    this.applyFilters();
  }

  onTaskClick(task: Task): void {
    // Handle task click - could open a detail view
    console.log('Task clicked:', task);
  }

  onEditTask(task: Task): void {
    this.editTask.emit(task);
  }

  onDeleteTask(task: Task): void {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.deleteTask.emit(task);
    }
  }

  onCreateTask(): void {
    this.createTask.emit();
  }

  trackByTaskId(index: number, task: Task): number {
    return task.id;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchQuery.trim() ||
      this.filters.status ||
      this.filters.category ||
      this.quickFilter !== 'all'
    );
  }

  getStatusLabel(status: string): string {
    return status.replace('_', ' ').toUpperCase();
  }

  getCategoryLabel(category: string): string {
    return category.replace('_', ' ').toUpperCase();
  }
}