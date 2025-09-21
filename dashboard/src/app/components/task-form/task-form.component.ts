import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskFormData, TaskStatus, TaskCategory } from '../../models/task.models';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.css'
})
export class TaskFormComponent implements OnInit {
  @Input() task?: Task;
  @Input() isEditMode = false;
  @Output() save = new EventEmitter<CreateTaskRequest | UpdateTaskRequest>();
  @Output() cancel = new EventEmitter<void>();

  formData: TaskFormData = {
    title: '',
    description: '',
    category: TaskCategory.WORK,
    status: TaskStatus.TODO
  };

  isSubmitting = false;

  statusOptions = Object.values(TaskStatus);
  categoryOptions = Object.values(TaskCategory);

  constructor() {}

  ngOnInit(): void {
    if (this.isEditMode && this.task) {
      this.populateForm();
    }
  }

  private populateForm(): void {
    if (!this.task) return;

    this.formData = {
      title: this.task.title,
      description: this.task.description || '',
      category: this.task.category,
      status: this.task.status
    };
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    const taskData = this.prepareTaskData();

    this.save.emit(taskData);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private prepareTaskData(): CreateTaskRequest | UpdateTaskRequest {
    const baseData = {
      title: this.formData.title,
      description: this.formData.description,
      category: this.formData.category,
      status: this.isEditMode ? this.formData.status : TaskStatus.TODO
    };

    if (this.isEditMode) {
      return baseData as UpdateTaskRequest;
    } else {
      return baseData as CreateTaskRequest;
    }
  }

  getCategoryLabel(category: string): string {
    return category.replace('_', ' ').toUpperCase();
  }

  getStatusLabel(status: string): string {
    return status.replace('_', ' ').toUpperCase();
  }
}
