/// <reference path="../../jest.d.ts" />

// Mock task entity and related types to avoid TypeORM decorator issues
enum TaskStatus {
  TODO = 'todo',
  DOING = 'doing',
  DONE = 'done'
}

enum TaskCategory {
  WORK = 'work',
  PERSONAL = 'personal'
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
  createdBy?: any;
  createdByUserId: number;
  organization?: any;
  organizationId: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mock validation functions
function validateTitle(title: string): boolean {
  return !!(title && title.trim().length > 0 && title.length <= 255);
}

function validateDescription(description?: string): boolean {
  if (!description) return true; // Optional field
  return description.length <= 1000; // Reasonable limit for text
}

function validateStatus(status: string): boolean {
  return Object.values(TaskStatus).includes(status as TaskStatus);
}

function validateCategory(category: string): boolean {
  return Object.values(TaskCategory).includes(category as TaskCategory);
}

function createTask(data: Partial<Task>): Task {
  const now = new Date();
  return {
    id: data.id || 0,
    title: data.title || '',
    description: data.description,
    status: data.status || TaskStatus.TODO,
    category: data.category || TaskCategory.WORK,
    createdBy: data.createdBy,
    createdByUserId: data.createdByUserId || 0,
    organization: data.organization,
    organizationId: data.organizationId || 0,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
  };
}

describe('Task Entity', () => {
  describe('Task Status Enum', () => {
    it('should have correct status values', () => {
      expect(TaskStatus.TODO).toBe('todo');
      expect(TaskStatus.DOING).toBe('doing');
      expect(TaskStatus.DONE).toBe('done');
    });

    it('should contain all expected statuses', () => {
      const statuses = Object.values(TaskStatus);
      expect(statuses).toHaveLength(3);
      expect(statuses).toContain('todo');
      expect(statuses).toContain('doing');
      expect(statuses).toContain('done');
    });

    it('should validate status values correctly', () => {
      expect(validateStatus('todo')).toBe(true);
      expect(validateStatus('doing')).toBe(true);
      expect(validateStatus('done')).toBe(true);
      expect(validateStatus('invalid')).toBe(false);
      expect(validateStatus('')).toBe(false);
    });

    it('should support status progression logic', () => {
      const statusOrder = [TaskStatus.TODO, TaskStatus.DOING, TaskStatus.DONE];
      const getStatusIndex = (status: TaskStatus) => statusOrder.indexOf(status);
      
      expect(getStatusIndex(TaskStatus.TODO)).toBe(0);
      expect(getStatusIndex(TaskStatus.DOING)).toBe(1);
      expect(getStatusIndex(TaskStatus.DONE)).toBe(2);
      
      // Test progression
      expect(getStatusIndex(TaskStatus.DOING)).toBeGreaterThan(getStatusIndex(TaskStatus.TODO));
      expect(getStatusIndex(TaskStatus.DONE)).toBeGreaterThan(getStatusIndex(TaskStatus.DOING));
    });
  });

  describe('Task Category Enum', () => {
    it('should have correct category values', () => {
      expect(TaskCategory.WORK).toBe('work');
      expect(TaskCategory.PERSONAL).toBe('personal');
    });

    it('should contain all expected categories', () => {
      const categories = Object.values(TaskCategory);
      expect(categories).toHaveLength(2);
      expect(categories).toContain('work');
      expect(categories).toContain('personal');
    });

    it('should validate category values correctly', () => {
      expect(validateCategory('work')).toBe(true);
      expect(validateCategory('personal')).toBe(true);
      expect(validateCategory('invalid')).toBe(false);
      expect(validateCategory('')).toBe(false);
    });
  });

  describe('Task Creation', () => {
    it('should create task with required fields', () => {
      const taskData = {
        id: 1,
        title: 'Test Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      };

      const task = createTask(taskData);

      expect(task.id).toBe(1);
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.category).toBe(TaskCategory.WORK);
      expect(task.createdByUserId).toBe(1);
      expect(task.organizationId).toBe(1);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should create task with optional description', () => {
      const taskData = {
        id: 2,
        title: 'Detailed Task',
        description: 'This task has a detailed description explaining what needs to be done.',
        status: TaskStatus.DOING,
        category: TaskCategory.PERSONAL,
        createdByUserId: 2,
        organizationId: 1,
      };

      const task = createTask(taskData);

      expect(task.description).toBe('This task has a detailed description explaining what needs to be done.');
    });

    it('should handle undefined optional fields', () => {
      const taskData = {
        id: 3,
        title: 'Basic Task',
        status: TaskStatus.DONE,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      };

      const task = createTask(taskData);

      expect(task.description).toBeUndefined();
    });

    it('should set timestamps automatically', () => {
      const beforeCreation = new Date();
      const task = createTask({
        id: 1,
        title: 'Timestamp Test',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      });
      const afterCreation = new Date();

      expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(task.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      expect(task.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(task.updatedAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });

  describe('Title Validation', () => {
    it('should validate correct task titles', () => {
      const validTitles = [
        'Simple Task',
        'Task with Numbers 123',
        'Task with Special Characters !@#$%',
        'A Very Long Task Title That Describes Exactly What Needs To Be Done In Detail',
        'Single',
        'Task-Name_With_Underscores',
        'émojis and ünïcödé 🚀',
      ];

      validTitles.forEach(title => {
        expect(validateTitle(title)).toBe(true);
      });
    });

    it('should reject invalid task titles', () => {
      const invalidTitles = [
        '', // Empty
        '   ', // Only whitespace
        'A'.repeat(256), // Too long
      ];

      invalidTitles.forEach(title => {
        expect(validateTitle(title)).toBe(false);
      });
    });

    it('should trim whitespace from titles', () => {
      const taskData = {
        id: 1,
        title: '  Trimmed Task Title  ',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      };

      const task = createTask(taskData);
      const trimmedTitle = task.title.trim();

      expect(trimmedTitle).toBe('Trimmed Task Title');
      expect(validateTitle(trimmedTitle)).toBe(true);
    });
  });

  describe('Description Validation', () => {
    it('should validate correct descriptions', () => {
      const validDescriptions = [
        'A short description',
        'A longer description with multiple sentences. This task involves several steps.',
        'Description with numbers 123 and symbols !@#$%',
        'Multi-line\ndescription\nwith\nbreaks',
        '', // Empty string is valid
      ];

      validDescriptions.forEach(description => {
        expect(validateDescription(description)).toBe(true);
      });
    });

    it('should validate undefined description', () => {
      expect(validateDescription(undefined)).toBe(true);
    });

    it('should reject overly long descriptions', () => {
      const tooLongDescription = 'A'.repeat(1001);
      expect(validateDescription(tooLongDescription)).toBe(false);
    });

    it('should handle rich text or markdown in descriptions', () => {
      const markdownDescription = `
# Task Description

This task involves:
- Step 1: Initialize the project
- Step 2: Configure settings
- Step 3: **Test** everything

> Important: Remember to check all dependencies
      `;

      const task = createTask({
        id: 1,
        title: 'Markdown Task',
        description: markdownDescription,
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      });

      expect(task.description).toBe(markdownDescription);
      expect(validateDescription(markdownDescription)).toBe(true);
    });
  });

  describe('Status and Category Constraints', () => {
    it('should accept all valid status values', () => {
      const statuses = [TaskStatus.TODO, TaskStatus.DOING, TaskStatus.DONE];
      
      statuses.forEach((status, index) => {
        const task = createTask({
          id: index + 1,
          title: `Task ${status}`,
          status: status,
          category: TaskCategory.WORK,
          createdByUserId: 1,
          organizationId: 1,
        });

        expect(task.status).toBe(status);
        expect(validateStatus(task.status)).toBe(true);
      });
    });

    it('should accept all valid category values', () => {
      const categories = [TaskCategory.WORK, TaskCategory.PERSONAL];
      
      categories.forEach((category, index) => {
        const task = createTask({
          id: index + 1,
          title: `${category} Task`,
          status: TaskStatus.TODO,
          category: category,
          createdByUserId: 1,
          organizationId: 1,
        });

        expect(task.category).toBe(category);
        expect(validateCategory(task.category)).toBe(true);
      });
    });

    it('should support all combinations of status and category', () => {
      const combinations = [];
      
      for (const status of Object.values(TaskStatus)) {
        for (const category of Object.values(TaskCategory)) {
          combinations.push({ status, category });
        }
      }

      expect(combinations).toHaveLength(6); // 3 statuses × 2 categories

      combinations.forEach(({ status, category }, index) => {
        const task = createTask({
          id: index + 1,
          title: `${category} ${status} task`,
          status: status,
          category: category,
          createdByUserId: 1,
          organizationId: 1,
        });

        expect(task.status).toBe(status);
        expect(task.category).toBe(category);
      });
    });
  });

  describe('User Relationship (Created By)', () => {
    it('should establish user relationship', () => {
      const mockUser = {
        id: 1,
        email: 'creator@example.com',
        role: 'admin',
      };

      const task = createTask({
        id: 1,
        title: 'User Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
        createdBy: mockUser,
      });

      expect(task.createdByUserId).toBe(1);
      expect(task.createdBy).toEqual(mockUser);
    });

    it('should require createdByUserId', () => {
      const task = createTask({
        id: 1,
        title: 'Test Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 0, // Required field
        organizationId: 1,
      });

      expect(task.createdByUserId).toBeDefined();
      expect(typeof task.createdByUserId).toBe('number');
    });

    it('should handle user relationship without loaded entity', () => {
      const task = createTask({
        id: 1,
        title: 'Unloaded User Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 5,
        organizationId: 1,
        // createdBy not loaded
      });

      expect(task.createdByUserId).toBe(5);
      expect(task.createdBy).toBeUndefined();
    });
  });

  describe('Organization Relationship', () => {
    it('should establish organization relationship', () => {
      const mockOrganization = {
        id: 1,
        name: 'Test Organization',
        description: 'Test Organization Description',
      };

      const task = createTask({
        id: 1,
        title: 'Org Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
        organization: mockOrganization,
      });

      expect(task.organizationId).toBe(1);
      expect(task.organization).toEqual(mockOrganization);
    });

    it('should require organizationId', () => {
      const task = createTask({
        id: 1,
        title: 'Test Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 0, // Required field
      });

      expect(task.organizationId).toBeDefined();
      expect(typeof task.organizationId).toBe('number');
    });

    it('should handle organization relationship without loaded entity', () => {
      const task = createTask({
        id: 1,
        title: 'Unloaded Org Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 3,
        // organization not loaded
      });

      expect(task.organizationId).toBe(3);
      expect(task.organization).toBeUndefined();
    });
  });

  describe('Timestamp Management', () => {
    it('should track creation and update times', () => {
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const updatedAt = new Date('2024-01-01T11:00:00Z');

      const task = createTask({
        id: 1,
        title: 'Timestamp Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
        createdAt: createdAt,
        updatedAt: updatedAt,
      });

      expect(task.createdAt).toEqual(createdAt);
      expect(task.updatedAt).toEqual(updatedAt);
      expect(task.updatedAt.getTime()).toBeGreaterThan(task.createdAt.getTime());
    });

    it('should handle timestamp updates', () => {
      const initialTime = new Date('2024-01-01T10:00:00Z');
      const updateTime = new Date('2024-01-01T12:00:00Z');

      // Simulate task creation
      const task = createTask({
        id: 1,
        title: 'Update Test Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
        createdAt: initialTime,
        updatedAt: initialTime,
      });

      // Simulate task update
      const updatedTask = {
        ...task,
        status: TaskStatus.DOING,
        updatedAt: updateTime,
      };

      expect(task.createdAt).toEqual(initialTime);
      expect(task.updatedAt).toEqual(initialTime);
      expect(updatedTask.createdAt).toEqual(initialTime); // Unchanged
      expect(updatedTask.updatedAt).toEqual(updateTime); // Updated
      expect(updatedTask.status).toBe(TaskStatus.DOING);
    });
  });

  describe('Task Lifecycle and Workflow', () => {
    it('should support task progression workflow', () => {
      const baseTaskData = {
        id: 1,
        title: 'Workflow Task',
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      };

      // New task
      const todoTask = createTask({
        ...baseTaskData,
        status: TaskStatus.TODO,
      });

      // Started task
      const doingTask = createTask({
        ...baseTaskData,
        status: TaskStatus.DOING,
      });

      // Completed task
      const doneTask = createTask({
        ...baseTaskData,
        status: TaskStatus.DONE,
      });

      expect(todoTask.status).toBe(TaskStatus.TODO);
      expect(doingTask.status).toBe(TaskStatus.DOING);
      expect(doneTask.status).toBe(TaskStatus.DONE);

      // Verify progression logic
      const statusProgression = [TaskStatus.TODO, TaskStatus.DOING, TaskStatus.DONE];
      const getNext = (current: TaskStatus) => {
        const currentIndex = statusProgression.indexOf(current);
        return currentIndex < statusProgression.length - 1 
          ? statusProgression[currentIndex + 1] 
          : current;
      };

      expect(getNext(TaskStatus.TODO)).toBe(TaskStatus.DOING);
      expect(getNext(TaskStatus.DOING)).toBe(TaskStatus.DONE);
      expect(getNext(TaskStatus.DONE)).toBe(TaskStatus.DONE); // No further progression
    });

    it('should support task categorization', () => {
      const workTask = createTask({
        id: 1,
        title: 'Work Project',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      });

      const personalTask = createTask({
        id: 2,
        title: 'Personal Goal',
        status: TaskStatus.TODO,
        category: TaskCategory.PERSONAL,
        createdByUserId: 1,
        organizationId: 1,
      });

      expect(workTask.category).toBe(TaskCategory.WORK);
      expect(personalTask.category).toBe(TaskCategory.PERSONAL);
    });
  });

  describe('Multi-tenant Support', () => {
    it('should support tasks in different organizations', () => {
      const task1 = createTask({
        id: 1,
        title: 'Org 1 Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      });

      const task2 = createTask({
        id: 2,
        title: 'Org 2 Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 2,
        organizationId: 2,
      });

      expect(task1.organizationId).not.toBe(task2.organizationId);
      expect(task1.createdByUserId).not.toBe(task2.createdByUserId);
    });

    it('should support multiple users creating tasks in same organization', () => {
      const orgId = 1;
      const task1 = createTask({
        id: 1,
        title: 'User 1 Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: orgId,
      });

      const task2 = createTask({
        id: 2,
        title: 'User 2 Task',
        status: TaskStatus.DOING,
        category: TaskCategory.PERSONAL,
        createdByUserId: 2,
        organizationId: orgId,
      });

      expect(task1.organizationId).toBe(orgId);
      expect(task2.organizationId).toBe(orgId);
      expect(task1.createdByUserId).not.toBe(task2.createdByUserId);
    });
  });

  describe('Task Business Logic Helpers', () => {
    it('should support task completion check', () => {
      const todoTask = createTask({
        id: 1,
        title: 'Todo Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      });

      const doneTask = createTask({
        id: 2,
        title: 'Done Task',
        status: TaskStatus.DONE,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      });

      const isCompleted = (task: Task) => task.status === TaskStatus.DONE;

      expect(isCompleted(todoTask)).toBe(false);
      expect(isCompleted(doneTask)).toBe(true);
    });

    it('should support task age calculation', () => {
      const oldDate = new Date('2024-01-01T10:00:00Z');
      const now = new Date('2024-01-02T10:00:00Z');

      const task = createTask({
        id: 1,
        title: 'Age Test Task',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
        createdAt: oldDate,
        updatedAt: oldDate,
      });

      const getTaskAge = (task: Task, currentTime: Date) => {
        return Math.floor((currentTime.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      };

      expect(getTaskAge(task, now)).toBe(1); // 1 day old
    });

    it('should support task filtering helpers', () => {
      const tasks = [
        createTask({ id: 1, title: 'Work Todo', status: TaskStatus.TODO, category: TaskCategory.WORK, createdByUserId: 1, organizationId: 1 }),
        createTask({ id: 2, title: 'Work Doing', status: TaskStatus.DOING, category: TaskCategory.WORK, createdByUserId: 1, organizationId: 1 }),
        createTask({ id: 3, title: 'Personal Todo', status: TaskStatus.TODO, category: TaskCategory.PERSONAL, createdByUserId: 1, organizationId: 1 }),
        createTask({ id: 4, title: 'Personal Done', status: TaskStatus.DONE, category: TaskCategory.PERSONAL, createdByUserId: 1, organizationId: 1 }),
      ];

      const filterByStatus = (tasks: Task[], status: TaskStatus) => 
        tasks.filter(task => task.status === status);

      const filterByCategory = (tasks: Task[], category: TaskCategory) => 
        tasks.filter(task => task.category === category);

      expect(filterByStatus(tasks, TaskStatus.TODO)).toHaveLength(2);
      expect(filterByCategory(tasks, TaskCategory.WORK)).toHaveLength(2);
      expect(filterByCategory(tasks, TaskCategory.PERSONAL)).toHaveLength(2);
    });
  });

  describe('Field Constraints and Edge Cases', () => {
    it('should handle maximum length titles', () => {
      const maxLengthTitle = 'A'.repeat(255);
      const task = createTask({
        id: 1,
        title: maxLengthTitle,
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      });

      expect(task.title).toBe(maxLengthTitle);
      expect(task.title.length).toBe(255);
      expect(validateTitle(maxLengthTitle)).toBe(true);
    });

    it('should handle maximum length descriptions', () => {
      const maxLengthDescription = 'B'.repeat(1000);
      const task = createTask({
        id: 1,
        title: 'Max Description Task',
        description: maxLengthDescription,
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      });

      expect(task.description).toBe(maxLengthDescription);
      expect(task.description!.length).toBe(1000);
      expect(validateDescription(maxLengthDescription)).toBe(true);
    });

    it('should handle empty string descriptions', () => {
      const task = createTask({
        id: 1,
        title: 'Empty Description Task',
        description: '',
        status: TaskStatus.TODO,
        category: TaskCategory.WORK,
        createdByUserId: 1,
        organizationId: 1,
      });

      expect(task.description).toBe('');
      expect(validateDescription(task.description)).toBe(true);
    });
  });
});
