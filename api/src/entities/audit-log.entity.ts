import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

/**
 * Audit Log Action Types
 */
export enum AuditAction {
  // Authentication actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  
  // Task actions
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  TASK_VIEWED = 'task_viewed',
  
  // User actions
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  
  // Organization actions
  ORG_CREATED = 'org_created',
  ORG_UPDATED = 'org_updated',
  ORG_DELETED = 'org_deleted',
  
  // System actions
  SYSTEM_ERROR = 'system_error',
  ACCESS_DENIED = 'access_denied',
  PERMISSION_CHECK = 'permission_check',
  
  // Generic actions
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list'
}

/**
 * Audit Log Result Types
 */
export enum AuditResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  ERROR = 'error',
  DENIED = 'denied'
}

/**
 * Audit Log Entity
 * 
 * Stores audit trail information for all system actions including:
 * - User actions (login, logout, CRUD operations)
 * - System events (errors, access denials)
 * - Resource access (who accessed what, when)
 * - Permission checks (what was allowed/denied)
 */
@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * The action that was performed
   */
  @Column({ type: 'simple-enum', enum: AuditAction })
  action!: AuditAction;

  /**
   * The result of the action (success, failure, error, denied)
   */
  @Column({ type: 'simple-enum', enum: AuditResult })
  result!: AuditResult;

  /**
   * The user who performed the action (null for system actions)
   */
  @ManyToOne('User', 'auditLogs')
  user?: User;

  @Column({ nullable: true })
  userId?: number;

  /**
   * The organization context of the action
   */
  @Column({ nullable: true })
  organizationId?: number;

  /**
   * The resource that was acted upon (e.g., 'task', 'user', 'organization')
   */
  @Column({ nullable: true })
  resourceType?: string;

  /**
   * The ID of the specific resource that was acted upon
   */
  @Column({ nullable: true })
  resourceId?: number;

  /**
   * HTTP method used (GET, POST, PUT, DELETE)
   */
  @Column({ nullable: true })
  httpMethod?: string;

  /**
   * The endpoint/route that was accessed
   */
  @Column({ nullable: true })
  endpoint?: string;

  /**
   * IP address of the requester
   */
  @Column({ nullable: true })
  ipAddress?: string;

  /**
   * User agent string from the request
   */
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  /**
   * Additional details about the action (JSON string)
   */
  @Column({ type: 'text', nullable: true })
  details?: string;

  /**
   * Error message if the action failed
   */
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  /**
   * Request duration in milliseconds
   */
  @Column({ nullable: true })
  duration?: number;

  /**
   * Timestamp when the action occurred
   */
  @CreateDateColumn()
  timestamp!: Date;

  /**
   * Additional metadata (JSON string)
   */
  @Column({ type: 'text', nullable: true })
  metadata?: string;
}
