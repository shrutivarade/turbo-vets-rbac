import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';

// Define Role enum locally to avoid import issues
export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  VIEWER = 'viewer'
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;
  
  @Column({ unique: true })
  email!: string;
  
  @Column()
  passwordHash!: string;
  
  @Column({ type: 'simple-enum', enum: Role })
  role!: Role;
  
  @ManyToOne('Organization', 'users')
  organization?: any;
  
  @Column()
  organizationId!: number;
  
  @OneToMany('Task', 'createdBy')
  tasks?: any[];
}