module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.test.ts',
    '**/*.spec.ts',
    '**/*.test.ts'
  ],

  // TypeScript support
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Root directory for tests
  rootDir: './src',

  // Test timeout
  testTimeout: 10000,

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/main.ts',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/simple-setup.ts'],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    // Mock workspace packages instead of resolving them
  },

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,

  // Global setup and teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Test results processor
  testResultsProcessor: undefined,

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@nestjs|@rbac-workspace))'
  ],

  // Module paths
  modulePaths: ['<rootDir>'],

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Error handling
  errorOnDeprecated: true,

  // Bail after first failure (useful for CI)
  bail: false,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '<rootDir>/../.jest-cache',
};
