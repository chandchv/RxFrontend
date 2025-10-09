/**
 * Clinical Records Service Configuration
 * 
 * This file manages the configuration for the clinical records service,
 * allowing easy switching between different service endpoints and configurations.
 */

export const CLINICAL_RECORDS_CONFIG = {
  // Service URLs
  SERVICE_URL: 'http://172.20.10.2:8001', // New standalone Clinical Records Service
  LEGACY_SERVICE_URL: 'http://172.20.10.2:8000', // Main RxBackend service
  
  // API Endpoints
  ENDPOINTS: {
    // Records
    RECORDS: '/api/records/',
    RECORD_DETAIL: (id) => `/api/records/${id}/`,
    RECORDS_SEARCH: '/api/records/search/',
    
    // Documents
    DOCUMENTS: '/api/documents/',
    DOCUMENT_DETAIL: (id) => `/api/documents/${id}/`,
    DOCUMENT_UPLOAD: '/api/documents/upload/',
    DOCUMENT_DOWNLOAD: (id) => `/api/documents/${id}/download/`,
    DOCUMENT_VIEW: (id) => `/api/documents/${id}/view/`,
    
    // Dashboard
    DASHBOARD_STATS: '/api/dashboard-stats/',
    ANALYTICS: '/api/analytics/',
    
    // Widget
    WIDGET: '/api/widget/',
  },
  
  // Feature flags
  FEATURES: {
    USE_STANDALONE_SERVICE: true, // Set to false to use legacy service
    ENABLE_REAL_TIME_UPDATES: true,
    ENABLE_OFFLINE_SYNC: true,
    ENABLE_DOCUMENT_PREVIEW: true,
    ENABLE_SEARCH_SUGGESTIONS: true,
  },
  
  // Authentication
  AUTH: {
    USE_BEARER_TOKEN: true,
    TOKEN_HEADER: 'Authorization',
    TOKEN_PREFIX: 'Bearer',
  },
  
  // Upload settings
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
    ENABLE_CHUNKED_UPLOAD: true,
    CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  },
  
  // Cache settings
  CACHE: {
    ENABLE_CACHING: true,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  },
  
  // Error handling
  ERROR_HANDLING: {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    SHOW_ERROR_MESSAGES: true,
    LOG_ERRORS: true,
  },
};

/**
 * Get the current service URL based on configuration
 */
export const getServiceURL = () => {
  return CLINICAL_RECORDS_CONFIG.FEATURES.USE_STANDALONE_SERVICE 
    ? CLINICAL_RECORDS_CONFIG.SERVICE_URL 
    : CLINICAL_RECORDS_CONFIG.LEGACY_SERVICE_URL;
};

/**
 * Get the full URL for an endpoint
 */
export const getEndpointURL = (endpoint) => {
  return `${getServiceURL()}${endpoint}`;
};

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (feature) => {
  return CLINICAL_RECORDS_CONFIG.FEATURES[feature] || false;
};

export default CLINICAL_RECORDS_CONFIG;
