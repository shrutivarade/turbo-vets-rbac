/**
 * Jest Setup File
 * This file runs before each test file is executed
 * Configure global test setup, mocks, and utilities here
 */

// Import reflect-metadata for TypeORM decorators
import 'reflect-metadata';

// Reference Jest types
/// <reference path="./jest.d.ts" />

// Global test timeout (can be overridden in individual tests)
jest.setTimeout(10000);

// Global test utilities and mocks can be added here
// For example:
// - Database connection setup
// - Global mocks for external services
// - Test data factories
// - Custom matchers

// Example: Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test helpers
(global as any).testHelpers = {
  // Add common test utilities here
  createMockRequest: () => ({
    user: { id: 1, email: 'test@example.com' },
    params: {},
    query: {},
    body: {},
  }),
  
  createMockResponse: () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  }),
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

// Global teardown
afterAll(() => {
  // Cleanup global resources if needed
});
