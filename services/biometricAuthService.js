import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class BiometricAuthService {
  constructor() {
    this.isSupported = false;
    this.availableTypes = [];
    this.isEnrolled = false;
  }

  /**
   * Initialize biometric authentication service
   */
  async initialize() {
    try {
      // Check if biometric authentication is supported
      this.isSupported = await LocalAuthentication.hasHardwareAsync();
      
      if (this.isSupported) {
        // Get available biometric types
        this.availableTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        
        // Check if user has enrolled biometrics
        this.isEnrolled = await LocalAuthentication.isEnrolledAsync();
      }

      return {
        isSupported: this.isSupported,
        availableTypes: this.availableTypes,
        isEnrolled: this.isEnrolled
      };
    } catch (error) {
      console.error('Error initializing biometric auth:', error);
      return {
        isSupported: false,
        availableTypes: [],
        isEnrolled: false
      };
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(options = {}) {
    try {
      if (!this.isSupported || !this.isEnrolled) {
        throw new Error('Biometric authentication not available');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.promptMessage || 'Authenticate to access RxDoctor',
        cancelLabel: options.cancelLabel || 'Cancel',
        fallbackLabel: options.fallbackLabel || 'Use Password',
        disableDeviceFallback: options.disableDeviceFallback || false,
        ...options
      });

      if (result.success) {
        // Store successful authentication timestamp
        await AsyncStorage.setItem('lastBiometricAuth', Date.now().toString());
        return {
          success: true,
          authType: result.authType || 'biometric'
        };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed',
          warning: result.warning
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  /**
   * Check if biometric authentication is required
   */
  async isBiometricRequired() {
    try {
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
      const lastAuth = await AsyncStorage.getItem('lastBiometricAuth');
      
      if (biometricEnabled !== 'true') {
        return false;
      }

      if (!lastAuth) {
        return true;
      }

      // Check if authentication is older than 15 minutes
      const authTime = parseInt(lastAuth);
      const currentTime = Date.now();
      const timeDiff = currentTime - authTime;
      const fifteenMinutes = 15 * 60 * 1000;

      return timeDiff > fifteenMinutes;
    } catch (error) {
      console.error('Error checking biometric requirement:', error);
      return true; // Default to requiring authentication
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric() {
    try {
      if (!this.isSupported || !this.isEnrolled) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Please set up biometric authentication in your device settings first.'
        );
        return false;
      }

      // Test authentication before enabling
      const authResult = await this.authenticate({
        promptMessage: 'Authenticate to enable biometric login'
      });

      if (authResult.success) {
        await AsyncStorage.setItem('biometricEnabled', 'true');
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric() {
    try {
      await AsyncStorage.removeItem('biometricEnabled');
      await AsyncStorage.removeItem('lastBiometricAuth');
      return true;
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
      return false;
    }
  }

  /**
   * Get biometric authentication status
   */
  async getBiometricStatus() {
    try {
      const enabled = await AsyncStorage.getItem('biometricEnabled');
      return {
        enabled: enabled === 'true',
        supported: this.isSupported,
        enrolled: this.isEnrolled,
        availableTypes: this.availableTypes
      };
    } catch (error) {
      console.error('Error getting biometric status:', error);
      return {
        enabled: false,
        supported: false,
        enrolled: false,
        availableTypes: []
      };
    }
  }

  /**
   * Get human-readable biometric type names
   */
  getBiometricTypeNames() {
    const typeNames = [];
    
    if (this.availableTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      typeNames.push('Fingerprint');
    }
    
    if (this.availableTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      typeNames.push('Face ID');
    }
    
    if (this.availableTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      typeNames.push('Iris');
    }

    return typeNames;
  }
}

export default new BiometricAuthService();