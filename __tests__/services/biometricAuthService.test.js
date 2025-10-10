import biometricAuthService from '../../services/biometricAuthService';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('expo-local-authentication');
jest.mock('@react-native-async-storage/async-storage');

describe('BiometricAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    biometricAuthService.isSupported = false;
    biometricAuthService.availableTypes = [];
    biometricAuthService.isEnrolled = false;
  });

  describe('initialize', () => {
    it('should initialize biometric authentication successfully', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ]);
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);

      const result = await biometricAuthService.initialize();

      expect(result.isSupported).toBe(true);
      expect(result.availableTypes).toEqual([LocalAuthentication.AuthenticationType.FINGERPRINT]);
      expect(result.isEnrolled).toBe(true);
    });

    it('should handle initialization when biometrics not supported', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);

      const result = await biometricAuthService.initialize();

      expect(result.isSupported).toBe(false);
      expect(result.availableTypes).toEqual([]);
      expect(result.isEnrolled).toBe(false);
    });

    it('should handle initialization errors gracefully', async () => {
      LocalAuthentication.hasHardwareAsync.mockRejectedValue(new Error('Hardware error'));

      const result = await biometricAuthService.initialize();

      expect(result.isSupported).toBe(false);
      expect(result.availableTypes).toEqual([]);
      expect(result.isEnrolled).toBe(false);
    });
  });

  describe('authenticate', () => {
    beforeEach(() => {
      biometricAuthService.isSupported = true;
      biometricAuthService.isEnrolled = true;
    });

    it('should authenticate successfully', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: true,
        authType: 'fingerprint'
      });
      AsyncStorage.setItem.mockResolvedValue();

      const result = await biometricAuthService.authenticate();

      expect(result.success).toBe(true);
      expect(result.authType).toBe('fingerprint');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'lastBiometricAuth',
        expect.any(String)
      );
    });

    it('should handle authentication failure', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'Authentication failed'
      });

      const result = await biometricAuthService.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should handle authentication when not supported', async () => {
      biometricAuthService.isSupported = false;

      const result = await biometricAuthService.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric authentication not available');
    });

    it('should handle authentication with custom options', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: true,
        authType: 'face'
      });
      AsyncStorage.setItem.mockResolvedValue();

      const options = {
        promptMessage: 'Custom prompt',
        cancelLabel: 'Custom cancel'
      };

      await biometricAuthService.authenticate(options);

      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining(options)
      );
    });
  });

  describe('isBiometricRequired', () => {
    it('should return false when biometric is disabled', async () => {
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'biometricEnabled') return Promise.resolve('false');
        return Promise.resolve(null);
      });

      const result = await biometricAuthService.isBiometricRequired();

      expect(result).toBe(false);
    });

    it('should return true when no previous authentication', async () => {
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'biometricEnabled') return Promise.resolve('true');
        if (key === 'lastBiometricAuth') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const result = await biometricAuthService.isBiometricRequired();

      expect(result).toBe(true);
    });

    it('should return true when authentication is older than 15 minutes', async () => {
      const oldTime = Date.now() - (20 * 60 * 1000); // 20 minutes ago
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'biometricEnabled') return Promise.resolve('true');
        if (key === 'lastBiometricAuth') return Promise.resolve(oldTime.toString());
        return Promise.resolve(null);
      });

      const result = await biometricAuthService.isBiometricRequired();

      expect(result).toBe(true);
    });

    it('should return false when authentication is recent', async () => {
      const recentTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'biometricEnabled') return Promise.resolve('true');
        if (key === 'lastBiometricAuth') return Promise.resolve(recentTime.toString());
        return Promise.resolve(null);
      });

      const result = await biometricAuthService.isBiometricRequired();

      expect(result).toBe(false);
    });
  });

  describe('enableBiometric', () => {
    beforeEach(() => {
      biometricAuthService.isSupported = true;
      biometricAuthService.isEnrolled = true;
    });

    it('should enable biometric authentication successfully', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: true
      });
      AsyncStorage.setItem.mockResolvedValue();

      const result = await biometricAuthService.enableBiometric();

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('biometricEnabled', 'true');
    });

    it('should fail to enable when authentication fails', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: false
      });

      const result = await biometricAuthService.enableBiometric();

      expect(result).toBe(false);
    });

    it('should fail to enable when biometrics not supported', async () => {
      biometricAuthService.isSupported = false;

      const result = await biometricAuthService.enableBiometric();

      expect(result).toBe(false);
    });
  });

  describe('disableBiometric', () => {
    it('should disable biometric authentication successfully', async () => {
      AsyncStorage.removeItem.mockResolvedValue();

      const result = await biometricAuthService.disableBiometric();

      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('biometricEnabled');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('lastBiometricAuth');
    });

    it('should handle disable errors gracefully', async () => {
      AsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      const result = await biometricAuthService.disableBiometric();

      expect(result).toBe(false);
    });
  });

  describe('getBiometricStatus', () => {
    it('should return correct biometric status', async () => {
      biometricAuthService.isSupported = true;
      biometricAuthService.isEnrolled = true;
      biometricAuthService.availableTypes = [LocalAuthentication.AuthenticationType.FINGERPRINT];
      AsyncStorage.getItem.mockResolvedValue('true');

      const result = await biometricAuthService.getBiometricStatus();

      expect(result).toEqual({
        enabled: true,
        supported: true,
        enrolled: true,
        availableTypes: [LocalAuthentication.AuthenticationType.FINGERPRINT]
      });
    });

    it('should handle status check errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await biometricAuthService.getBiometricStatus();

      expect(result).toEqual({
        enabled: false,
        supported: false,
        enrolled: false,
        availableTypes: []
      });
    });
  });

  describe('getBiometricTypeNames', () => {
    it('should return correct type names for fingerprint', () => {
      biometricAuthService.availableTypes = [LocalAuthentication.AuthenticationType.FINGERPRINT];

      const result = biometricAuthService.getBiometricTypeNames();

      expect(result).toEqual(['Fingerprint']);
    });

    it('should return correct type names for face ID', () => {
      biometricAuthService.availableTypes = [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION];

      const result = biometricAuthService.getBiometricTypeNames();

      expect(result).toEqual(['Face ID']);
    });

    it('should return multiple type names', () => {
      biometricAuthService.availableTypes = [
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      ];

      const result = biometricAuthService.getBiometricTypeNames();

      expect(result).toEqual(['Fingerprint', 'Face ID']);
    });

    it('should return empty array when no types available', () => {
      biometricAuthService.availableTypes = [];

      const result = biometricAuthService.getBiometricTypeNames();

      expect(result).toEqual([]);
    });
  });
});