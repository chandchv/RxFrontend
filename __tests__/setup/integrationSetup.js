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

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(component => component),
    Directions: {}
  };
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon');

// Mock react-native-chart-kit
jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
  BarChart: 'BarChart',
  PieChart: 'PieChart',
  ProgressChart: 'ProgressChart',
  ContributionGraph: 'ContributionGraph',
  StackedBarChart: 'StackedBarChart'
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Text: 'Text',
  TSpan: 'TSpan',
  TextPath: 'TextPath',
  Path: 'Path',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Line: 'Line',
  Rect: 'Rect',
  Use: 'Use',
  Image: 'Image',
  Symbol: 'Symbol',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  ClipPath: 'ClipPath',
  Pattern: 'Pattern',
  Mask: 'Mask'
}));

// Mock @react-native-picker/picker
jest.mock('@react-native-picker/picker', () => ({
  Picker: ({ children, onValueChange, selectedValue, testID }) => {
    const MockPicker = require('react-native').TouchableOpacity;
    return MockPicker;
  },
  'Picker.Item': ({ label, value }) => {
    const MockItem = require('react-native').Text;
    return MockItem;
  }
}));

// Mock react-native-calendars
jest.mock('react-native-calendars', () => ({
  Calendar: 'Calendar',
  CalendarList: 'CalendarList',
  Agenda: 'Agenda'
}));

// Mock react-native-calendar-picker
jest.mock('react-native-calendar-picker', () => 'CalendarPicker');

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  Provider: ({ children }) => children,
  DefaultTheme: {},
  Button: 'Button',
  Card: 'Card',
  Title: 'Title',
  Paragraph: 'Paragraph',
  List: {
    Item: 'ListItem',
    Icon: 'ListIcon',
    Section: 'ListSection'
  },
  TextInput: 'TextInput',
  Snackbar: 'Snackbar',
  Portal: ({ children }) => children,
  Modal: 'Modal',
  Surface: 'Surface',
  Chip: 'Chip',
  Avatar: {
    Text: 'AvatarText',
    Image: 'AvatarImage',
    Icon: 'AvatarIcon'
  },
  FAB: 'FAB',
  IconButton: 'IconButton',
  Menu: 'Menu',
  Divider: 'Divider',
  Switch: 'Switch',
  RadioButton: 'RadioButton',
  Checkbox: 'Checkbox'
}));

// Mock expo modules
jest.mock('expo-constants', () => ({
  default: {
    manifest: {
      extra: {
        apiUrl: 'http://localhost:8000'
      }
    }
  }
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images'
  }
}));

jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(),
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn()
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    dispatch: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn()
  }),
  useRoute: () => ({
    params: {},
    key: 'test-route',
    name: 'TestScreen'
  }),
  useFocusEffect: jest.fn(),
  NavigationContainer: ({ children }) => children
}));

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert.alert = jest.fn();
  return RN;
});

// Global test utilities
global.mockApiResponse = (data, status = 200) => {
  return Promise.resolve({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {}
  });
};

global.mockApiError = (message, status = 500) => {
  const error = new Error(message);
  error.response = {
    data: { error: message },
    status,
    statusText: 'Internal Server Error'
  };
  return Promise.reject(error);
};

// Performance monitoring for integration tests
global.performanceMonitor = {
  start: (testName) => {
    global.performanceMonitor._startTimes = global.performanceMonitor._startTimes || {};
    global.performanceMonitor._startTimes[testName] = Date.now();
  },
  end: (testName) => {
    if (global.performanceMonitor._startTimes && global.performanceMonitor._startTimes[testName]) {
      const duration = Date.now() - global.performanceMonitor._startTimes[testName];
      console.log(`Performance: ${testName} took ${duration}ms`);
      return duration;
    }
    return 0;
  }
};

// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console warnings for tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: componentWillReceiveProps has been renamed') ||
     args[0].includes('Warning: componentWillMount has been renamed'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';

console.log('Integration test setup completed');