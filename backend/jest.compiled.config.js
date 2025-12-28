module.exports = {
  testEnvironment: 'node',
  maxWorkers: 1,
  roots: ['<rootDir>/dist-tests/backend/src', '<rootDir>/dist-tests/shared'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  transform: {},
  moduleDirectories: ['node_modules', '<rootDir>/dist-tests', '<rootDir>'],
};


