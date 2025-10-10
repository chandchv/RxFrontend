module.exports = {
  preset: 'jest-expo',
  displayName: 'E2E Tests',
  testMatch: ['**/__tests__/e2e/**/*.test.js'],
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/__tests__/e2e/setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/metro.config.js',
    '!**/__tests__/**',
  ],
  coverageDirectory: 'coverage/e2e',
  testTimeout: 30000, // 30 seconds for E2E tests
  verbose: true,
};