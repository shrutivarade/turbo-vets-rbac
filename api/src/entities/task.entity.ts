import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Define enums locally to avoid import issues
export enum TaskStatus {
  TODO = 'todo',
  DOING = 'doing',
  DONE = 'done'
}

export enum TaskCategory {
  WORK = 'work',
  PERSONAL = 'personal'
}

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;
  
  @Column()
  title!: string;
  
  @Column({ type: 'text', nullable: true })
  description?: string;
  
  @Column({ type: 'simple-enum', enum: TaskStatus })
  status!: TaskStatus;
  
  @Column({ type: 'simple-enum', enum: TaskCategory })
  category!: TaskCategory;
  
  @ManyToOne('User', 'tasks')
  createdBy?: any;
  
  @Column()
  createdByUserId!: number;
  
  @ManyToOne('Organization', 'tasks') 
  organization?: any;
  
  @Column()
  organizationId!: number;
  
  @CreateDateColumn()
  createdAt!: Date;
  
  @UpdateDateColumn()
  updatedAt!: Date;
}