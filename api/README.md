# TurboVets Backend API - Test Suite

This document provides a comprehensive overview of the Jest test suite for the TurboVets backend API, a secure task management system with Role-Based Access Control (RBAC).

## 📋 Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Test Categories](#test-categories)
- [Mocking Strategy](#mocking-strategy)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The test suite provides comprehensive coverage for all backend components including:

- **Entities**: User, Task, Organization, AuditLog
- **Controllers**: App, Auth, Tasks
- **Services**: Auth, Tasks, Audit, Seed
- **Guards**: Policy, JWT Auth
- **Utilities**: Password, Policy Helpers
- **Interceptors**: Audit

## 📁 Test Structure

```
src/__tests__/
├── setup.ts                          # Global test setup and utilities
├── entities/
│   ├── user.entity.spec.ts           # User entity tests
│   ├── task.entity.spec.ts           # Task entity tests
│   ├── organization.entity.spec.ts   # Organization entity tests
│   └── audit-log.entity.spec.ts      # AuditLog entity tests
├── auth/
│   ├── auth.service.spec.ts          # Authentication service tests
│   ├── auth.controller.spec.ts       # Authentication controller tests
│   ├── password.utils.spec.ts        # Password utility tests
│   ├── policy.guard.spec.ts          # Policy guard tests
│   └── policy-helpers.spec.ts        # Policy helper tests
├── tasks/
│   ├── tasks.service.spec.ts         # Task service tests
│   └── tasks.controller.spec.ts      # Task controller tests
├── audit/
│   └── audit.service.spec.ts         # Audit service tests
├── app/
│   ├── app.service.spec.ts           # Application service tests
│   └── app.controller.spec.ts        # Application controller tests
└── seed/
    └── seed.service.spec.ts          # Database seeding tests
```

## 🚀 Running Tests

### Prerequisites

Install dependencies:
```bash
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI/CD
npm run test:ci

# Debug tests
npm run test:debug
```

### NX Commands

```bash
# Run tests via NX
nx test @rbac-workspace/api

# Run tests with coverage via NX
nx run @rbac-workspace/api:test:coverage
```

## 📊 Test Coverage

The test suite aims for comprehensive coverage with the following thresholds:

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Text**: Console output
- **LCOV**: For CI/CD integration
- **HTML**: Detailed browser-viewable report

## 🧪 Test Categories

### 1. Entity Tests

Tests for TypeORM entities focusing on:
- Property validation
- Enum values
- Data types
- Relationships
- Constraints

**Example:**
```typescript
describe('User Entity', () => {
  it('should have correct role values', () => {
    expect(Role.OWNER).toBe('owner');
    expect(Role.ADMIN).toBe('admin');
    expect(Role.VIEWER).toBe('viewer');
  });
});
```

### 2. Service Tests

Comprehensive tests for business logic including:
- CRUD operations
- RBAC enforcement
- Error handling
- Data validation
- Audit logging

**Example:**
```typescript
describe('TasksService', () => {
  it('should create task for admin user', async () => {
    const createTaskDto = { title: 'New Task', status: TaskStatus.TODO };
    const result = await service.create(createTaskDto, mockAdminUser);
    expect(result.title).toBe('New Task');
  });
});
```

### 3. Controller Tests

API endpoint tests covering:
- Request/response handling
- Parameter validation
- Authentication/authorization
- Error responses
- HTTP status codes

**Example:**
```typescript
describe('AuthController', () => {
  it('should return JWT token on successful login', async () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };
    const result = await controller.login(loginDto);
    expect(result.access_token).toBeDefined();
  });
});
```

### 4. Guard Tests

Security and authorization tests for:
- Policy evaluation
- Role-based access control
- Permission checking
- Resource-based policies

**Example:**
```typescript
describe('PolicyGuard', () => {
  it('should allow access when policy predicate returns true', async () => {
    const policyConfig = { predicate: jest.fn().mockReturnValue(true) };
    const result = await guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
  });
});
```

### 5. Integration Tests

End-to-end workflow tests covering:
- Complete authentication flow
- Full CRUD operations
- Multi-service interactions
- Error propagation

## 🎭 Mocking Strategy

### Repository Mocking

All TypeORM repositories are mocked with consistent interfaces:

```typescript
const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
  // ... other methods
};
```

### Service Mocking

Services are mocked with realistic behavior:

```typescript
const mockAuthService = {
  validateUser: jest.fn().mockResolvedValue(mockUser),
  login: jest.fn().mockResolvedValue(mockLoginResponse),
};
```

### External Dependencies

- **bcrypt**: Mocked for password hashing
- **JWT**: Mocked for token generation
- **Console**: Mocked to reduce test noise

## 🔧 Test Utilities

Global test utilities are available in `setup.ts`:

```typescript
// Create mock user
const user = global.testUtils.createMockUser({
  role: 'admin',
  organizationId: 1
});

// Create mock request
const request = global.testUtils.createMockRequest(user);

// Create mock task
const task = global.testUtils.createMockTask({
  title: 'Test Task',
  status: TaskStatus.TODO
});
```

## 📝 Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mocking

- Mock external dependencies
- Use consistent mock data
- Reset mocks between tests

### 3. Assertions

- Use specific assertions
- Test both success and failure cases
- Verify mock calls and parameters

### 4. Error Testing

- Test error scenarios
- Verify error messages
- Check error propagation

### 5. RBAC Testing

- Test all role combinations
- Verify permission boundaries
- Test organization isolation

## 🐛 Troubleshooting

### Common Issues

1. **Mock Not Working**
   ```bash
   # Clear Jest cache
   npx jest --clearCache
   ```

2. **TypeScript Errors**
   ```bash
   # Check TypeScript configuration
   npx tsc --noEmit
   ```

3. **Timeout Issues**
   ```typescript
   // Increase timeout for specific tests
   jest.setTimeout(10000);
   ```

4. **Memory Leaks**
   ```bash
   # Run with memory detection
   npx jest --detectLeaks
   ```

### Debug Mode

Run tests in debug mode to step through code:

```bash
npm run test:debug
```

Then attach your debugger to the Node.js process.

## 📈 Performance

### Test Execution Time

- **Unit Tests**: < 1 second per test
- **Integration Tests**: < 5 seconds per test
- **Full Suite**: < 30 seconds

### Optimization Tips

1. Use `jest.runInBand()` for debugging
2. Parallel execution for faster CI/CD
3. Cache mocks between tests
4. Use `--maxWorkers` to control concurrency

## 🔒 Security Testing

The test suite includes comprehensive security testing:

- **Authentication**: JWT token validation
- **Authorization**: Role-based access control
- **Input Validation**: Parameter sanitization
- **SQL Injection**: Query parameter testing
- **XSS Prevention**: Input encoding verification

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [TypeORM Testing](https://typeorm.io/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Maintain coverage thresholds
3. Update this documentation
4. Run the full test suite before committing

## 📞 Support

For test-related issues:

1. Check the troubleshooting section
2. Review existing test patterns
3. Consult the Jest documentation
4. Create an issue with test details

---

**Last Updated**: January 2024  
**Test Framework**: Jest 29.x  
**Coverage Target**: 80%+  
**Total Tests**: 150+ test cases
