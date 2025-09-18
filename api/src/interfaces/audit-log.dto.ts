import { AuditAction, AuditResult } from '../entities/audit-log.entity';

/**
 * Audit Log DTO for API responses
 */
export interface AuditLogDto {
  id: number;
  action: AuditAction;
  result: AuditResult;
  userId?: number;
  organizationId?: number;
  resourceType?: string;
  resourceId?: number;
  httpMethod?: string;
  endpoint?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  errorMessage?: string;
  duration?: number;
  timestamp: Date;
  metadata?: string;
}

/**
 * Create Audit Log DTO for logging new events
 */
export interface CreateAuditLogDto {
  action: AuditAction;
  result: AuditResult;
  userId?: number;
  organizationId?: number;
  resourceType?: string;
  resourceId?: number;
  httpMethod?: string;
  endpoint?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  errorMessage?: string;
  duration?: number;
  metadata?: string;
}

/**
 * Audit Log Query DTO for filtering audit logs
 */
export interface AuditLogQueryDto {
  action?: AuditAction;
  result?: AuditResult;
  userId?: number;
  organizationId?: number;
  resourceType?: string;
  resourceId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit Log Summary DTO for aggregated data
 */
export interface AuditLogSummaryDto {
  totalLogs: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  deniedCount: number;
  topActions: Array<{
    action: AuditAction;
    count: number;
  }>;
  topUsers: Array<{
    userId: number;
    email: string;
    count: number;
  }>;
  recentActivity: AuditLogDto[];
}

/**
 * Audit Log Statistics DTO
 */
export interface AuditLogStatsDto {
  period: string;
  totalActions: number;
  successRate: number;
  errorRate: number;
  deniedRate: number;
  averageResponseTime: number;
  mostActiveUser: {
    userId: number;
    email: string;
    actionCount: number;
  };
  mostAccessedResource: {
    resourceType: string;
    count: number;
  };
  hourlyDistribution: Array<{
    hour: number;
    count: number;
  }>;
}
