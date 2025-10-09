import secureTokenService from '../../services/secureTokenService';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('crypto-js');

describe('SecureTokenService', () => {
  const mockEncryptionKey = 'mock-encryption-key';
  const mockToken = 'mock-access-token';
  const mockEncryptedToken = 'mock-encrypted-token';

  beforeEach(() => {
    jest.clearAllMocks();
    secureTokenService.encryptionKey = null;
    
    // Mock CryptoJS
    CryptoJS.lib = {
      WordArray: {
        random: jest.fn().mockReturnValue({ toString: () => mockEncryptionKey })
      }
    };
    CryptoJS.AES = {
      encrypt: jest.fn().mockReturnValue({ toString: () => mockEncryptedToken }),
      decrypt: jest.fn().mockReturnValue({ toString: () => mockToken })
    };
    CryptoJS.enc = {
      Utf8: 'utf8'
    };
  });

  describe('initialize', () => {
    it('should initialize with existing encryption key', async () => {
      SecureStore.getItemAsync.mockResolvedValue(mockEncryptionKey);

      const result = await secureTokenService.initialize();

      expect(result).toBe(true);
      expect(secureTokenService.encryptionKey).toBe(mockEncryptionKey);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('rxdoctor_encryption_key');
    });

    it('should generate new encryption key when none exists', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue();

      const result = await secureTokenService.initialize();

      expect(result).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'rxdoctor_encryption_key',
        mockEncryptionKey
      );
    });

    it('should handle initialization errors', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('SecureStore error'));

      const result = await secureTokenService.initialize();

      expect(result).toBe(false);
    });
  });

  describe('storeAccessToken', () => {
    beforeEach(() => {
      secureTokenService.encryptionKey = mockEncryptionKey;
    });

    it('should store access token successfully', async () => {
      SecureStore.setItemAsync.mockResolvedValue();
      AsyncStorage.setItem.mockResolvedValue();

      const result = await secureTokenService.storeAccessToken(mockToken);

      expect(result).toBe(true);
      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(mockToken, mockEncryptionKey);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'rxdoctor_access_token',
        mockEncryptedToken
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'rxdoctor_token_stored_at',
        expect.any(String)
      );
    });

    it('should initialize if encryption key not set', async () => {
      secureTokenService.encryptionKey = null;
      SecureStore.getItemAsync.mockResolvedValue(mockEncryptionKey);
      SecureStore.setItemAsync.mockResolvedValue();
      AsyncStorage.setItem.mockResolvedValue();

      const result = await secureTokenService.storeAccessToken(mockToken);

      expect(result).toBe(true);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('rxdoctor_encryption_key');
    });

    it('should handle storage errors', async () => {
      SecureStore.setItemAsync.mockRejectedValue(new Error('Storage error'));

      const result = await secureTokenService.storeAccessToken(mockToken);

      expect(result).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    beforeEach(() => {
      secureTokenService.encryptionKey = mockEncryptionKey;
    });

    it('should retrieve and decrypt access token', async () => {
      SecureStore.getItemAsync.mockResolvedValue(mockEncryptedToken);

      const result = await secureTokenService.getAccessToken();

      expect(result).toBe(mockToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('rxdoctor_access_token');
      expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(mockEncryptedToken, mockEncryptionKey);
    });

    it('should return null when no token exists', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);

      const result = await secureTokenService.getAccessToken();

      expect(result).toBe(null);
    });

    it('should return null when decryption fails', async () => {
      SecureStore.getItemAsync.mockResolvedValue(mockEncryptedToken);
      CryptoJS.AES.decrypt.mockReturnValue({ toString: () => '' });

      const result = await secureTokenService.getAccessToken();

      expect(result).toBe(null);
    });

    it('should handle retrieval errors', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('Retrieval error'));

      const result = await secureTokenService.getAccessToken();

      expect(result).toBe(null);
    });
  });

  describe('storeRefreshToken', () => {
    beforeEach(() => {
      secureTokenService.encryptionKey = mockEncryptionKey;
    });

    it('should store refresh token successfully', async () => {
      SecureStore.setItemAsync.mockResolvedValue();

      const result = await secureTokenService.storeRefreshToken(mockToken);

      expect(result).toBe(true);
      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(mockToken, mockEncryptionKey);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'rxdoctor_refresh_token',
        mockEncryptedToken
      );
    });
  });

  describe('getRefreshToken', () => {
    beforeEach(() => {
      secureTokenService.encryptionKey = mockEncryptionKey;
    });

    it('should retrieve and decrypt refresh token', async () => {
      SecureStore.getItemAsync.mockResolvedValue(mockEncryptedToken);

      const result = await secureTokenService.getRefreshToken();

      expect(result).toBe(mockToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('rxdoctor_refresh_token');
    });
  });

  describe('storeUserCredentials', () => {
    beforeEach(() => {
      secureTokenService.encryptionKey = mockEncryptionKey;
    });

    it('should store user credentials successfully', async () => {
      const credentials = { username: 'test', password: 'pass' };
      SecureStore.setItemAsync.mockResolvedValue();

      const result = await secureTokenService.storeUserCredentials(credentials);

      expect(result).toBe(true);
      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(
        JSON.stringify(credentials),
        mockEncryptionKey
      );
    });
  });

  describe('getUserCredentials', () => {
    beforeEach(() => {
      secureTokenService.encryptionKey = mockEncryptionKey;
    });

    it('should retrieve and decrypt user credentials', async () => {
      const credentials = { username: 'test', password: 'pass' };
      SecureStore.getItemAsync.mockResolvedValue(mockEncryptedToken);
      CryptoJS.AES.decrypt.mockReturnValue({
        toString: () => JSON.stringify(credentials)
      });

      const result = await secureTokenService.getUserCredentials();

      expect(result).toEqual(credentials);
    });
  });

  describe('storeSecureData', () => {
    beforeEach(() => {
      secureTokenService.encryptionKey = mockEncryptionKey;
    });

    it('should store secure data successfully', async () => {
      const data = { sensitive: 'data' };
      SecureStore.setItemAsync.mockResolvedValue();

      const result = await secureTokenService.storeSecureData('test_key', data);

      expect(result).toBe(true);
      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(
        JSON.stringify(data),
        mockEncryptionKey
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'rxdoctor_test_key',
        mockEncryptedToken
      );
    });
  });

  describe('getSecureData', () => {
    beforeEach(() => {
      secureTokenService.encryptionKey = mockEncryptionKey;
    });

    it('should retrieve and decrypt secure data', async () => {
      const data = { sensitive: 'data' };
      SecureStore.getItemAsync.mockResolvedValue(mockEncryptedToken);
      CryptoJS.AES.decrypt.mockReturnValue({
        toString: () => JSON.stringify(data)
      });

      const result = await secureTokenService.getSecureData('test_key');

      expect(result).toEqual(data);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('rxdoctor_test_key');
    });
  });

  describe('clearAllTokens', () => {
    it('should clear all tokens and metadata', async () => {
      SecureStore.deleteItemAsync.mockResolvedValue();
      AsyncStorage.removeItem.mockResolvedValue();

      const result = await secureTokenService.clearAllTokens();

      expect(result).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rxdoctor_token_stored_at');
    });

    it('should handle clear errors', async () => {
      SecureStore.deleteItemAsync.mockRejectedValue(new Error('Clear error'));

      const result = await secureTokenService.clearAllTokens();

      expect(result).toBe(false);
    });
  });

  describe('hasValidTokens', () => {
    it('should return true when both tokens exist', async () => {
      secureTokenService.encryptionKey = mockEncryptionKey;
      SecureStore.getItemAsync.mockResolvedValue(mockEncryptedToken);

      const result = await secureTokenService.hasValidTokens();

      expect(result).toBe(true);
    });

    it('should return false when tokens missing', async () => {
      secureTokenService.encryptionKey = mockEncryptionKey;
      SecureStore.getItemAsync.mockResolvedValue(null);

      const result = await secureTokenService.hasValidTokens();

      expect(result).toBe(false);
    });
  });

  describe('encryptData and decryptData', () => {
    beforeEach(() => {
      secureTokenService.encryptionKey = mockEncryptionKey;
    });

    it('should encrypt data successfully', () => {
      const data = { test: 'data' };

      const result = secureTokenService.encryptData(data);

      expect(result).toBe(mockEncryptedToken);
      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(
        JSON.stringify(data),
        mockEncryptionKey
      );
    });

    it('should decrypt data successfully', () => {
      const data = { test: 'data' };
      CryptoJS.AES.decrypt.mockReturnValue({
        toString: () => JSON.stringify(data)
      });

      const result = secureTokenService.decryptData(mockEncryptedToken);

      expect(result).toEqual(data);
      expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(
        mockEncryptedToken,
        mockEncryptionKey
      );
    });

    it('should handle encryption errors', () => {
      secureTokenService.encryptionKey = null;

      const result = secureTokenService.encryptData({ test: 'data' });

      expect(result).toBe(null);
    });

    it('should handle decryption errors', () => {
      CryptoJS.AES.decrypt.mockImplementation(() => {
        throw new Error('Decryption error');
      });

      const result = secureTokenService.decryptData(mockEncryptedToken);

      expect(result).toBe(null);
    });
  });
});