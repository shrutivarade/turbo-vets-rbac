import { Controller, Get, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PolicyGuard } from '../auth/policy.guard';
import { Policy } from '../auth/policy.decorators';
import { AuditPolicies } from '../auth/policy-helpers';
import { AuditLogQueryDto, AuditLogSummaryDto, AuditLogStatsDto } from '../interfaces/audit-log.dto';
import { RbacUser } from '@rbac-workspace/auth';

/**
 * Audit Controller
 * 
 * Provides endpoints for accessing audit logs and statistics.
 * All endpoints require admin or owner permissions.
 * 
 * @security JWT Bearer Token + Admin/Owner role required
 */
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Get Audit Logs
   * 
   * @route GET /audit/logs
   * @description Retrieve audit logs with optional filtering
   * @access Admin and Owner roles only
   * @security JWT Bearer Token + Policy Guard
   * @rbac Audit log view permission required
   * @param query - Query parameters for filtering audit logs
   * @returns {Object} Paginated list of audit logs
   * 
   * @example
   * GET /audit/logs?action=login&result=success&limit=10
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "logs": [...], "total": 100, "limit": 10, "offset": 0 }
   */
  @Get('logs')
  @UseGuards(PolicyGuard)
  @Policy(AuditPolicies.canViewAuditLogs())
  async getAuditLogs(@Query() query: AuditLogQueryDto, @Request() req: any) {
    try {
      // Validate query parameters
      if (query.limit && (query.limit < 1 || query.limit > 100)) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }
      if (query.offset && query.offset < 0) {
        throw new BadRequestException('Offset must be non-negative');
      }

      // Set default values
      const limit = query.limit || 50;
      const offset = query.offset || 0;

      // Get audit logs
      const logs = await this.auditService.getAuditLogs({
        ...query,
        limit,
        offset,
        // Scope to user's organization if not admin
        organizationId: this.shouldScopeToOrganization(req.user) ? req.user.organizationId : query.organizationId,
      });

      return {
        logs,
        total: logs.length,
        limit,
        offset,
        hasMore: logs.length === limit,
        user: {
          id: req.user?.id,
          email: req.user?.email,
          role: req.user?.role,
          organizationId: req.user?.organizationId,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Audit Log Summary
   * 
   * @route GET /audit/summary
   * @description Get summary statistics for audit logs
   * @access Admin and Owner roles only
   * @security JWT Bearer Token + Policy Guard
   * @rbac Audit log view permission required
   * @param days - Number of days to look back (default: 7)
   * @returns {AuditLogSummaryDto} Audit log summary with statistics
   * 
   * @example
   * GET /audit/summary?days=30
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "totalLogs": 1500, "successCount": 1200, "failureCount": 300, ... }
   */
  @Get('summary')
  @UseGuards(PolicyGuard)
  @Policy(AuditPolicies.canViewAuditLogs())
  async getAuditSummary(
    @Query('days') days: string = '7',
    @Request() req: any
  ): Promise<AuditLogSummaryDto> {
    try {
      const daysNumber = parseInt(days);
      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
        throw new BadRequestException('Days must be a number between 1 and 365');
      }

      const organizationId = this.shouldScopeToOrganization(req.user) 
        ? req.user.organizationId 
        : undefined;

      return await this.auditService.getAuditSummary(organizationId, daysNumber);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Audit Log Statistics
   * 
   * @route GET /audit/stats
   * @description Get detailed statistics for audit logs
   * @access Admin and Owner roles only
   * @security JWT Bearer Token + Policy Guard
   * @rbac Audit log view permission required
   * @param days - Number of days to look back (default: 7)
   * @returns {AuditLogStatsDto} Detailed audit log statistics
   * 
   * @example
   * GET /audit/stats?days=14
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "period": "14 days", "totalActions": 2000, "successRate": 85.5, ... }
   */
  @Get('stats')
  @UseGuards(PolicyGuard)
  @Policy(AuditPolicies.canViewAuditLogs())
  async getAuditStats(
    @Query('days') days: string = '7',
    @Request() req: any
  ): Promise<AuditLogStatsDto> {
    try {
      const daysNumber = parseInt(days);
      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
        throw new BadRequestException('Days must be a number between 1 and 365');
      }

      const organizationId = this.shouldScopeToOrganization(req.user) 
        ? req.user.organizationId 
        : undefined;

      return await this.auditService.getAuditStats(organizationId, daysNumber);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Recent Activity
   * 
   * @route GET /audit/recent
   * @description Get recent audit log activity
   * @access Admin and Owner roles only
   * @security JWT Bearer Token + Policy Guard
   * @rbac Audit log view permission required
   * @param limit - Number of recent entries to return (default: 20)
   * @returns {Object} Recent audit log entries
   * 
   * @example
   * GET /audit/recent?limit=10
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "recentActivity": [...], "total": 10 }
   */
  @Get('recent')
  @UseGuards(PolicyGuard)
  @Policy(AuditPolicies.canViewAuditLogs())
  async getRecentActivity(
    @Query('limit') limit: string = '20',
    @Request() req: any
  ) {
    try {
      const limitNumber = parseInt(limit);
      if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
        throw new BadRequestException('Limit must be a number between 1 and 100');
      }

      const organizationId = this.shouldScopeToOrganization(req.user) 
        ? req.user.organizationId 
        : undefined;

      const logs = await this.auditService.getAuditLogs({
        organizationId,
        limit: limitNumber,
        offset: 0,
      });

      return {
        recentActivity: logs,
        total: logs.length,
        limit: limitNumber,
        user: {
          id: req.user?.id,
          email: req.user?.email,
          role: req.user?.role,
          organizationId: req.user?.organizationId,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Audit Log Health
   * 
   * @route GET /audit/health
   * @description Get audit logging system health status
   * @access Admin and Owner roles only
   * @security JWT Bearer Token + Policy Guard
   * @rbac Audit log view permission required
   * @returns {Object} Audit system health information
   * 
   * @example
   * GET /audit/health
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "status": "healthy", "totalLogs": 5000, "lastLogTime": "2025-09-18T21:00:00Z", ... }
   */
  @Get('health')
  @UseGuards(PolicyGuard)
  @Policy(AuditPolicies.canViewAuditLogs())
  async getAuditHealth(@Request() req: any) {
    try {
      // Get basic audit log counts
      const totalLogs = await this.auditService.getAuditLogs({ limit: 1 });
      const recentLogs = await this.auditService.getAuditLogs({ 
        limit: 1,
        organizationId: this.shouldScopeToOrganization(req.user) ? req.user.organizationId : undefined,
      });

      const lastLogTime = recentLogs.length > 0 ? recentLogs[0].timestamp : null;
      const timeSinceLastLog = lastLogTime 
        ? Date.now() - lastLogTime.getTime() 
        : null;

      return {
        status: 'healthy',
        totalLogs: totalLogs.length,
        lastLogTime: lastLogTime?.toISOString(),
        timeSinceLastLogMs: timeSinceLastLog,
        timeSinceLastLogMinutes: timeSinceLastLog ? Math.round(timeSinceLastLog / 60000) : null,
        user: {
          id: req.user?.id,
          email: req.user?.email,
          role: req.user?.role,
          organizationId: req.user?.organizationId,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Determine if audit logs should be scoped to user's organization
   */
  private shouldScopeToOrganization(user: RbacUser): boolean {
    // Only scope to organization if user is not a system admin
    // In a real system, you might have a global admin role
    return user.role !== 'system_admin'; // Assuming system_admin can see all orgs
  }
}
