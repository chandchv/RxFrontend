/**
 * Mobile Utilities
 * 
 * Utility functions for mobile-specific functionality including
 * device info, network status, file handling, and UI helpers.
 */

import { Platform, Dimensions, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import MOBILE_CONFIG from '../config/mobileConfig';

/**
 * Device Information Utilities
 */
export const DeviceUtils = {
  /**
   * Get device information
   */
  getDeviceInfo: async () => {
    try {
      const info = {
        platform: Platform.OS,
        version: Platform.Version,
        deviceName: Device.deviceName,
        modelName: Device.modelName,
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        isDevice: Device.isDevice,
        screenDimensions: Dimensions.get('screen'),
        windowDimensions: Dimensions.get('window'),
      };
      
      return info;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  },

  /**
   * Check if device is tablet
   */
  isTablet: () => {
    const { width, height } = Dimensions.get('screen');
    const aspectRatio = width / height;
    const minDimension = Math.min(width, height);
    
    // Consider it a tablet if minimum dimension > 600 and aspect ratio is reasonable
    return minDimension > 600 && aspectRatio > 0.6 && aspectRatio < 1.4;
  },

  /**
   * Get device orientation
   */
  getOrientation: () => {
    const { width, height } = Dimensions.get('screen');
    return width > height ? 'landscape' : 'portrait';
  },

  /**
   * Generate unique device ID
   */
  generateDeviceId: async () => {
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error generating device ID:', error);
      return `fallback_${Date.now()}`;
    }
  },
};

/**
 * Network Utilities
 */
export const NetworkUtils = {
  /**
   * Check network connectivity
   */
  checkConnectivity: async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return {
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable,
        type: networkState.type,
      };
    } catch (error) {
      console.error('Error checking connectivity:', error);
      return { isConnected: false, isInternetReachable: false, type: 'unknown' };
    }
  },

  /**
   * Monitor network changes
   */
  monitorNetworkChanges: (callback) => {
    return Network.addNetworkStateListener(callback);
  },

  /**
   * Check if connection is metered (cellular)
   */
  isMeteredConnection: async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.type === Network.NetworkStateType.CELLULAR;
    } catch (error) {
      console.error('Error checking metered connection:', error);
      return false;
    }
  },
};

/**
 * File Handling Utilities
 */
export const FileUtils = {
  /**
   * Pick image from camera or gallery
   */
  pickImage: async (options = {}) => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing || true,
        aspect: options.aspect || [4, 3],
        quality: options.quality || MOBILE_CONFIG.upload.imageCompression.quality,
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  },

  /**
   * Take photo with camera
   */
  takePhoto: async (options = {}) => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: options.allowsEditing || true,
        aspect: options.aspect || [4, 3],
        quality: options.quality || MOBILE_CONFIG.upload.imageCompression.quality,
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  },

  /**
   * Pick document
   */
  pickDocument: async (options = {}) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: options.type || '*/*',
        copyToCacheDirectory: true,
        multiple: options.multiple || false,
        ...options,
      });

      if (result.type === 'success') {
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Error picking document:', error);
      throw error;
    }
  },

  /**
   * Get file info
   */
  getFileInfo: async (uri) => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  },

  /**
   * Validate file size
   */
  validateFileSize: (fileSize, maxSize = MOBILE_CONFIG.upload.maxFileSize) => {
    return fileSize <= maxSize;
  },

  /**
   * Validate file type
   */
  validateFileType: (mimeType, allowedTypes = MOBILE_CONFIG.upload.allowedTypes) => {
    return allowedTypes.includes(mimeType);
  },

  /**
   * Format file size
   */
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};

/**
 * UI Utilities
 */
