import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditResult } from '../entities/audit-log.entity';
import { CreateAuditLogDto, AuditLogQueryDto, AuditLogSummaryDto, AuditLogStatsDto } from '../interfaces/audit-log.dto';
import { RbacUser } from '@rbac-workspace/auth';

/**
 * Audit Service
 * 
 * Handles all audit logging operations including:
 * - Logging user actions and system events
 * - Querying audit logs with filtering
 * - Generating audit summaries and statistics
 * - Console and file logging capabilities
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Log an audit event
   * 
   * @param auditData - The audit log data
   * @param user - The user performing the action (optional)
   * @returns Promise<AuditLog> - The created audit log entry
   */
  async log(auditData: CreateAuditLogDto, user?: RbacUser): Promise<AuditLog> {
    try {
      // Create audit log entry
      const auditLog = this.auditLogRepository.create({
        ...auditData,
        userId: user?.id || auditData.userId,
        organizationId: user?.organizationId || auditData.organizationId,
      });

      // Save to database
      const savedLog = await this.auditLogRepository.save(auditLog);

      // Log to console for development
      this.logToConsole(savedLog, user);

      // Log to file in production
      await this.logToFile(savedLog, user);

      return savedLog;
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      throw error;
    }
  }

  /**
   * Log a user action
   * 
   * @param action - The action performed
   * @param result - The result of the action
   * @param user - The user performing the action
   * @param details - Additional details
   * @param resourceType - Type of resource acted upon
   * @param resourceId - ID of resource acted upon
   */
  async logUserAction(
    action: AuditAction,
    result: AuditResult,
    user: RbacUser,
    details?: string,
    resourceType?: string,
    resourceId?: number
  ): Promise<AuditLog> {
    return this.log({
      action,
      result,
      userId: user.id,
      organizationId: user.organizationId,
      resourceType,
      resourceId,
      details,
    }, user);
  }

  /**
   * Log a system event
   * 
   * @param action - The system action
   * @param result - The result of the action
   * @param details - Additional details
   * @param errorMessage - Error message if applicable
   */
  async logSystemEvent(
    action: AuditAction,
    result: AuditResult,
    details?: string,
    errorMessage?: string
  ): Promise<AuditLog> {
    return this.log({
      action,
      result,
      details,
      errorMessage,
    });
  }

  /**
   * Log an HTTP request
   * 
   * @param httpMethod - HTTP method (GET, POST, etc.)
   * @param endpoint - The endpoint accessed
   * @param result - The result of the request
   * @param user - The user making the request
   * @param duration - Request duration in milliseconds
   * @param ipAddress - IP address of the requester
   * @param userAgent - User agent string
   */
  async logHttpRequest(
    httpMethod: string,
    endpoint: string,
    result: AuditResult,
    user?: RbacUser,
    duration?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    return this.log({
      action: this.getActionFromHttpMethod(httpMethod),
      result,
      userId: user?.id,
      organizationId: user?.organizationId,
      httpMethod,
      endpoint,
      duration,
      ipAddress,
      userAgent,
    }, user);
  }

  /**
   * Log a permission check
   * 
   * @param action - The action being checked
   * @param result - Whether permission was granted
   * @param user - The user being checked
   * @param resourceType - Type of resource
   * @param resourceId - ID of resource
   */
  async logPermissionCheck(
    action: string,
    result: boolean,
    user: RbacUser,
    resourceType?: string,
    resourceId?: number
  ): Promise<AuditLog> {
    return this.log({
      action: AuditAction.PERMISSION_CHECK,
      result: result ? AuditResult.SUCCESS : AuditResult.DENIED,
      userId: user.id,
      organizationId: user.organizationId,
      resourceType,
      resourceId,
      details: `Permission check for '${action}' on ${resourceType || 'resource'} ${resourceId || ''}`,
    }, user);
  }

  /**
   * Get audit logs with filtering
   * 
   * @param query - Query parameters for filtering
   * @returns Promise<AuditLog[]> - Filtered audit logs
   */
  async getAuditLogs(query: AuditLogQueryDto): Promise<AuditLog[]> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    // Apply filters
    if (query.action) {
      queryBuilder.andWhere('audit.action = :action', { action: query.action });
    }
    if (query.result) {
      queryBuilder.andWhere('audit.result = :result', { result: query.result });
    }
    if (query.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: query.userId });
    }
    if (query.organizationId) {
      queryBuilder.andWhere('audit.organizationId = :organizationId', { organizationId: query.organizationId });
    }
    if (query.resourceType) {
      queryBuilder.andWhere('audit.resourceType = :resourceType', { resourceType: query.resourceType });
    }
    if (query.resourceId) {
      queryBuilder.andWhere('audit.resourceId = :resourceId', { resourceId: query.resourceId });
    }
    if (query.startDate) {
      queryBuilder.andWhere('audit.timestamp >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      queryBuilder.andWhere('audit.timestamp <= :endDate', { endDate: query.endDate });
    }

    // Apply pagination
    if (query.limit) {
      queryBuilder.limit(query.limit);
    }
    if (query.offset) {
      queryBuilder.offset(query.offset);
    }

    // Order by timestamp (newest first)
    queryBuilder.orderBy('audit.timestamp', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Get audit log summary
   * 
   * @param organizationId - Organization ID to filter by
   * @param days - Number of days to look back
   * @returns Promise<AuditLogSummaryDto> - Audit log summary
   */
  async getAuditSummary(organizationId?: number, days: number = 7): Promise<AuditLogSummaryDto> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
      .where('audit.timestamp >= :startDate', { startDate });

    if (organizationId) {
      queryBuilder.andWhere('audit.organizationId = :organizationId', { organizationId });
    }

    const logs = await queryBuilder.getMany();

    // Calculate summary statistics
    const totalLogs = logs.length;
    const successCount = logs.filter(log => log.result === AuditResult.SUCCESS).length;
    const failureCount = logs.filter(log => log.result === AuditResult.FAILURE).length;
    const errorCount = logs.filter(log => log.result === AuditResult.ERROR).length;
    const deniedCount = logs.filter(log => log.result === AuditResult.DENIED).length;

    // Get top actions
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action: action as AuditAction, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get top users
    const userCounts = logs
      .filter(log => log.userId)
      .reduce((acc, log) => {
        acc[log.userId!] = (acc[log.userId!] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId: parseInt(userId), email: 'Unknown', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent activity (last 10)
    const recentActivity = logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map(log => this.mapToDto(log));

    return {
      totalLogs,
      successCount,
      failureCount,
      errorCount,
      deniedCount,
      topActions,
      topUsers,
      recentActivity,
    };
  }

  /**
   * Get audit log statistics
   * 
   * @param organizationId - Organization ID to filter by
   * @param days - Number of days to look back
   * @returns Promise<AuditLogStatsDto> - Audit log statistics
   */
  async getAuditStats(organizationId?: number, days: number = 7): Promise<AuditLogStatsDto> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
      .where('audit.timestamp >= :startDate', { startDate });

    if (organizationId) {
      queryBuilder.andWhere('audit.organizationId = :organizationId', { organizationId });
    }

    const logs = await queryBuilder.getMany();

    const totalActions = logs.length;
    const successCount = logs.filter(log => log.result === AuditResult.SUCCESS).length;
    const errorCount = logs.filter(log => log.result === AuditResult.ERROR).length;
    const deniedCount = logs.filter(log => log.result === AuditResult.DENIED).length;

    const successRate = totalActions > 0 ? (successCount / totalActions) * 100 : 0;
    const errorRate = totalActions > 0 ? (errorCount / totalActions) * 100 : 0;
    const deniedRate = totalActions > 0 ? (deniedCount / totalActions) * 100 : 0;

    const responseTimes = logs.filter(log => log.duration).map(log => log.duration!);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Get most active user
    const userCounts = logs
      .filter(log => log.userId)
      .reduce((acc, log) => {
        acc[log.userId!] = (acc[log.userId!] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

    const mostActiveUser = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId: parseInt(userId), email: 'Unknown', count }))
      .sort((a, b) => b.count - a.count)[0] || { userId: 0, email: 'None', count: 0 };

    // Get most accessed resource
    const resourceCounts = logs
      .filter(log => log.resourceType)
      .reduce((acc, log) => {
        acc[log.resourceType!] = (acc[log.resourceType!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const mostAccessedResource = Object.entries(resourceCounts)
      .map(([resourceType, count]) => ({ resourceType, count }))
      .sort((a, b) => b.count - a.count)[0] || { resourceType: 'None', count: 0 };

    // Get hourly distribution
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
      const count = logs.filter(log => log.timestamp.getHours() === hour).length;
      return { hour, count };
    });

    return {
      period: `${days} days`,
      totalActions,
      successRate,
      errorRate,
      deniedRate,
      averageResponseTime,
      mostActiveUser,
      mostAccessedResource,
      hourlyDistribution,
    };
  }

  /**
   * Log to console for development
   */
  private logToConsole(auditLog: AuditLog, user?: RbacUser): void {
    const logMessage = `[AUDIT] ${auditLog.action} | ${auditLog.result} | User: ${user?.email || 'System'} | Org: ${auditLog.organizationId || 'N/A'} | Resource: ${auditLog.resourceType || 'N/A'} | ${auditLog.timestamp.toISOString()}`;
    
    if (auditLog.result === AuditResult.ERROR || auditLog.result === AuditResult.DENIED) {
      this.logger.warn(logMessage);
    } else {
      this.logger.log(logMessage);
    }
  }

  /**
   * Log to file for production
   */
  private async logToFile(auditLog: AuditLog, user?: RbacUser): Promise<void> {
    // In a real implementation, you would write to a log file
    // For now, we'll just log to console with file format
    const logEntry = {
      timestamp: auditLog.timestamp.toISOString(),
      action: auditLog.action,
      result: auditLog.result,
      user: user?.email || 'System',
      organizationId: auditLog.organizationId,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      endpoint: auditLog.endpoint,
      ipAddress: auditLog.ipAddress,
      details: auditLog.details,
      errorMessage: auditLog.errorMessage,
    };

    this.logger.debug(`[AUDIT FILE] ${JSON.stringify(logEntry)}`);
  }

  /**
   * Get action from HTTP method
   */
  private getActionFromHttpMethod(httpMethod: string): AuditAction {
    switch (httpMethod.toUpperCase()) {
      case 'GET': return AuditAction.READ;
      case 'POST': return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH': return AuditAction.UPDATE;
      case 'DELETE': return AuditAction.DELETE;
      default: return AuditAction.READ;
    }
  }

  /**
   * Map entity to DTO
   */
  private mapToDto(auditLog: AuditLog): any {
    return {
      id: auditLog.id,
      action: auditLog.action,
      result: auditLog.result,
      userId: auditLog.userId,
      organizationId: auditLog.organizationId,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      httpMethod: auditLog.httpMethod,
      endpoint: auditLog.endpoint,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      details: auditLog.details,
      errorMessage: auditLog.errorMessage,
      duration: auditLog.duration,
      timestamp: auditLog.timestamp,
      metadata: auditLog.metadata,
    };
  }
}
