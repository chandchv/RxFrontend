/**
 * Enhanced Debug Utilities for React Native
 * 
 * Alternative debugging methods when React Native DevTools are not available
 */

import { Alert } from 'react-native';

// Debug levels
export const DEBUG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  TRACE: 'TRACE'
};

// Global debug configuration
let debugConfig = {
  enabled: __DEV__, // Only enable in development
  level: DEBUG_LEVELS.INFO,
  showAlerts: false,
  logToFile: false,
  maxLogEntries: 1000
};

// In-memory log storage
let logEntries = [];

/**
 * Enhanced logger with multiple output methods
 */
export const debugLog = (level, message, data = null, component = '') => {
  if (!debugConfig.enabled) return;

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
    component
  };

  // Add to in-memory storage
  logEntries.push(logEntry);
  if (logEntries.length > debugConfig.maxLogEntries) {
    logEntries.shift();
  }

  // Console output
  const logMessage = `[${timestamp}] [${level}] ${component ? `[${component}] ` : ''}${message}`;
  
  switch (level) {
    case DEBUG_LEVELS.ERROR:
      console.error(logMessage, data);
      if (debugConfig.showAlerts) {
        Alert.alert('Debug Error', `${message}\n\n${JSON.stringify(data, null, 2)}`);
      }
      break;
    case DEBUG_LEVELS.WARN:
      console.warn(logMessage, data);
      break;
    case DEBUG_LEVELS.INFO:
      console.info(logMessage, data);
      break;
    case DEBUG_LEVELS.DEBUG:
      console.log(logMessage, data);
      break;
    case DEBUG_LEVELS.TRACE:
      console.trace(logMessage, data);
      break;
  }
};

// Convenience methods
export const debugError = (message, data, component) => debugLog(DEBUG_LEVELS.ERROR, message, data, component);
export const debugWarn = (message, data, component) => debugLog(DEBUG_LEVELS.WARN, message, data, component);
export const debugInfo = (message, data, component) => debugLog(DEBUG_LEVELS.INFO, message, data, component);
export const debugDebug = (message, data, component) => debugLog(DEBUG_LEVELS.DEBUG, message, data, component);
export const debugTrace = (message, data, component) => debugLog(DEBUG_LEVELS.TRACE, message, data, component);

/**
 * API Request Logger
 */
export const logApiRequest = (method, url, data = null, response = null, error = null) => {
  const logData = {
    method,
    url,
    requestData: data,
    response,
    error: error?.message || error,
    status: response?.status,
    duration: response?.duration
  };

  if (error) {
    debugError(`API ${method} ${url} failed`, logData, 'API');
  } else {
    debugInfo(`API ${method} ${url} successful`, logData, 'API');
  }
};

/**
 * Component Lifecycle Logger
 */
export const logComponentLifecycle = (componentName, lifecycle, props = null) => {
  debugDebug(`Component ${lifecycle}`, { componentName, props }, componentName);
};

/**
 * Navigation Logger
 */
export const logNavigation = (from, to, params = null) => {
  debugInfo(`Navigation: ${from} → ${to}`, { params }, 'Navigation');
};

/**
 * Performance Logger
 */
export const logPerformance = (operation, duration, details = null) => {
  debugInfo(`Performance: ${operation} took ${duration}ms`, details, 'Performance');
};

/**
 * Get all log entries
 */
export const getLogEntries = () => {
  return [...logEntries];
};

/**
 * Clear log entries
 */
export const clearLogs = () => {
  logEntries = [];
};

/**
 * Export logs as string
 */
export const exportLogs = () => {
  return logEntries.map(entry => 
    `[${entry.timestamp}] [${entry.level}] ${entry.component ? `[${entry.component}] ` : ''}${entry.message}`
  ).join('\n');
};

/**
 * Configure debug settings
 */
export const configureDebug = (config) => {
  debugConfig = { ...debugConfig, ...config };
};

/**
 * React Hook for component debugging
 */
export const useDebug = (componentName) => {
  return {
    error: (message, data) => debugError(message, data, componentName),
    warn: (message, data) => debugWarn(message, data, componentName),
    info: (message, data) => debugInfo(message, data, componentName),
    debug: (message, data) => debugDebug(message, data, componentName),
    trace: (message, data) => debugTrace(message, data, componentName),
    lifecycle: (lifecycle, props) => logComponentLifecycle(componentName, lifecycle, props)
  };
};

export default {
  debugLog,
  debugError,
  debugWarn,
  debugInfo,
  debugDebug,
  debugTrace,
  logApiRequest,
  logComponentLifecycle,
  logNavigation,
  logPerformance,
  getLogEntries,
  clearLogs,
  exportLogs,
  configureDebug,
  useDebug
};
