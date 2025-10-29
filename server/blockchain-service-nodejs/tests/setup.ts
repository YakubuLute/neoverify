import { config } from '../src/config';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock logger for tests to reduce noise
jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

// Global test setup
beforeAll(async () => {
    // Any global setup for tests
});

afterAll(async () => {
    // Any global cleanup for tests
});

// Increase timeout for database operations
jest.setTimeout(30000);