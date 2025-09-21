import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.css'
})
export class TaskCardComponent {
  @Input() task!: Task;
  @Output() taskClick = new EventEmitter<Task>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<Task>();

  constructor(private authService: AuthService) {}

  onTaskClick(): void {
    this.taskClick.emit(this.task);
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.editTask.emit(this.task);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.deleteTask.emit(this.task);
  }

  canEdit(): boolean {
    return this.authService.canCreateTasks();
  }

  canDelete(): boolean {
    return this.authService.canDeleteTasks();
  }

  getStatusClass(): string {
    return this.task.status;
  }

  getStatusLabel(): string {
    return this.task.status.replace('_', ' ').toUpperCase();
  }

  getCategoryClass(): string {
    return this.task.category;
  }

  getCategoryLabel(): string {
    return this.task.category.replace('_', ' ').toUpperCase();
  }
}
