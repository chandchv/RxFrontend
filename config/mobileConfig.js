/**
 * Mobile Configuration
 * 
 * Configuration settings specific to mobile functionality including
 * API endpoints, caching, offline sync, and push notifications.
 */

import { Platform } from 'react-native';
import { API_URL, APP_VERSION } from '../config';

export const MOBILE_CONFIG = {
  // API Configuration
  api: {
    baseURL: API_URL,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    
    // Mobile-specific endpoints
    endpoints: {
      mobile: {
        dashboard: '/api/mobile/dashboard/',
        clinicalRecords: '/api/mobile/clinical-records/',
        notifications: '/api/mobile/notifications/',
      },
    },
  },

  // Caching Configuration
  cache: {
    defaultTTL: 300000, // 5 minutes
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    
    // Cache TTL for different data types
    ttl: {
      dashboard: 300000, // 5 minutes
      clinicalRecords: 600000, // 10 minutes
      notifications: 60000, // 1 minute
      userProfile: 3600000, // 1 hour
      preferences: 86400000, // 24 hours
    },
  },

  // Offline Sync Configuration
  sync: {
    enabled: true,
    syncInterval: 300000, // 5 minutes
    maxOfflineActions: 100,
    maxOfflineNotifications: 100,
    
    // Sync priorities
    priorities: {
      high: ['notifications', 'alerts'],
      medium: ['dashboard', 'appointments'],
      low: ['preferences', 'settings'],
    },
  },

  // Push Notification Configuration
  notifications: {
    enabled: true,
    
    // Expo configuration
    expo: {
      projectId: 'your-expo-project-id', // Replace with actual project ID
      experienceId: '@your-username/rx-frontend', // Replace with actual experience ID
    },
    
    // Notification categories
    categories: {
      appointment: {
        identifier: 'appointment',
        actions: [
          {
            identifier: 'view',
            title: 'View',
            options: { foreground: true },
          },
          {
            identifier: 'reschedule',
            title: 'Reschedule',
            options: { foreground: true },
          },
        ],
      },
      clinical_record: {
        identifier: 'clinical_record',
        actions: [
          {
            identifier: 'view',
            title: 'View',
            options: { foreground: true },
          },
        ],
      },
      prescription: {
        identifier: 'prescription',
        actions: [
          {
            identifier: 'view',
            title: 'View',
            options: { foreground: true },
          },
          {
            identifier: 'refill',
            title: 'Refill',
            options: { foreground: true },
          },
        ],
      },
    },
    
    // Default notification settings
    defaults: {
      sound: true,
      badge: true,
      alert: true,
      priority: 'high',
    },
  },

  // Real-time Updates Configuration
  realTime: {
    enabled: true,
    pollingInterval: 30000, // 30 seconds
    maxRetries: 3,
    backoffMultiplier: 2,
    
    // Update types to monitor
    updateTypes: [
      'notifications',
      'alerts',
      'appointments',
      'clinical_records',
      'prescriptions',
    ],
  },

  // UI Configuration
  ui: {
    // Pagination
    pagination: {
      defaultPageSize: 10,
      maxPageSize: 50,
      
      // Page sizes for different screens
      pageSizes: {
        dashboard: 5,
        clinicalRecords: 10,
        notifications: 20,
        search: 15,
      },
    },
    
    // Loading states
    loading: {
      minDisplayTime: 500, // Minimum time to show loading spinner
      skeletonCount: 5, // Number of skeleton items to show
    },
    
    // Refresh control
    refresh: {
      tintColor: '#2196F3',
      colors: ['#2196F3', '#4CAF50', '#FF9800'],
    },
    
    // Animation durations
    animations: {
      fast: 200,
      normal: 300,
      slow: 500,
    },
  },

  // File Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
    ],
    
    // Image compression settings
    imageCompression: {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
    },
    
    // Upload chunk size for large files
    chunkSize: 1024 * 1024, // 1MB chunks
  },

  // Security Configuration
  security: {
    // Token refresh threshold (refresh when token expires in X milliseconds)
    tokenRefreshThreshold: 300000, // 5 minutes
    
    // Biometric authentication
    biometric: {
      enabled: true,
      fallbackToPassword: true,
      promptMessage: 'Authenticate to access RxDoctor',
    },
    
    // Session timeout
    sessionTimeout: 3600000, // 1 hour
    
    // Auto-lock after inactivity
    autoLockTimeout: 300000, // 5 minutes
  },

  // Performance Configuration
  performance: {
    // Image loading
    images: {
      placeholder: require('../assets/images/placeholder.png'),
      errorImage: require('../assets/images/error.png'),
      cachePolicy: 'memory-disk',
    },
    
    // List optimization
    lists: {
      initialNumToRender: 10,
      maxToRenderPerBatch: 5,
      windowSize: 10,
      removeClippedSubviews: true,
    },
    
    // Memory management
    memory: {
      lowMemoryThreshold: 0.8, // 80% of available memory
      clearCacheOnLowMemory: true,
    },
  },

  // Development Configuration
  development: {
    enableLogging: __DEV__,
    logLevel: __DEV__ ? 'debug' : 'error',
    enableReduxDevTools: __DEV__,
    enableFlipperIntegration: __DEV__,
    
    // Mock data for development
    useMockData: false,
    mockDelay: 1000, // Simulate network delay
  },

  // Platform-specific Configuration
  platform: {
    ios: {
      statusBarStyle: 'dark-content',
      navigationBarStyle: 'default',
    },
    android: {
      statusBarStyle: 'dark-content',
      navigationBarColor: '#ffffff',
      navigationBarStyle: 'light-content',
    },
  },

  // Feature Flags
  features: {
    // Core features
    dashboard: true,
    clinicalRecords: true,
    notifications: true,
    
    // Advanced features
    offlineSync: true,
    realTimeUpdates: true,
    pushNotifications: true,
    biometricAuth: Platform.OS === 'ios' || Platform.OS === 'android',
    
    // Experimental features
    voiceNotes: false,
    aiAssistant: false,
    telemedicine: false,
  },

  // App Information
  app: {
    version: APP_VERSION,
    buildNumber: '1',
    bundleId: Platform.OS === 'ios' ? 'com.rxdoctor.mobile' : 'com.rxdoctor.mobile',
    
    // Store information
    storeUrls: {
      ios: 'https://apps.apple.com/app/rxdoctor/id123456789',
      android: 'https://play.google.com/store/apps/details?id=com.rxdoctor.mobile',
    },
    
    // Support information
    support: {
      email: 'support@rxdoctor.com',
      phone: '+1-800-RXDOCTOR',
      website: 'https://rxdoctor.com/support',
    },
  },
};

// Environment-specific overrides
if (__DEV__) {
  // Development overrides
  MOBILE_CONFIG.api.timeout = 60000; // Longer timeout for development
  MOBILE_CONFIG.cache.defaultTTL = 60000; // Shorter cache for development
  MOBILE_CONFIG.sync.syncInterval = 60000; // More frequent sync for testing
}

// Platform-specific overrides
if (Platform.OS === 'ios') {
  MOBILE_CONFIG.notifications.defaults.sound = 'default';
} else if (Platform.OS === 'android') {
  MOBILE_CONFIG.notifications.defaults.sound = 'default';
  MOBILE_CONFIG.notifications.defaults.vibrate = [0, 250, 250, 250];
}

export default MOBILE_CONFIG;