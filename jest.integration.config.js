module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/__tests__/setup/integrationSetup.js'
  ],
  testMatch: [
    '<rootDir>/__tests__/integration/**/*.test.js',
    '<rootDir>/__tests__/integration/**/*.integration.test.js'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-vector-icons|react-native-chart-kit|react-native-paper|react-native-calendars|react-native-calendar-picker)'
  ],
  collectCoverageFrom: [
    'screens/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
    'contexts/**/*.{js,jsx}',
    'services/**/*.{js,jsx}',
    'utils/**/*.{js,jsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/babel.config.js',
    '!**/metro.config.js'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage/integration',
  testTimeout: 30000, // 30 seconds for integration tests
  verbose: true,
  testEnvironment: 'node',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@screens/(.*)$': '<rootDir>/screens/$1',
    '^@contexts/(.*)$': '<rootDir>/contexts/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1'
  },
  globals: {
    __DEV__: true
  }
};