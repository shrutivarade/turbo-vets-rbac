import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditAction, AuditResult } from '../entities/audit-log.entity';
import { RbacUser } from '@rbac-workspace/auth';

/**
 * Audit Interceptor
 * 
 * Automatically logs all HTTP requests and responses to the audit system.
 * This interceptor captures:
 * - Request details (method, endpoint, user, IP)
 * - Response status and duration
 * - Error information
 * - Permission checks and access denials
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  /**
   * Intercept HTTP requests and log audit information
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Extract request information
    const httpMethod = request.method;
    const endpoint = request.url;
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];
    const user: RbacUser | undefined = request.user;

    // Skip logging for certain endpoints
    if (this.shouldSkipLogging(endpoint)) {
      return next.handle();
    }

    this.logger.debug(`[AUDIT INTERCEPTOR] ${httpMethod} ${endpoint} - User: ${user?.email || 'Anonymous'}`);

    return next.handle().pipe(
      tap(async (data) => {
        // Log successful request
        const duration = Date.now() - startTime;
        const result = this.getResultFromStatusCode(response.statusCode);

        await this.auditService.logHttpRequest(
          httpMethod,
          endpoint,
          result,
          user,
          duration,
          ipAddress,
          userAgent
        );

        // Log specific actions based on endpoint
        await this.logSpecificAction(endpoint, httpMethod, user, result, duration);
      }),
      catchError(async (error) => {
        // Log failed request
        const duration = Date.now() - startTime;
        const result = this.getResultFromError(error);

        await this.auditService.logHttpRequest(
          httpMethod,
          endpoint,
          result,
          user,
          duration,
          ipAddress,
          userAgent
        );

        // Log error details
        await this.auditService.logSystemEvent(
          AuditAction.SYSTEM_ERROR,
          AuditResult.ERROR,
          `Error in ${httpMethod} ${endpoint}: ${error.message}`,
          error.message
        );

        throw error;
      })
    );
  }

  /**
   * Log specific actions based on endpoint patterns
   */
  private async logSpecificAction(
    endpoint: string,
    httpMethod: string,
    user: RbacUser | undefined,
    result: AuditResult,
    duration: number
  ): Promise<void> {
    if (!user) return;

    // Authentication actions
    if (endpoint.includes('/auth/login')) {
      await this.auditService.logUserAction(
        result === AuditResult.SUCCESS ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
        result,
        user,
        `Login attempt from ${endpoint}`
      );
    }

    // Task actions
    if (endpoint.includes('/tasks')) {
      const action = this.getTaskActionFromMethod(httpMethod);
      const resourceId = this.extractResourceId(endpoint);
      
      await this.auditService.logUserAction(
        action,
        result,
        user,
        `${httpMethod} request to ${endpoint}`,
        'task',
        resourceId
      );
    }

    // Admin actions
    if (endpoint.includes('/admin') || endpoint.includes('/owner')) {
      await this.auditService.logUserAction(
        AuditAction.PERMISSION_CHECK,
        result,
        user,
        `Admin/Owner action: ${httpMethod} ${endpoint}`
      );
    }

    // Audit log access
    if (endpoint.includes('/audit')) {
      await this.auditService.logUserAction(
        AuditAction.READ,
        result,
        user,
        `Audit log access: ${httpMethod} ${endpoint}`,
        'audit_log'
      );
    }
  }

  /**
   * Determine if logging should be skipped for this endpoint
   */
  private shouldSkipLogging(endpoint: string): boolean {
    const skipPatterns = [
      '/health',
      '/metrics',
      '/favicon.ico',
      '/auth/test', // Skip auth test endpoint
    ];

    return skipPatterns.some(pattern => endpoint.includes(pattern));
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  /**
   * Get result from HTTP status code
   */
  private getResultFromStatusCode(statusCode: number): AuditResult {
    if (statusCode >= 200 && statusCode < 300) {
      return AuditResult.SUCCESS;
    } else if (statusCode >= 400 && statusCode < 500) {
      return AuditResult.DENIED;
    } else if (statusCode >= 500) {
      return AuditResult.ERROR;
    } else {
      return AuditResult.FAILURE;
    }
  }

  /**
   * Get result from error
   */
  private getResultFromError(error: any): AuditResult {
    if (error.status === 403 || error.statusCode === 403) {
      return AuditResult.DENIED;
    } else if (error.status === 401 || error.statusCode === 401) {
      return AuditResult.DENIED;
    } else if (error.status >= 500 || error.statusCode >= 500) {
      return AuditResult.ERROR;
    } else {
      return AuditResult.FAILURE;
    }
  }

  /**
   * Get task action from HTTP method
   */
  private getTaskActionFromMethod(httpMethod: string): AuditAction {
    switch (httpMethod.toUpperCase()) {
      case 'GET': return AuditAction.TASK_VIEWED;
      case 'POST': return AuditAction.TASK_CREATED;
      case 'PUT':
      case 'PATCH': return AuditAction.TASK_UPDATED;
      case 'DELETE': return AuditAction.TASK_DELETED;
      default: return AuditAction.READ;
    }
  }

  /**
   * Extract resource ID from endpoint
   */
  private extractResourceId(endpoint: string): number | undefined {
    const match = endpoint.match(/\/(\d+)(?:\/|$)/);
    return match ? parseInt(match[1]) : undefined;
  }
}
