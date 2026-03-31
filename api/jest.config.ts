import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['**/*.ts', '!**/*.test.ts', '!**/index.ts'],
  coverageDirectory: '../coverage',
  testTimeout: 30000, // MongoMemoryServer startup can take a few seconds
};

export default config;
