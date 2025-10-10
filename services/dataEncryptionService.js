import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

class DataEncryptionService {
  constructor() {
    this.masterKey = null;
    this.keyPrefix = 'rxdoctor_enc_';
    this.sensitiveDataTypes = [
      'patient_data',
      'clinical_records',
      'prescription_data',
      'appointment_data',
      'user_credentials',
      'medical_history',
      'lab_results',
      'billing_info'
    ];
  }

  /**
   * Initialize encryption service
   */
  async initialize() {
    try {
      // Get or generate master encryption key
      let masterKey = await SecureStore.getItemAsync(`${this.keyPrefix}master_key`);
      
      if (!masterKey) {
        // Generate new master key
        masterKey = CryptoJS.lib.WordArray.random(256/8).toString();
        await SecureStore.setItemAsync(`${this.keyPrefix}master_key`, masterKey);
      }
      
      this.masterKey = masterKey;
      
      // Initialize encryption metadata
      await this.initializeEncryptionMetadata();
      
      return true;
    } catch (error) {
      console.error('Error initializing data encryption service:', error);
      return false;
    }
  }

  /**
   * Initialize encryption metadata
   */
  async initializeEncryptionMetadata() {
    try {
      const metadata = {
        version: '1.0',
        algorithm: 'AES-256',
        keyDerivation: 'PBKDF2',
        iterations: 10000,
        saltLength: 32,
        ivLength: 16,
        tagLength: 16
      };

      await AsyncStorage.setItem(`${this.keyPrefix}metadata`, JSON.stringify(metadata));
      return true;
    } catch (error) {
      console.error('Error initializing encryption metadata:', error);
      return false;
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptSensitiveData(data, dataType = 'general') {
    try {
      if (!this.masterKey) {
        await this.initialize();
      }

      // Generate salt and IV
      const salt = CryptoJS.lib.WordArray.random(32);
      const iv = CryptoJS.lib.WordArray.random(16);
      
      // Derive key from master key and salt
      const key = CryptoJS.PBKDF2(this.masterKey, salt, {
        keySize: 256/32,
        iterations: 10000
      });

      // Encrypt data
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Create encrypted package
      const encryptedPackage = {
        data: encrypted.toString(),
        salt: salt.toString(),
        iv: iv.toString(),
        dataType: dataType,
        timestamp: Date.now(),
        version: '1.0'
      };

      return JSON.stringify(encryptedPackage);
    } catch (error) {
      console.error('Error encrypting sensitive data:', error);
      return null;
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptSensitiveData(encryptedPackage) {
    try {
      if (!this.masterKey) {
        await this.initialize();
      }

      const package = JSON.parse(encryptedPackage);
      
      // Recreate salt and IV
      const salt = CryptoJS.enc.Hex.parse(package.salt);
      const iv = CryptoJS.enc.Hex.parse(package.iv);
      
      // Derive key from master key and salt
      const key = CryptoJS.PBKDF2(this.masterKey, salt, {
        keySize: 256/32,
        iterations: 10000
      });

      // Decrypt data
      const decrypted = CryptoJS.AES.decrypt(package.data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Error decrypting sensitive data:', error);
      return null;
    }
  }

  /**
   * Store encrypted data in AsyncStorage
   */
  async storeEncryptedData(key, data, dataType = 'general') {
    try {
      const encryptedData = await this.encryptSensitiveData(data, dataType);
      
      if (!encryptedData) {
        return false;
      }

      await AsyncStorage.setItem(`${this.keyPrefix}${key}`, encryptedData);
      
      // Store metadata about encrypted data
      await this.updateEncryptionIndex(key, dataType);
      
      return true;
    } catch (error) {
      console.error('Error storing encrypted data:', error);
      return false;
    }
  }

  /**
   * Retrieve and decrypt data from AsyncStorage
   */
  async getEncryptedData(key) {
    try {
      const encryptedData = await AsyncStorage.getItem(`${this.keyPrefix}${key}`);
      
      if (!encryptedData) {
        return null;
      }

      return await this.decryptSensitiveData(encryptedData);
    } catch (error) {
      console.error('Error retrieving encrypted data:', error);
      return null;
    }
  }

  /**
   * Update encryption index for tracking encrypted data
   */
  async updateEncryptionIndex(key, dataType) {
    try {
      let index = await AsyncStorage.getItem(`${this.keyPrefix}index`);
      index = index ? JSON.parse(index) : {};
      
      index[key] = {
        dataType: dataType,
        encrypted: true,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(`${this.keyPrefix}index`, JSON.stringify(index));
      return true;
    } catch (error) {
      console.error('Error updating encryption index:', error);
      return false;
    }
  }

  /**
   * Get encryption index
   */
  async getEncryptionIndex() {
    try {
      const index = await AsyncStorage.getItem(`${this.keyPrefix}index`);
      return index ? JSON.parse(index) : {};
    } catch (error) {
      console.error('Error getting encryption index:', error);
      return {};
    }
  }

  /**
   * Check if data type requires encryption
   */
  requiresEncryption(dataType) {
    return this.sensitiveDataTypes.includes(dataType);
  }

  /**
   * Encrypt clinical record data
   */
  async encryptClinicalRecord(recordData) {
    return await this.encryptSensitiveData(recordData, 'clinical_records');
  }

  /**
   * Decrypt clinical record data
   */
  async decryptClinicalRecord(encryptedRecord) {
    return await this.decryptSensitiveData(encryptedRecord);
  }

  /**
   * Encrypt patient data
   */
  async encryptPatientData(patientData) {
    return await this.encryptSensitiveData(patientData, 'patient_data');
  }

  /**
   * Decrypt patient data
   */
  async decryptPatientData(encryptedPatient) {
    return await this.decryptSensitiveData(encryptedPatient);
  }

  /**
   * Encrypt prescription data
   */
  async encryptPrescriptionData(prescriptionData) {
    return await this.encryptSensitiveData(prescriptionData, 'prescription_data');
  }

  /**
   * Decrypt prescription data
   */
  async decryptPrescriptionData(encryptedPrescription) {
    return await this.decryptSensitiveData(encryptedPrescription);
  }

  /**
   * Secure wipe of sensitive data
   */
  async secureWipeData(key) {
    try {
      // Remove encrypted data
      await AsyncStorage.removeItem(`${this.keyPrefix}${key}`);
      
      // Update encryption index
      let index = await this.getEncryptionIndex();
      delete index[key];
      await AsyncStorage.setItem(`${this.keyPrefix}index`, JSON.stringify(index));
      
      return true;
    } catch (error) {
      console.error('Error securely wiping data:', error);
      return false;
    }
  }

  /**
   * Secure wipe all encrypted data
   */
  async secureWipeAllData() {
    try {
      const index = await this.getEncryptionIndex();
      
      // Remove all encrypted data
      for (const key of Object.keys(index)) {
        await AsyncStorage.removeItem(`${this.keyPrefix}${key}`);
      }
      
      // Clear encryption index
      await AsyncStorage.removeItem(`${this.keyPrefix}index`);
      
      // Clear metadata
      await AsyncStorage.removeItem(`${this.keyPrefix}metadata`);
      
      return true;
    } catch (error) {
      console.error('Error securely wiping all data:', error);
      return false;
    }
  }

  /**
   * Rotate encryption keys
   */
  async rotateEncryptionKeys() {
    try {
      // Get all encrypted data
      const index = await this.getEncryptionIndex();
      const dataToReencrypt = {};
      
      // Decrypt all data with old key
      for (const [key, metadata] of Object.entries(index)) {
        const decryptedData = await this.getEncryptedData(key);
        if (decryptedData) {
          dataToReencrypt[key] = {
            data: decryptedData,
            dataType: metadata.dataType
          };
        }
      }
      
      // Generate new master key
      const newMasterKey = CryptoJS.lib.WordArray.random(256/8).toString();
      await SecureStore.setItemAsync(`${this.keyPrefix}master_key`, newMasterKey);
      this.masterKey = newMasterKey;
      
      // Re-encrypt all data with new key
      for (const [key, item] of Object.entries(dataToReencrypt)) {
        await this.storeEncryptedData(key, item.data, item.dataType);
      }
      
      console.log('Encryption keys rotated successfully');
      return true;
    } catch (error) {
      console.error('Error rotating encryption keys:', error);
      return false;
    }
  }

  /**
   * Get encryption statistics
   */
  async getEncryptionStats() {
    try {
      const index = await this.getEncryptionIndex();
      const metadata = await AsyncStorage.getItem(`${this.keyPrefix}metadata`);
      
      const stats = {
        totalEncryptedItems: Object.keys(index).length,
        dataTypes: {},
        encryptionMetadata: metadata ? JSON.parse(metadata) : null,
        lastKeyRotation: await SecureStore.getItemAsync(`${this.keyPrefix}last_rotation`)
      };

      // Count by data type
      for (const item of Object.values(index)) {
        stats.dataTypes[item.dataType] = (stats.dataTypes[item.dataType] || 0) + 1;
      }

      return stats;
    } catch (error) {
      console.error('Error getting encryption stats:', error);
      return null;
    }
  }
}

export default new DataEncryptionService();