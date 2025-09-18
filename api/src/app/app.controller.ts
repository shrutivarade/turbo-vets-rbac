import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { PolicyGuard } from '../auth/policy.guard';
import { Policy, RequireRole, AdminOnly, OwnerOnly } from '../auth/policy.decorators';
import { TaskPolicies, AuditPolicies } from '../auth/policy-helpers';
import { Role } from '@rbac-workspace/data';

/**
 * Main API Controller
 * 
 * This controller provides the core API endpoints for the Secure Task Management System.
 * All endpoints (except health check) require JWT authentication and are protected by
 * the global JwtAuthGuard.
 * 
 * @security JWT Bearer Token required for all endpoints except GET /
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health Check Endpoint
   * 
   * @route GET /
   * @description Basic health check endpoint to verify API is running
   * @access Public (no authentication required)
   * @returns {Object} Simple status message
   * 
   * @example
   * GET /
   * Response: { "message": "Hello API" }
   */
  @Get()
  getData() {
    return this.appService.getData();
  }

  /**
   * Protected Data Endpoint
   * 
   * @route GET /protected
   * @description Demonstrates JWT authentication and user context extraction
   * @access Authenticated users only
   * @security JWT Bearer Token required
   * @returns {Object} User information and protected data
   * 
   * @example
   * GET /protected
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "message": "This is protected data!", "user": {...}, "timestamp": "..." }
   */
  @Get('protected')
  getProtectedData(@Request() req: any) {
    return { 
      message: 'This is protected data!', 
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Tasks List Endpoint (Demo)
   * 
   * @route GET /tasks
   * @description Demonstrates organization-scoped data access and RBAC principles
   * @access All authenticated users (Owner, Admin, Viewer)
   * @security JWT Bearer Token required
   * @rbac All roles can read tasks within their organization
   * @returns {Object} Organization-scoped task query simulation
   * 
   * @example
   * GET /tasks
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "message": "Tasks endpoint - organization scoped", "query": "SELECT * FROM task WHERE organizationId = 1", ... }
   */
  @Get('tasks')
  async getTasks(@Request() req: any) {
    // Simulate what a real task query would look like with organization scoping
    const userOrgId = req.user?.organizationId;
    
    return {
      message: 'Tasks endpoint - organization scoped',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      },
      query: `SELECT * FROM task WHERE organizationId = ${userOrgId}`,
      note: `This user can ONLY see tasks from organization ${userOrgId}`,
      security: 'Cross-organization access is BLOCKED by design',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * RBAC Policy Test Endpoint
   * 
   * @route GET /rbac-test
   * @description Tests and demonstrates RBAC policy evaluation with real user context
   * @access All authenticated users (Owner, Admin, Viewer)
   * @security JWT Bearer Token required
   * @rbac Demonstrates role-based access control policies
   * @returns {Object} RBAC policy test results and user context
   * 
   * @example
   * GET /rbac-test
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "message": "RBAC Policy Test Results", "user": {...}, "timestamp": "..." }
   */
  @Get('rbac-test')
  testRbacPolicies(@Request() req: any) {
    try {
      const user = {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      };

      return {
        message: 'RBAC Policy Test Results',
        user: user,
        timestamp: new Date().toISOString()
      };
           } catch (error: any) {
             return {
               error: error.message,
               user: req.user,
               timestamp: new Date().toISOString()
             };
           }
  }

  // Example endpoints demonstrating policy guards and decorators

  /**
   * Admin Only Endpoint
   * 
   * @route GET /admin-only
   * @description Demonstrates admin/owner only access using policy decorators
   * @access Admin and Owner roles only
   * @security JWT Bearer Token + Policy Guard
   * @rbac Admin or Owner role required
   * @returns {Object} Admin-only data and user context
   * 
   * @example
   * GET /admin-only
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "message": "Admin-only endpoint", "user": {...}, "timestamp": "..." }
   */
  @Get('admin-only')
  @UseGuards(PolicyGuard)
  @AdminOnly()
  adminOnlyEndpoint(@Request() req: any) {
    return {
      message: 'This endpoint is only accessible to admins and owners',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Owner Only Endpoint
   * 
   * @route GET /owner-only
   * @description Demonstrates owner-only access using policy decorators
   * @access Owner role only
   * @security JWT Bearer Token + Policy Guard
   * @rbac Owner role required
   * @returns {Object} Owner-only data and user context
   * 
   * @example
   * GET /owner-only
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "message": "Owner-only endpoint", "user": {...}, "timestamp": "..." }
   */
  @Get('owner-only')
  @UseGuards(PolicyGuard)
  @OwnerOnly()
  ownerOnlyEndpoint(@Request() req: any) {
    return {
      message: 'This endpoint is only accessible to owners',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Task Read Permission Demo
   * 
   * @route GET /task-read-demo
   * @description Demonstrates task read permission using policy helpers
   * @access All authenticated users (Owner, Admin, Viewer)
   * @security JWT Bearer Token + Policy Guard
   * @rbac Task read permission required
   * @returns {Object} Task read demo data
   * 
   * @example
   * GET /task-read-demo
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "message": "Task read permission granted", "user": {...}, "timestamp": "..." }
   */
  @Get('task-read-demo')
  @UseGuards(PolicyGuard)
  @Policy(TaskPolicies.canReadTasks())
  taskReadDemo(@Request() req: any) {
    return {
      message: 'Task read permission granted - you can read tasks in your organization',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      },
      permission: 'canReadTasks',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Task Create Permission Demo
   * 
   * @route GET /task-create-demo
   * @description Demonstrates task create permission (Admin/Owner only)
   * @access Admin and Owner roles only
   * @security JWT Bearer Token + Policy Guard
   * @rbac Task create permission required
   * @returns {Object} Task create demo data
   * 
   * @example
   * GET /task-create-demo
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "message": "Task create permission granted", "user": {...}, "timestamp": "..." }
   */
  @Get('task-create-demo')
  @UseGuards(PolicyGuard)
  @Policy(TaskPolicies.canCreateTask())
  taskCreateDemo(@Request() req: any) {
    return {
      message: 'Task create permission granted - you can create tasks in your organization',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      },
      permission: 'canCreateTask',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Audit Log Permission Demo
   * 
   * @route GET /audit-log-demo
   * @description Demonstrates audit log viewing permission (Admin/Owner only)
   * @access Admin and Owner roles only
   * @security JWT Bearer Token + Policy Guard
   * @rbac Audit log view permission required
   * @returns {Object} Audit log demo data
   * 
   * @example
   * GET /audit-log-demo
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "message": "Audit log permission granted", "user": {...}, "timestamp": "..." }
   */
  @Get('audit-log-demo')
  @UseGuards(PolicyGuard)
  @Policy(AuditPolicies.canViewAuditLogs())
  auditLogDemo(@Request() req: any) {
    return {
      message: 'Audit log permission granted - you can view audit logs',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      },
      permission: 'canViewAuditLogs',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Custom Role Policy Demo
   * 
   * @route GET /custom-role-demo
   * @description Demonstrates custom role-based policy using RequireRole decorator
   * @access Owner and Admin roles only
   * @security JWT Bearer Token + Policy Guard
   * @rbac Owner or Admin role required
   * @returns {Object} Custom role demo data
   * 
   * @example
   * GET /custom-role-demo
   * Headers: { "Authorization": "Bearer <jwt_token>" }
   * Response: { "message": "Custom role policy passed", "user": {...}, "timestamp": "..." }
   */
  @Get('custom-role-demo')
  @UseGuards(PolicyGuard)
  @RequireRole([Role.OWNER, Role.ADMIN], 'Only owners and admins can access this custom endpoint')
  customRoleDemo(@Request() req: any) {
    return {
      message: 'Custom role policy passed - you have owner or admin role',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      },
      requiredRoles: [Role.OWNER, Role.ADMIN],
      timestamp: new Date().toISOString()
    };
  }
}
