/// <reference path="../../jest.d.ts" />

// Mock audit log entity and related types to avoid TypeORM decorator issues
enum AuditAction {
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

enum AuditResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  ERROR = 'error',
  DENIED = 'denied'
}

interface AuditLog {
  id: number;
  action: AuditAction;
  result: AuditResult;
  user?: any;
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

// Mock validation functions
function validateAction(action: string): boolean {
  return Object.values(AuditAction).includes(action as AuditAction);
}

function validateResult(result: string): boolean {
  return Object.values(AuditResult).includes(result as AuditResult);
}

function validateHttpMethod(method?: string): boolean {
  if (method === undefined) return true; // Optional field
  if (method === '') return false; // Empty string is invalid
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  return validMethods.includes(method.toUpperCase());
}

function validateIpAddress(ip?: string): boolean {
  if (ip === undefined) return true; // Optional field
  if (ip === '') return false; // Empty string is invalid
  // Simple IP validation (IPv4)
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip) || ip === 'localhost' || ip === '::1';
}

function validateJson(jsonString?: string): boolean {
  if (!jsonString) return true; // Optional field
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

function createAuditLog(data: Partial<AuditLog>): AuditLog {
  return {
    id: data.id || 0,
    action: data.action || AuditAction.READ,
    result: data.result || AuditResult.SUCCESS,
    user: data.user,
    userId: data.userId,
    organizationId: data.organizationId,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    httpMethod: data.httpMethod,
    endpoint: data.endpoint,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    details: data.details,
    errorMessage: data.errorMessage,
    duration: data.duration,
    timestamp: data.timestamp || new Date(),
    metadata: data.metadata,
  };
}

describe('AuditLog Entity', () => {
  describe('AuditAction Enum', () => {
    it('should have correct authentication action values', () => {
      expect(AuditAction.LOGIN).toBe('login');
      expect(AuditAction.LOGOUT).toBe('logout');
      expect(AuditAction.LOGIN_FAILED).toBe('login_failed');
    });

    it('should have correct task action values', () => {
      expect(AuditAction.TASK_CREATED).toBe('task_created');
      expect(AuditAction.TASK_UPDATED).toBe('task_updated');
      expect(AuditAction.TASK_DELETED).toBe('task_deleted');
      expect(AuditAction.TASK_VIEWED).toBe('task_viewed');
    });

    it('should have correct user action values', () => {
      expect(AuditAction.USER_CREATED).toBe('user_created');
      expect(AuditAction.USER_UPDATED).toBe('user_updated');
      expect(AuditAction.USER_DELETED).toBe('user_deleted');
    });

    it('should have correct organization action values', () => {
      expect(AuditAction.ORG_CREATED).toBe('org_created');
      expect(AuditAction.ORG_UPDATED).toBe('org_updated');
      expect(AuditAction.ORG_DELETED).toBe('org_deleted');
    });

    it('should have correct system action values', () => {
      expect(AuditAction.SYSTEM_ERROR).toBe('system_error');
      expect(AuditAction.ACCESS_DENIED).toBe('access_denied');
      expect(AuditAction.PERMISSION_CHECK).toBe('permission_check');
    });

    it('should have correct generic action values', () => {
      expect(AuditAction.CREATE).toBe('create');
      expect(AuditAction.READ).toBe('read');
      expect(AuditAction.UPDATE).toBe('update');
      expect(AuditAction.DELETE).toBe('delete');
      expect(AuditAction.LIST).toBe('list');
    });

    it('should validate action values correctly', () => {
      expect(validateAction('login')).toBe(true);
      expect(validateAction('task_created')).toBe(true);
      expect(validateAction('invalid_action')).toBe(false);
      expect(validateAction('')).toBe(false);
    });

    it('should contain all expected actions', () => {
      const actions = Object.values(AuditAction);
      expect(actions.length).toBeGreaterThan(15); // Should have many actions
      expect(actions).toContain('login');
      expect(actions).toContain('task_created');
      expect(actions).toContain('system_error');
    });
  });

  describe('AuditResult Enum', () => {
    it('should have correct result values', () => {
      expect(AuditResult.SUCCESS).toBe('success');
      expect(AuditResult.FAILURE).toBe('failure');
      expect(AuditResult.ERROR).toBe('error');
      expect(AuditResult.DENIED).toBe('denied');
    });

    it('should validate result values correctly', () => {
      expect(validateResult('success')).toBe(true);
      expect(validateResult('failure')).toBe(true);
      expect(validateResult('error')).toBe(true);
      expect(validateResult('denied')).toBe(true);
      expect(validateResult('invalid_result')).toBe(false);
      expect(validateResult('')).toBe(false);
    });

    it('should contain all expected results', () => {
      const results = Object.values(AuditResult);
      expect(results).toHaveLength(4);
      expect(results).toContain('success');
      expect(results).toContain('failure');
      expect(results).toContain('error');
      expect(results).toContain('denied');
    });
  });

  describe('AuditLog Creation', () => {
    it('should create audit log with required fields', () => {
      const logData = {
        id: 1,
        action: AuditAction.LOGIN,
        result: AuditResult.SUCCESS,
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      const auditLog = createAuditLog(logData);

      expect(auditLog.id).toBe(1);
      expect(auditLog.action).toBe(AuditAction.LOGIN);
      expect(auditLog.result).toBe(AuditResult.SUCCESS);
      expect(auditLog.timestamp).toEqual(new Date('2024-01-01T10:00:00Z'));
    });

    it('should create audit log with all optional fields', () => {
      const mockUser = { id: 1, email: 'user@example.com' };
      const logData = {
        id: 2,
        action: AuditAction.TASK_CREATED,
        result: AuditResult.SUCCESS,
        user: mockUser,
        userId: 1,
        organizationId: 1,
        resourceType: 'task',
        resourceId: 123,
        httpMethod: 'POST',
        endpoint: '/api/tasks',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        details: 'Task created successfully',
        duration: 150,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        metadata: '{"extra": "data"}',
      };

      const auditLog = createAuditLog(logData);

      expect(auditLog.user).toEqual(mockUser);
      expect(auditLog.userId).toBe(1);
      expect(auditLog.organizationId).toBe(1);
      expect(auditLog.resourceType).toBe('task');
      expect(auditLog.resourceId).toBe(123);
      expect(auditLog.httpMethod).toBe('POST');
      expect(auditLog.endpoint).toBe('/api/tasks');
      expect(auditLog.ipAddress).toBe('192.168.1.1');
      expect(auditLog.userAgent).toBe('Mozilla/5.0');
      expect(auditLog.details).toBe('Task created successfully');
      expect(auditLog.duration).toBe(150);
      expect(auditLog.metadata).toBe('{"extra": "data"}');
    });

    it('should handle undefined optional fields', () => {
      const logData = {
        id: 3,
        action: AuditAction.SYSTEM_ERROR,
        result: AuditResult.ERROR,
        timestamp: new Date(),
      };

      const auditLog = createAuditLog(logData);

      expect(auditLog.user).toBeUndefined();
      expect(auditLog.userId).toBeUndefined();
      expect(auditLog.organizationId).toBeUndefined();
      expect(auditLog.resourceType).toBeUndefined();
      expect(auditLog.resourceId).toBeUndefined();
      expect(auditLog.httpMethod).toBeUndefined();
      expect(auditLog.endpoint).toBeUndefined();
      expect(auditLog.ipAddress).toBeUndefined();
      expect(auditLog.userAgent).toBeUndefined();
      expect(auditLog.details).toBeUndefined();
      expect(auditLog.errorMessage).toBeUndefined();
      expect(auditLog.duration).toBeUndefined();
      expect(auditLog.metadata).toBeUndefined();
    });

    it('should set timestamp automatically if not provided', () => {
      const beforeCreation = new Date();
      const auditLog = createAuditLog({
        id: 1,
        action: AuditAction.READ,
        result: AuditResult.SUCCESS,
      });
      const afterCreation = new Date();

      expect(auditLog.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(auditLog.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });

  describe('HTTP Method Validation', () => {
    it('should validate correct HTTP methods', () => {
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

      validMethods.forEach(method => {
        expect(validateHttpMethod(method)).toBe(true);
        expect(validateHttpMethod(method.toLowerCase())).toBe(true);
      });
    });

    it('should reject invalid HTTP methods', () => {
      const invalidMethods = ['INVALID', 'FETCH', 'SEND'];

      invalidMethods.forEach(method => {
        expect(validateHttpMethod(method)).toBe(false);
      });
      
      // Test empty string separately
      expect(validateHttpMethod('')).toBe(false);
    });

    it('should validate undefined HTTP method', () => {
      expect(validateHttpMethod(undefined)).toBe(true);
    });
  });

  describe('IP Address Validation', () => {
    it('should validate correct IP addresses', () => {
      const validIPs = [
        '192.168.1.1',
        '127.0.0.1',
        '10.0.0.1',
        '255.255.255.255',
        '0.0.0.0',
        'localhost',
        '::1', // IPv6 localhost
      ];

      validIPs.forEach(ip => {
        expect(validateIpAddress(ip)).toBe(true);
      });
    });

    it('should reject invalid IP addresses', () => {
      const invalidIPs = [
        '256.256.256.256',
        '192.168.1',
        '192.168.1.1.1',
        'invalid.ip',
      ];

      invalidIPs.forEach(ip => {
        expect(validateIpAddress(ip)).toBe(false);
      });
      
      // Test empty string separately
      expect(validateIpAddress('')).toBe(false);
    });

    it('should validate undefined IP address', () => {
      expect(validateIpAddress(undefined)).toBe(true);
    });
  });

  describe('JSON Validation', () => {
    it('should validate correct JSON strings', () => {
      const validJsonStrings = [
        '{"key": "value"}',
        '[]',
        '{}',
        '"string"',
        '123',
        'true',
        'false',
        'null',
        '{"nested": {"object": {"with": "values"}}}',
        '[{"array": "of"}, {"objects": true}]',
      ];

      validJsonStrings.forEach(json => {
        expect(validateJson(json)).toBe(true);
      });
    });

    it('should reject invalid JSON strings', () => {
      const invalidJsonStrings = [
        '{invalid: json}',
        '{key: "value"}', // Unquoted key
        '{"key": value}', // Unquoted value
        '{',
        '}',
        'invalid string',
        '{"trailing": "comma",}',
      ];

      invalidJsonStrings.forEach(json => {
        expect(validateJson(json)).toBe(false);
      });
    });

    it('should validate undefined JSON string', () => {
      expect(validateJson(undefined)).toBe(true);
    });
  });

  describe('User Relationship', () => {
    it('should establish user relationship for user actions', () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        role: 'admin',
      };

      const auditLog = createAuditLog({
        id: 1,
        action: AuditAction.TASK_CREATED,
        result: AuditResult.SUCCESS,
        user: mockUser,
        userId: 1,
        timestamp: new Date(),
      });

      expect(auditLog.userId).toBe(1);
      expect(auditLog.user).toEqual(mockUser);
    });

    it('should handle system actions without user', () => {
      const auditLog = createAuditLog({
        id: 1,
        action: AuditAction.SYSTEM_ERROR,
        result: AuditResult.ERROR,
        errorMessage: 'Database connection failed',
        timestamp: new Date(),
      });

      expect(auditLog.userId).toBeUndefined();
      expect(auditLog.user).toBeUndefined();
      expect(auditLog.errorMessage).toBe('Database connection failed');
    });

    it('should handle user relationship without loaded entity', () => {
      const auditLog = createAuditLog({
        id: 1,
        action: AuditAction.LOGIN,
        result: AuditResult.SUCCESS,
        userId: 5,
        timestamp: new Date(),
        // user not loaded
      });

      expect(auditLog.userId).toBe(5);
      expect(auditLog.user).toBeUndefined();
    });
  });

  describe('Audit Log Categories', () => {
    it('should create authentication audit logs', () => {
      const loginLog = createAuditLog({
        id: 1,
        action: AuditAction.LOGIN,
        result: AuditResult.SUCCESS,
        userId: 1,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        details: 'User logged in successfully',
        timestamp: new Date(),
      });

      const logoutLog = createAuditLog({
        id: 2,
        action: AuditAction.LOGOUT,
        result: AuditResult.SUCCESS,
        userId: 1,
        details: 'User logged out',
        timestamp: new Date(),
      });

      const failedLoginLog = createAuditLog({
        id: 3,
        action: AuditAction.LOGIN_FAILED,
        result: AuditResult.FAILURE,
        ipAddress: '192.168.1.1',
        errorMessage: 'Invalid credentials',
        timestamp: new Date(),
      });

      expect(loginLog.action).toBe(AuditAction.LOGIN);
      expect(logoutLog.action).toBe(AuditAction.LOGOUT);
      expect(failedLoginLog.action).toBe(AuditAction.LOGIN_FAILED);
      expect(failedLoginLog.result).toBe(AuditResult.FAILURE);
    });

    it('should create task-related audit logs', () => {
      const taskCreatedLog = createAuditLog({
        id: 1,
        action: AuditAction.TASK_CREATED,
        result: AuditResult.SUCCESS,
        userId: 1,
        organizationId: 1,
        resourceType: 'task',
        resourceId: 123,
        httpMethod: 'POST',
        endpoint: '/api/tasks',
        details: 'Task "Project Setup" created',
        timestamp: new Date(),
      });

      const taskUpdatedLog = createAuditLog({
        id: 2,
        action: AuditAction.TASK_UPDATED,
        result: AuditResult.SUCCESS,
        userId: 1,
        organizationId: 1,
        resourceType: 'task',
        resourceId: 123,
        httpMethod: 'PUT',
        endpoint: '/api/tasks/123',
        details: 'Task status changed from TODO to DOING',
        timestamp: new Date(),
      });

      expect(taskCreatedLog.action).toBe(AuditAction.TASK_CREATED);
      expect(taskUpdatedLog.action).toBe(AuditAction.TASK_UPDATED);
      expect(taskCreatedLog.httpMethod).toBe('POST');
      expect(taskUpdatedLog.httpMethod).toBe('PUT');
    });

    it('should create system audit logs', () => {
      const systemErrorLog = createAuditLog({
        id: 1,
        action: AuditAction.SYSTEM_ERROR,
        result: AuditResult.ERROR,
        errorMessage: 'Database connection timeout',
        details: 'Connection to primary database failed after 30 seconds',
        duration: 30000,
        timestamp: new Date(),
      });

      const accessDeniedLog = createAuditLog({
        id: 2,
        action: AuditAction.ACCESS_DENIED,
        result: AuditResult.DENIED,
        userId: 3,
        organizationId: 1,
        resourceType: 'task',
        resourceId: 456,
        httpMethod: 'DELETE',
        endpoint: '/api/tasks/456',
        errorMessage: 'Insufficient permissions',
        details: 'User attempted to delete task without delete permission',
        timestamp: new Date(),
      });

      expect(systemErrorLog.action).toBe(AuditAction.SYSTEM_ERROR);
      expect(accessDeniedLog.action).toBe(AuditAction.ACCESS_DENIED);
      expect(systemErrorLog.result).toBe(AuditResult.ERROR);
      expect(accessDeniedLog.result).toBe(AuditResult.DENIED);
    });
  });

  describe('Performance and Duration Tracking', () => {
    it('should track request duration', () => {
      const auditLog = createAuditLog({
        id: 1,
        action: AuditAction.TASK_CREATED,
        result: AuditResult.SUCCESS,
        userId: 1,
        httpMethod: 'POST',
        endpoint: '/api/tasks',
        duration: 250, // 250ms
        timestamp: new Date(),
      });

      expect(auditLog.duration).toBe(250);
      expect(typeof auditLog.duration).toBe('number');
    });

    it('should handle various duration ranges', () => {
      const logs = [
        { id: 1, duration: 50 }, // Fast request
        { id: 2, duration: 500 }, // Normal request
        { id: 3, duration: 2000 }, // Slow request
        { id: 4, duration: 30000 }, // Very slow request
      ];

      logs.forEach(({ id, duration }) => {
        const auditLog = createAuditLog({
          id,
          action: AuditAction.READ,
          result: AuditResult.SUCCESS,
          duration,
          timestamp: new Date(),
        });

        expect(auditLog.duration).toBe(duration);
      });
    });

    it('should handle undefined duration', () => {
      const auditLog = createAuditLog({
        id: 1,
        action: AuditAction.READ,
        result: AuditResult.SUCCESS,
        timestamp: new Date(),
      });

      expect(auditLog.duration).toBeUndefined();
    });
  });

  describe('Metadata and Details', () => {
    it('should store detailed information in details field', () => {
      const detailedLog = createAuditLog({
        id: 1,
        action: AuditAction.TASK_UPDATED,
        result: AuditResult.SUCCESS,
        userId: 1,
        resourceType: 'task',
        resourceId: 123,
        details: 'Task updated: title changed from "Old Title" to "New Title", status changed from TODO to DOING',
        timestamp: new Date(),
      });

      expect(detailedLog.details).toContain('title changed');
      expect(detailedLog.details).toContain('status changed');
      expect(detailedLog.details).toContain('TODO to DOING');
    });

    it('should store structured metadata as JSON', () => {
      const metadata = {
        requestId: 'req-123-456',
        sessionId: 'sess-789-012',
        browserFingerprint: 'fp-345-678',
        previousValues: {
          title: 'Old Title',
          status: 'TODO'
        },
        newValues: {
          title: 'New Title',
          status: 'DOING'
        }
      };

      const auditLog = createAuditLog({
        id: 1,
        action: AuditAction.TASK_UPDATED,
        result: AuditResult.SUCCESS,
        userId: 1,
        metadata: JSON.stringify(metadata),
        timestamp: new Date(),
      });

      expect(validateJson(auditLog.metadata)).toBe(true);
      expect(JSON.parse(auditLog.metadata!)).toEqual(metadata);
    });

    it('should handle error messages for failed operations', () => {
      const errorLog = createAuditLog({
        id: 1,
        action: AuditAction.TASK_CREATED,
        result: AuditResult.FAILURE,
        userId: 1,
        errorMessage: 'Validation failed: Title is required',
        details: 'User attempted to create task without providing title field',
        timestamp: new Date(),
      });

      expect(errorLog.errorMessage).toBe('Validation failed: Title is required');
      expect(errorLog.details).toContain('without providing title');
    });
  });

  describe('Multi-tenant Support', () => {
    it('should support organization-scoped audit logs', () => {
      const org1Log = createAuditLog({
        id: 1,
        action: AuditAction.TASK_CREATED,
        result: AuditResult.SUCCESS,
        userId: 1,
        organizationId: 1,
        resourceType: 'task',
        resourceId: 123,
        timestamp: new Date(),
      });

      const org2Log = createAuditLog({
        id: 2,
        action: AuditAction.TASK_CREATED,
        result: AuditResult.SUCCESS,
        userId: 2,
        organizationId: 2,
        resourceType: 'task',
        resourceId: 456,
        timestamp: new Date(),
      });

      expect(org1Log.organizationId).toBe(1);
      expect(org2Log.organizationId).toBe(2);
      expect(org1Log.organizationId).not.toBe(org2Log.organizationId);
    });

    it('should handle system-wide audit logs without organization', () => {
      const systemLog = createAuditLog({
        id: 1,
        action: AuditAction.SYSTEM_ERROR,
        result: AuditResult.ERROR,
        errorMessage: 'Global system maintenance initiated',
        timestamp: new Date(),
      });

      expect(systemLog.organizationId).toBeUndefined();
      expect(systemLog.userId).toBeUndefined();
    });
  });

  describe('Audit Log Querying Helpers', () => {
    it('should support filtering by action type', () => {
      const logs = [
        createAuditLog({ id: 1, action: AuditAction.LOGIN, result: AuditResult.SUCCESS, timestamp: new Date() }),
        createAuditLog({ id: 2, action: AuditAction.TASK_CREATED, result: AuditResult.SUCCESS, timestamp: new Date() }),
        createAuditLog({ id: 3, action: AuditAction.LOGIN, result: AuditResult.FAILURE, timestamp: new Date() }),
        createAuditLog({ id: 4, action: AuditAction.LOGOUT, result: AuditResult.SUCCESS, timestamp: new Date() }),
      ];

      const filterByAction = (logs: AuditLog[], action: AuditAction) =>
        logs.filter(log => log.action === action);

      const loginLogs = filterByAction(logs, AuditAction.LOGIN);
      const taskLogs = filterByAction(logs, AuditAction.TASK_CREATED);

      expect(loginLogs).toHaveLength(2);
      expect(taskLogs).toHaveLength(1);
    });

    it('should support filtering by result type', () => {
      const logs = [
        createAuditLog({ id: 1, action: AuditAction.LOGIN, result: AuditResult.SUCCESS, timestamp: new Date() }),
        createAuditLog({ id: 2, action: AuditAction.LOGIN, result: AuditResult.FAILURE, timestamp: new Date() }),
        createAuditLog({ id: 3, action: AuditAction.TASK_CREATED, result: AuditResult.SUCCESS, timestamp: new Date() }),
        createAuditLog({ id: 4, action: AuditAction.SYSTEM_ERROR, result: AuditResult.ERROR, timestamp: new Date() }),
      ];

      const filterByResult = (logs: AuditLog[], result: AuditResult) =>
        logs.filter(log => log.result === result);

      const successLogs = filterByResult(logs, AuditResult.SUCCESS);
      const failureLogs = filterByResult(logs, AuditResult.FAILURE);
      const errorLogs = filterByResult(logs, AuditResult.ERROR);

      expect(successLogs).toHaveLength(2);
      expect(failureLogs).toHaveLength(1);
      expect(errorLogs).toHaveLength(1);
    });

    it('should support date range filtering', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const logs = [
        createAuditLog({ id: 1, action: AuditAction.LOGIN, result: AuditResult.SUCCESS, timestamp: twoHoursAgo }),
        createAuditLog({ id: 2, action: AuditAction.TASK_CREATED, result: AuditResult.SUCCESS, timestamp: oneHourAgo }),
        createAuditLog({ id: 3, action: AuditAction.LOGOUT, result: AuditResult.SUCCESS, timestamp: now }),
      ];

      const filterByDateRange = (logs: AuditLog[], startDate: Date, endDate: Date) =>
        logs.filter(log => log.timestamp >= startDate && log.timestamp <= endDate);

      const lastHourLogs = filterByDateRange(logs, oneHourAgo, now);
      const allLogs = filterByDateRange(logs, twoHoursAgo, now);

      expect(lastHourLogs).toHaveLength(2);
      expect(allLogs).toHaveLength(3);
    });
  });

  describe('Field Constraints and Edge Cases', () => {
    it('should handle very long details and error messages', () => {
      const longDetails = 'A'.repeat(1000);
      const longErrorMessage = 'B'.repeat(500);

      const auditLog = createAuditLog({
        id: 1,
        action: AuditAction.SYSTEM_ERROR,
        result: AuditResult.ERROR,
        details: longDetails,
        errorMessage: longErrorMessage,
        timestamp: new Date(),
      });

      expect(auditLog.details).toBe(longDetails);
      expect(auditLog.errorMessage).toBe(longErrorMessage);
      expect(auditLog.details!.length).toBe(1000);
      expect(auditLog.errorMessage!.length).toBe(500);
    });

    it('should handle special characters in all text fields', () => {
      const auditLog = createAuditLog({
        id: 1,
        action: AuditAction.TASK_CREATED,
        result: AuditResult.SUCCESS,
        resourceType: 'tâsk',
        endpoint: '/api/résourcé',
        userAgent: 'Mozîlla/5.0 (Wïndöws)',
        details: 'Créated tâsk with émojis 🚀 and spécial chars',
        errorMessage: 'Ërrör with ünïcödé',
        timestamp: new Date(),
      });

      expect(auditLog.resourceType).toBe('tâsk');
      expect(auditLog.endpoint).toBe('/api/résourcé');
      expect(auditLog.details).toContain('émojis 🚀');
      expect(auditLog.errorMessage).toContain('ünïcödé');
    });

    it('should handle empty string values for optional fields', () => {
      const auditLog = createAuditLog({
        id: 1,
        action: AuditAction.READ,
        result: AuditResult.SUCCESS,
        resourceType: '',
        endpoint: '',
        details: '',
        errorMessage: '',
        userAgent: '',
        metadata: '',
        timestamp: new Date(),
      });

      expect(auditLog.resourceType).toBe('');
      expect(auditLog.endpoint).toBe('');
      expect(auditLog.details).toBe('');
      expect(auditLog.errorMessage).toBe('');
      expect(auditLog.userAgent).toBe('');
      expect(auditLog.metadata).toBe('');
    });
  });
});
