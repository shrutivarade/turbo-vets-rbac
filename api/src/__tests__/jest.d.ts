/**
 * Jest Type Declarations
 * This file provides type definitions for Jest globals in the test environment
 */

/// <reference types="jest" />

// Jest globals are available in the test environment
declare const jest: typeof import('jest');
declare const afterEach: jest.Lifecycle;
declare const afterAll: jest.Lifecycle;
declare const beforeEach: jest.Lifecycle;
declare const beforeAll: jest.Lifecycle;
declare const describe: jest.Describe;
declare const it: jest.It;
declare const test: jest.It;
declare const expect: jest.Expect;

// Global test helpers
declare global {
  var testHelpers: {
    createMockRequest: () => any;
    createMockResponse: () => any;
  };
}
