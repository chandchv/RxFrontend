import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

class SecureTokenService {
  constructor() {
    this.encryptionKey = null;
    this.tokenPrefix = 'rxdoctor_';
  }

  /**
   * Initialize secure token service
   */
  async initialize() {
    try {
      // Generate or retrieve encryption key
      let key = await SecureStore.getItemAsync(`${this.tokenPrefix}encryption_key`);
      
      if (!key) {
        // Generate new encryption key
        key = CryptoJS.lib.WordArray.random(256/8).toString();
        await SecureStore.setItemAsync(`${this.tokenPrefix}encryption_key`, key);
      }
      
      this.encryptionKey = key;
      return true;
    } catch (error) {
      console.error('Error initializing secure token service:', error);
      return false;
    }
  }

  /**
   * Store access token securely
   */
  async storeAccessToken(token) {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      // Encrypt token before storing
      const encryptedToken = CryptoJS.AES.encrypt(token, this.encryptionKey).toString();
      
      await SecureStore.setItemAsync(`${this.tokenPrefix}access_token`, encryptedToken);
      
      // Store token metadata in AsyncStorage (non-sensitive)
      await AsyncStorage.setItem(`${this.tokenPrefix}token_stored_at`, Date.now().toString());
      
      return true;
    } catch (error) {
      console.error('Error storing access token:', error);
      return false;
    }
  }

  /**
   * Retrieve access token
   */
  async getAccessToken() {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const encryptedToken = await SecureStore.getItemAsync(`${this.tokenPrefix}access_token`);
      
      if (!encryptedToken) {
        return null;
      }

      // Decrypt token
      const bytes = CryptoJS.AES.decrypt(encryptedToken, this.encryptionKey);
      const decryptedToken = bytes.toString(CryptoJS.enc.Utf8);
      
      return decryptedToken || null;
    } catch (error) {
      console.error('Error retrieving access token:', error);
      return null;
    }
  }

  /**
   * Store refresh token securely
   */
  async storeRefreshToken(token) {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const encryptedToken = CryptoJS.AES.encrypt(token, this.encryptionKey).toString();
      await SecureStore.setItemAsync(`${this.tokenPrefix}refresh_token`, encryptedToken);
      
      return true;
    } catch (error) {
      console.error('Error storing refresh token:', error);
      return false;
    }
  }

  /**
   * Retrieve refresh token
   */
  async getRefreshToken() {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const encryptedToken = await SecureStore.getItemAsync(`${this.tokenPrefix}refresh_token`);
      
      if (!encryptedToken) {
        return null;
      }

      const bytes = CryptoJS.AES.decrypt(encryptedToken, this.encryptionKey);
      const decryptedToken = bytes.toString(CryptoJS.enc.Utf8);
      
      return decryptedToken || null;
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      return null;
    }
  }

  /**
   * Store user credentials securely
   */
  async storeUserCredentials(credentials) {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const encryptedCredentials = CryptoJS.AES.encrypt(
        JSON.stringify(credentials), 
        this.encryptionKey
      ).toString();
      
      await SecureStore.setItemAsync(`${this.tokenPrefix}user_credentials`, encryptedCredentials);
      
      return true;
    } catch (error) {
      console.error('Error storing user credentials:', error);
      return false;
    }
  }

  /**
   * Retrieve user credentials
   */
  async getUserCredentials() {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const encryptedCredentials = await SecureStore.getItemAsync(`${this.tokenPrefix}user_credentials`);
      
      if (!encryptedCredentials) {
        return null;
      }

      const bytes = CryptoJS.AES.decrypt(encryptedCredentials, this.encryptionKey);
      const decryptedCredentials = bytes.toString(CryptoJS.enc.Utf8);
      
      return JSON.parse(decryptedCredentials);
    } catch (error) {
      console.error('Error retrieving user credentials:', error);
      return null;
    }
  }

  /**
   * Store sensitive data with encryption
   */
  async storeSecureData(key, data) {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(data), 
        this.encryptionKey
      ).toString();
      
      await SecureStore.setItemAsync(`${this.tokenPrefix}${key}`, encryptedData);
      
      return true;
    } catch (error) {
      console.error(`Error storing secure data for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Retrieve sensitive data with decryption
   */
  async getSecureData(key) {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const encryptedData = await SecureStore.getItemAsync(`${this.tokenPrefix}${key}`);
      
      if (!encryptedData) {
        return null;
      }

      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error(`Error retrieving secure data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Clear all stored tokens and credentials
   */
  async clearAllTokens() {
    try {
      const keys = [
        `${this.tokenPrefix}access_token`,
        `${this.tokenPrefix}refresh_token`,
        `${this.tokenPrefix}user_credentials`
      ];

      for (const key of keys) {
        await SecureStore.deleteItemAsync(key);
      }

      // Clear metadata from AsyncStorage
      await AsyncStorage.removeItem(`${this.tokenPrefix}token_stored_at`);
      
      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error);
      return false;
    }
  }

  /**
   * Check if tokens exist
   */
  async hasValidTokens() {
    try {
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      
      return !!(accessToken && refreshToken);
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }

  /**
   * Get token storage timestamp
   */
  async getTokenStorageTime() {
    try {
      const timestamp = await AsyncStorage.getItem(`${this.tokenPrefix}token_stored_at`);
      return timestamp ? parseInt(timestamp) : null;
    } catch (error) {
      console.error('Error getting token storage time:', error);
      return null;
    }
  }

  /**
   * Encrypt sensitive data for local storage
   */
  encryptData(data) {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }

      return CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
    } catch (error) {
      console.error('Error encrypting data:', error);
      return null;
    }
  }

  /**
   * Decrypt sensitive data from local storage
   */
  decryptData(encryptedData) {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }

      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error decrypting data:', error);
      return null;
    }
  }
}

export default new SecureTokenService();