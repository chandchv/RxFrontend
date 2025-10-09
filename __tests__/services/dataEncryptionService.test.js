import dataEncryptionService from '../../services/dataEncryptionService';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('crypto-js');

describe('DataEncryptionService', () => {
  const mockMasterKey = 'mock-master-key';
  const mockSalt = 'mock-salt';
  const mockIv = 'mock-iv';
  const mockEncryptedData = 'mock-encrypted-data';
  const mockDecryptedData = { test: 'data' };

  beforeEach(() => {
    jest.clearAllMocks();
    dataEncryptionService.masterKey = null;

    // Mock CryptoJS
    CryptoJS.lib = {
      WordArray: {
        random: jest.fn().mockReturnValue({
          toString: jest.fn().mockReturnValue(mockMasterKey)
        })
      }
    };
    CryptoJS.PBKDF2 = jest.fn().mockReturnValue('derived-key');
    CryptoJS.AES = {
      encrypt: jest.fn().mockReturnValue({
        toString: () => mockEncryptedData
      }),
      decrypt: jest.fn().mockReturnValue({
        toString: () => JSON.stringify(mockDecryptedData)
      })
    };
    CryptoJS.mode = { CBC: 'CBC' };
    CryptoJS.pad = { Pkcs7: 'Pkcs7' };
    CryptoJS.enc = {
      Hex: {
        parse: jest.fn().mockReturnValue('parsed-hex')
      },
      Utf8: 'utf8'
    };
  });

  describe('initialize', () => {
    it('should initialize with existing master key', async () => {
      SecureStore.getItemAsync.mockResolvedValue(mockMasterKey);
      AsyncStorage.setItem.mockResolvedValue();

      const result = await dataEncryptionService.initialize();

      expect(result).toBe(true);
      expect(dataEncryptionService.masterKey).toBe(mockMasterKey);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('rxdoctor_enc_master_key');
    });

    it('should generate new master key when none exists', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.setItemAsync.mockResolvedValue();
      AsyncStorage.setItem.mockResolvedValue();

      const result = await dataEncryptionService.initialize();

      expect(result).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'rxdoctor_enc_master_key',
        mockMasterKey
      );
    });

    it('should initialize encryption metadata', async () => {
      SecureStore.getItemAsync.mockResolvedValue(mockMasterKey);
      AsyncStorage.setItem.mockResolvedValue();

      await dataEncryptionService.initialize();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'rxdoctor_enc_metadata',
        expect.stringContaining('version')
      );
    });

    it('should handle initialization errors', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('SecureStore error'));

      const result = await dataEncryptionService.initialize();

      expect(result).toBe(false);
    });
  });

  describe('encryptSensitiveData', () => {
    beforeEach(() => {
      dataEncryptionService.masterKey = mockMasterKey;
    });

    it('should encrypt data successfully', async () => {
      const data = { sensitive: 'information' };
      const dataType = 'patient_data';

      const result = await dataEncryptionService.encryptSensitiveData(data, dataType);

      expect(result).toBeDefined();
      expect(CryptoJS.lib.WordArray.random).toHaveBeenCalledTimes(2); // salt and iv
      expect(CryptoJS.PBKDF2).toHaveBeenCalledWith(
        mockMasterKey,
        expect.anything(),
        expect.objectContaining({
          keySize: 256/32,
          iterations: 10000
        })
      );
      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(
        JSON.stringify(data),
        'derived-key',
        expect.objectContaining({
          mode: 'CBC',
          padding: 'Pkcs7'
        })
      );

      const parsedResult = JSON.parse(result);
      expect(parsedResult).toEqual(
        expect.objectContaining({
          data: mockEncryptedData,
          dataType: dataType,
          version: '1.0'
        })
      );
    });

    it('should initialize if master key not set', async () => {
      dataEncryptionService.masterKey = null;
      SecureStore.getItemAsync.mockResolvedValue(mockMasterKey);
      AsyncStorage.setItem.mockResolvedValue();

      const result = await dataEncryptionService.encryptSensitiveData({ test: 'data' });

      expect(result).toBeDefined();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('rxdoctor_enc_master_key');
    });

    it('should handle encryption errors', async () => {
      CryptoJS.AES.encrypt.mockImplementation(() => {
        throw new Error('Encryption error');
      });

      const result = await dataEncryptionService.encryptSensitiveData({ test: 'data' });

      expect(result).toBe(null);
    });
  });

  describe('decryptSensitiveData', () => {
    beforeEach(() => {
      dataEncryptionService.masterKey = mockMasterKey;
    });

    it('should decrypt data successfully', async () => {
      const encryptedPackage = JSON.stringify({
        data: mockEncryptedData,
        salt: mockSalt,
        iv: mockIv,
        dataType: 'patient_data',
        timestamp: Date.now(),
        version: '1.0'
      });

      const result = await dataEncryptionService.decryptSensitiveData(encryptedPackage);

      expect(result).toEqual(mockDecryptedData);
      expect(CryptoJS.enc.Hex.parse).toHaveBeenCalledWith(mockSalt);
      expect(CryptoJS.enc.Hex.parse).toHaveBeenCalledWith(mockIv);
      expect(CryptoJS.PBKDF2).toHaveBeenCalledWith(
        mockMasterKey,
        'parsed-hex',
        expect.objectContaining({
          keySize: 256/32,
          iterations: 10000
        })
      );
      expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(
        mockEncryptedData,
        'derived-key',
        expect.objectContaining({
          mode: 'CBC',
          padding: 'Pkcs7'
        })
      );
    });

    it('should handle decryption failure', async () => {
      const encryptedPackage = JSON.stringify({
        data: mockEncryptedData,
        salt: mockSalt,
        iv: mockIv
      });
      
      CryptoJS.AES.decrypt.mockReturnValue({
        toString: () => ''
      });

      const result = await dataEncryptionService.decryptSensitiveData(encryptedPackage);

      expect(result).toBe(null);
    });

    it('should handle decryption errors', async () => {
      const encryptedPackage = JSON.stringify({
        data: mockEncryptedData,
        salt: mockSalt,
        iv: mockIv
      });

      CryptoJS.AES.decrypt.mockImplementation(() => {
        throw new Error('Decryption error');
      });

      const result = await dataEncryptionService.decryptSensitiveData(encryptedPackage);

      expect(result).toBe(null);
    });
  });

  describe('storeEncryptedData', () => {
    beforeEach(() => {
      dataEncryptionService.masterKey = mockMasterKey;
    });

    it('should store encrypted data successfully', async () => {
      const data = { test: 'data' };
      const key = 'test_key';
      const dataType = 'patient_data';
      
      AsyncStorage.setItem.mockResolvedValue();
      AsyncStorage.getItem.mockResolvedValue('{}');

      const result = await dataEncryptionService.storeEncryptedData(key, data, dataType);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `rxdoctor_enc_${key}`,
        expect.any(String)
      );
    });

    it('should handle storage errors', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await dataEncryptionService.storeEncryptedData('key', { test: 'data' });

      expect(result).toBe(false);
    });
  });

  describe('getEncryptedData', () => {
    beforeEach(() => {
      dataEncryptionService.masterKey = mockMasterKey;
    });

    it('should retrieve and decrypt data successfully', async () => {
      const encryptedPackage = JSON.stringify({
        data: mockEncryptedData,
        salt: mockSalt,
        iv: mockIv
      });
      
      AsyncStorage.getItem.mockResolvedValue(encryptedPackage);

      const result = await dataEncryptionService.getEncryptedData('test_key');

      expect(result).toEqual(mockDecryptedData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('rxdoctor_enc_test_key');
    });

    it('should return null when no data exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await dataEncryptionService.getEncryptedData('test_key');

      expect(result).toBe(null);
    });

    it('should handle retrieval errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Retrieval error'));

      const result = await dataEncryptionService.getEncryptedData('test_key');

      expect(result).toBe(null);
    });
  });

  describe('updateEncryptionIndex', () => {
    it('should update encryption index successfully', async () => {
      const existingIndex = { existing_key: { dataType: 'general', encrypted: true } };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingIndex));
      AsyncStorage.setItem.mockResolvedValue();

      const result = await dataEncryptionService.updateEncryptionIndex('new_key', 'patient_data');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'rxdoctor_enc_index',
        expect.stringContaining('new_key')
      );
    });

    it('should create new index when none exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue();

      const result = await dataEncryptionService.updateEncryptionIndex('key', 'patient_data');

      expect(result).toBe(true);
    });
  });

  describe('requiresEncryption', () => {
    it('should return true for sensitive data types', () => {
      expect(dataEncryptionService.requiresEncryption('patient_data')).toBe(true);
      expect(dataEncryptionService.requiresEncryption('clinical_records')).toBe(true);
      expect(dataEncryptionService.requiresEncryption('prescription_data')).toBe(true);
    });

    it('should return false for non-sensitive data types', () => {
      expect(dataEncryptionService.requiresEncryption('general')).toBe(false);
      expect(dataEncryptionService.requiresEncryption('ui_preferences')).toBe(false);
    });
  });

  describe('specialized encryption methods', () => {
    beforeEach(() => {
      dataEncryptionService.masterKey = mockMasterKey;
    });

    it('should encrypt clinical record data', async () => {
      const recordData = { recordId: 1, patientId: 123 };

      const result = await dataEncryptionService.encryptClinicalRecord(recordData);

      expect(result).toBeDefined();
      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(
        JSON.stringify(recordData),
        'derived-key',
        expect.any(Object)
      );
    });

    it('should encrypt patient data', async () => {
      const patientData = { patientId: 123, name: 'John Doe' };

      const result = await dataEncryptionService.encryptPatientData(patientData);

      expect(result).toBeDefined();
    });

    it('should encrypt prescription data', async () => {
      const prescriptionData = { prescriptionId: 456, medication: 'Aspirin' };

      const result = await dataEncryptionService.encryptPrescriptionData(prescriptionData);

      expect(result).toBeDefined();
    });
  });

  describe('secureWipeData', () => {
    it('should securely wipe data successfully', async () => {
      const index = { test_key: { dataType: 'patient_data', encrypted: true } };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(index));
      AsyncStorage.removeItem.mockResolvedValue();
      AsyncStorage.setItem.mockResolvedValue();

      const result = await dataEncryptionService.secureWipeData('test_key');

      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rxdoctor_enc_test_key');
    });

    it('should handle wipe errors', async () => {
      AsyncStorage.removeItem.mockRejectedValue(new Error('Wipe error'));

      const result = await dataEncryptionService.secureWipeData('test_key');

      expect(result).toBe(false);
    });
  });

  describe('secureWipeAllData', () => {
    it('should wipe all encrypted data successfully', async () => {
      const index = {
        key1: { dataType: 'patient_data' },
        key2: { dataType: 'clinical_records' }
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(index));
      AsyncStorage.removeItem.mockResolvedValue();

      const result = await dataEncryptionService.secureWipeAllData();

      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rxdoctor_enc_key1');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rxdoctor_enc_key2');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rxdoctor_enc_index');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rxdoctor_enc_metadata');
    });
  });

  describe('rotateEncryptionKeys', () => {
    beforeEach(() => {
      dataEncryptionService.masterKey = mockMasterKey;
    });

    it('should rotate encryption keys successfully', async () => {
      const index = { key1: { dataType: 'patient_data' } };
      const encryptedPackage = JSON.stringify({
        data: mockEncryptedData,
        salt: mockSalt,
        iv: mockIv
      });

      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'rxdoctor_enc_index') return Promise.resolve(JSON.stringify(index));
        if (key === 'rxdoctor_enc_key1') return Promise.resolve(encryptedPackage);
        return Promise.resolve('{}');
      });
      AsyncStorage.setItem.mockResolvedValue();
      SecureStore.setItemAsync.mockResolvedValue();

      const result = await dataEncryptionService.rotateEncryptionKeys();

      expect(result).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'rxdoctor_enc_master_key',
        expect.any(String)
      );
    });

    it('should handle key rotation errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Rotation error'));

      const result = await dataEncryptionService.rotateEncryptionKeys();

      expect(result).toBe(false);
    });
  });

  describe('getEncryptionStats', () => {
    it('should return encryption statistics', async () => {
      const index = {
        key1: { dataType: 'patient_data', timestamp: Date.now() },
        key2: { dataType: 'clinical_records', timestamp: Date.now() },
        key3: { dataType: 'patient_data', timestamp: Date.now() }
      };
      const metadata = { version: '1.0', algorithm: 'AES-256' };

      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'rxdoctor_enc_index') return Promise.resolve(JSON.stringify(index));
        if (key === 'rxdoctor_enc_metadata') return Promise.resolve(JSON.stringify(metadata));
        return Promise.resolve(null);
      });
      SecureStore.getItemAsync.mockResolvedValue(null);

      const result = await dataEncryptionService.getEncryptionStats();

      expect(result).toEqual({
        totalEncryptedItems: 3,
        dataTypes: {
          patient_data: 2,
          clinical_records: 1
        },
        encryptionMetadata: metadata,
        lastKeyRotation: null
      });
    });

    it('should handle stats errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Stats error'));

      const result = await dataEncryptionService.getEncryptionStats();

      expect(result).toBe(null);
    });
  });
});