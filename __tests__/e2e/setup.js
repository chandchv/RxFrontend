import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:8000',
      },
    },
  },
}));

jest.mock('expo-device', () => ({
  brand: 'Apple',
  modelName: 'iPhone 12',
  totalMemory: 4 * 1024 * 1024 * 1024, // 4GB
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  }),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock services
jest.mock('../../services/mobileApiService', () => ({
  getDashboardData: jest.fn().mockResolvedValue({
    metrics: { totalPatients: 150, todayAppointments: 8 },
    recentActivity: [],
  }),
  getClinicalRecords: jest.fn().mockResolvedValue({
    records: [],
    totalCount: 0,
  }),
  getAppointments: jest.fn().mockResolvedValue({
    appointments: [],
    totalCount: 0,
  }),
  getPrescriptions: jest.fn().mockResolvedValue({
    prescriptions: [],
    totalCount: 0,
  }),
}));

// Global test utilities
global.mockApiResponse = (service, method, response) => {
  const mockService = require(`../../services/${service}`);
  mockService[method].mockResolvedValue(response);
};

global.mockApiError = (service, method, error) => {
  const mockService = require(`../../services/${service}`);
  mockService[method].mockRejectedValue(error);
};

// Performance monitoring for tests
global.testPerformanceMetrics = {
  renderTimes: [],
  navigationTimes: [],
  apiResponseTimes: [],
};

global.trackTestPerformance = (type, duration, metadata = {}) => {
  global.testPerformanceMetrics[`${type}Times`].push({
    duration,
    metadata,
    timestamp: Date.now(),
  });
};

// Test timeout helpers
global.waitForCondition = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Console override for test environment
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress known warnings in test environment
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: componentWillReceiveProps has been renamed'))
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset performance metrics
  global.testPerformanceMetrics = {
    renderTimes: [],
    navigationTimes: [],
    apiResponseTimes: [],
  };
  
  // Reset fetch mock
  global.fetch.mockClear();
});

afterEach(() => {
  // Log performance metrics if test failed
  if (global.testPerformanceMetrics.renderTimes.length > 0) {
    const avgRenderTime = global.testPerformanceMetrics.renderTimes
      .reduce((sum, metric) => sum + metric.duration, 0) / 
      global.testPerformanceMetrics.renderTimes.length;
    
    if (avgRenderTime > 100) { // More than 100ms average
      console.warn(`Slow render detected in test: ${avgRenderTime.toFixed(2)}ms average`);
    }
  }
});