export const UIUtils = {
  /**
   * Show alert with options
   */
  showAlert: (title, message, buttons = []) => {
    const defaultButtons = [{ text: 'OK', style: 'default' }];
    Alert.alert(title, message, buttons.length > 0 ? buttons : defaultButtons);
  },

  /**
   * Show confirmation dialog
   */
  showConfirmation: (title, message, onConfirm, onCancel) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'OK', style: 'default', onPress: onConfirm },
      ]
    );
  },

  /**
   * Show action sheet (iOS) or alert (Android)
   */
  showActionSheet: (title, options, onSelect) => {
    if (Platform.OS === 'ios') {
      // Use ActionSheetIOS for iOS
      const ActionSheetIOS = require('react-native').ActionSheetIOS;
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: [...options, 'Cancel'],
          cancelButtonIndex: options.length,
        },
        (buttonIndex) => {
          if (buttonIndex < options.length) {
            onSelect(buttonIndex);
          }
        }
      );
    } else {
      // Use Alert for Android
      const buttons = options.map((option, index) => ({
        text: option,
        onPress: () => onSelect(index),
      }));
      buttons.push({ text: 'Cancel', style: 'cancel' });
      
      Alert.alert(title, '', buttons);
    }
  },

  /**
   * Open external URL
   */
  openURL: async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open URL: ${url}`);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open URL');
    }
  },

  /**
   * Get responsive dimensions
   */
  getResponsiveDimensions: () => {
    const { width, height } = Dimensions.get('window');
    const isTablet = DeviceUtils.isTablet();
    
    return {
      width,
      height,
      isTablet,
      isSmallScreen: width < 375,
      isMediumScreen: width >= 375 && width < 414,
      isLargeScreen: width >= 414,
    };
  },

  /**
   * Calculate responsive font size
   */
  getResponsiveFontSize: (baseSize) => {
    const { width } = Dimensions.get('window');
    const scale = width / 375; // Base width (iPhone 6/7/8)
    const newSize = baseSize * scale;
    
    // Ensure minimum and maximum font sizes
    return Math.max(12, Math.min(newSize, baseSize * 1.3));
  },
};

/**
 * Storage Utilities
 */
export const StorageUtils = {
  /**
   * Store data with expiration
   */
  setWithExpiry: async (key, value, ttl = MOBILE_CONFIG.cache.defaultTTL) => {
    try {
      const item = {
        value,
        expiry: Date.now() + ttl,
      };
      await AsyncStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('Error storing data with expiry:', error);
    }
  },

  /**
   * Get data with expiration check
   */
  getWithExpiry: async (key) => {
    try {
      const itemStr = await AsyncStorage.getItem(key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Error getting data with expiry:', error);
      return null;
    }
  },

  /**
   * Clear expired items
   */
  clearExpired: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const expiredKeys = [];

      for (const key of keys) {
        try {
          const itemStr = await AsyncStorage.getItem(key);
          if (itemStr) {
            const item = JSON.parse(itemStr);
            if (item.expiry && Date.now() > item.expiry) {
              expiredKeys.push(key);
            }
          }
        } catch (error) {
          // Skip invalid items
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
      }

      return expiredKeys.length;
    } catch (error) {
      console.error('Error clearing expired items:', error);
      return 0;
    }
  },

  /**
   * Get storage usage
   */
  getStorageUsage: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return {
        keys: keys.length,
        size: totalSize,
        sizeFormatted: FileUtils.formatFileSize(totalSize),
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { keys: 0, size: 0, sizeFormatted: '0 Bytes' };
    }
  },
};

/**
 * Date and Time Utilities
 */
export const DateUtils = {
  /**
   * Format date for mobile display
   */
  formatDate: (date, format = 'short') => {
    const d = new Date(date);
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString();
      case 'long':
        return d.toLocaleDateString(undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'time':
        return d.toLocaleTimeString(undefined, { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      case 'datetime':
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString(undefined, { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      case 'relative':
        return getRelativeTime(d);
      default:
        return d.toLocaleDateString();
    }
  },

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime: (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  },

  /**
   * Check if date is today
   */
  isToday: (date) => {
    const today = new Date();
    const d = new Date(date);
    return d.toDateString() === today.toDateString();
  },

  /**
   * Check if date is this week
   */
  isThisWeek: (date) => {
    const now = new Date();
    const d = new Date(date);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    
    return d >= startOfWeek && d <= endOfWeek;
  },
};

// Helper function for relative time
const getRelativeTime = (date) => {
  return DateUtils.getRelativeTime(date);
};

export default {
  DeviceUtils,
  NetworkUtils,
  FileUtils,
  UIUtils,
  StorageUtils,
  DateUtils,
};