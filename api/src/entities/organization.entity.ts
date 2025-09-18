import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn()
  id!: number;
  
  @Column({ unique: true })
  name!: string;
  
  @OneToMany('User', 'organization')
  users?: any[];
  
  @OneToMany('Task', 'organization')
  tasks?: any[];
}