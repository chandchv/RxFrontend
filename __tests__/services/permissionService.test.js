import permissionService from '../../services/permissionService';
import secureTokenService from '../../services/secureTokenService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../services/secureTokenService');
jest.mock('@react-native-async-storage/async-storage');

describe('PermissionService', () => {
  const mockUserData = {
    id: 1,
    role: 'doctor',
    clinic_id: 'clinic_123',
    permissions: ['view_patients', 'create_clinical_records']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    permissionService.userPermissions = null;
    permissionService.userRole = null;
    permissionService.tenantId = null;
    permissionService.permissionCache.clear();
  });

  describe('initialize', () => {
    it('should initialize with user data', async () => {
      secureTokenService.storeSecureData.mockResolvedValue(true);

      const result = await permissionService.initialize(mockUserData);

      expect(result).toBe(true);
      expect(permissionService.userRole).toBe('doctor');
      expect(permissionService.tenantId).toBe('clinic_123');
      expect(permissionService.userPermissions).toEqual(['view_patients', 'create_clinical_records']);
    });

    it('should initialize from stored data when no user data provided', async () => {
      const storedData = {
        role: 'patient',
        tenantId: 'clinic_456',
        permissions: ['view_own_records'],
        timestamp: Date.now()
      };
      
      secureTokenService.getSecureData.mockResolvedValue(storedData);

      const result = await permissionService.initialize();

      expect(result).toBe(true);
      expect(permissionService.userRole).toBe('patient');
      expect(permissionService.tenantId).toBe('clinic_456');
    });

    it('should handle initialization errors', async () => {
      secureTokenService.storeSecureData.mockRejectedValue(new Error('Storage error'));

      const result = await permissionService.initialize(mockUserData);

      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    beforeEach(() => {
      permissionService.userRole = 'doctor';
      permissionService.userPermissions = ['view_patients', 'create_clinical_records'];
    });

    it('should return true for direct permissions', () => {
      const result = permissionService.hasPermission('view_patients');
      expect(result).toBe(true);
    });

    it('should return true for role-based permissions', () => {
      const result = permissionService.hasPermission('view_appointments');
      expect(result).toBe(true); // Doctor role includes this permission
    });

    it('should return false for missing permissions', () => {
      const result = permissionService.hasPermission('manage_users');
      expect(result).toBe(false);
    });

    it('should handle null permissions gracefully', () => {
      permissionService.userPermissions = null;
      
      const result = permissionService.hasPermission('view_patients');
      expect(result).toBe(true); // Should fall back to role-based permissions
    });
  });

  describe('hasRolePermission', () => {
    it('should return correct permissions for doctor role', () => {
      permissionService.userRole = 'doctor';
      
      expect(permissionService.hasRolePermission('view_patients')).toBe(true);
      expect(permissionService.hasRolePermission('create_prescriptions')).toBe(true);
      expect(permissionService.hasRolePermission('manage_users')).toBe(false);
    });

    it('should return correct permissions for patient role', () => {
      permissionService.userRole = 'patient';
      
      expect(permissionService.hasRolePermission('view_own_records')).toBe(true);
      expect(permissionService.hasRolePermission('create_patients')).toBe(false);
    });

    it('should return correct permissions for admin role', () => {
      permissionService.userRole = 'admin';
      
      expect(permissionService.hasRolePermission('manage_users')).toBe(true);
      expect(permissionService.hasRolePermission('view_all_data')).toBe(true);
    });

    it('should return correct permissions for staff role', () => {
      permissionService.userRole = 'staff';
      
      expect(permissionService.hasRolePermission('view_patients')).toBe(true);
      expect(permissionService.hasRolePermission('process_documents')).toBe(true);
      expect(permissionService.hasRolePermission('manage_users')).toBe(false);
    });

    it('should return empty permissions for unknown role', () => {
      permissionService.userRole = 'unknown';
      
      expect(permissionService.hasRolePermission('view_patients')).toBe(false);
    });
  });

  describe('canAccessScreen', () => {
    beforeEach(() => {
      permissionService.userRole = 'doctor';
      permissionService.userPermissions = ['view_clinical_records'];
    });

    it('should allow access to role-specific dashboard', () => {
      expect(permissionService.canAccessScreen('DoctorDashboardScreen')).toBe(true);
      expect(permissionService.canAccessScreen('PatientDashboardScreen')).toBe(false);
    });

    it('should allow access based on permissions', () => {
      expect(permissionService.canAccessScreen('ClinicalRecordsListScreen')).toBe(true);
      expect(permissionService.canAccessScreen('DocumentUploadScreen')).toBe(true); // Doctor role includes create_clinical_records
    });

    it('should deny access to unauthorized screens', () => {
      permissionService.userRole = 'patient';
      
      expect(permissionService.canAccessScreen('AdminDashboardScreen')).toBe(false);
      expect(permissionService.canAccessScreen('DocumentUploadScreen')).toBe(false);
    });

    it('should handle unknown screens', () => {
      expect(permissionService.canAccessScreen('UnknownScreen')).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    beforeEach(() => {
      permissionService.userRole = 'doctor';
      permissionService.userPermissions = ['view_clinical_records'];
    });

    it('should cache permission results', () => {
      const result1 = permissionService.canPerformAction('view', 'clinical_record');
      const result2 = permissionService.canPerformAction('view', 'clinical_record');
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(permissionService.permissionCache.size).toBe(1);
    });

    it('should handle view actions', () => {
      expect(permissionService.canPerformAction('view', 'clinical_record')).toBe(true);
      expect(permissionService.canPerformAction('view', 'patient')).toBe(true);
    });

    it('should handle create actions', () => {
      expect(permissionService.canPerformAction('create', 'clinical_record')).toBe(true);
      expect(permissionService.canPerformAction('create', 'appointment')).toBe(true);
    });

    it('should handle edit actions', () => {
      expect(permissionService.canPerformAction('edit', 'clinical_record')).toBe(true);
    });

    it('should handle delete actions', () => {
      const resourceData = { created_by: 1 };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ id: 1 }));
      
      expect(permissionService.canPerformAction('delete', 'clinical_record', resourceData)).toBe(true);
    });

    it('should handle share actions', () => {
      const resourceData = { patient_id: 1 };
      
      expect(permissionService.canPerformAction('share', 'clinical_record', resourceData)).toBe(true);
    });
  });

  describe('canView', () => {
    beforeEach(() => {
      permissionService.userRole = 'patient';
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ id: 1 }));
    });

    it('should allow patients to view their own records', () => {
      const resourceData = { patient_id: 1 };
      
      expect(permissionService.canView('clinical_record', resourceData)).toBe(true);
    });

    it('should deny patients access to other patients records', () => {
      const resourceData = { patient_id: 2 };
      
      expect(permissionService.canView('clinical_record', resourceData)).toBe(false);
    });

    it('should allow doctors to view clinical records', () => {
      permissionService.userRole = 'doctor';
      permissionService.userPermissions = ['view_clinical_records'];
      
      expect(permissionService.canView('clinical_record', {})).toBe(true);
    });
  });

  describe('filterDataByPermissions', () => {
    beforeEach(() => {
      permissionService.userRole = 'patient';
      permissionService.tenantId = 'clinic_123';
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ id: 1 }));
    });

    it('should filter data for patients', () => {
      const data = [
        { id: 1, patient_id: 1, clinic_id: 'clinic_123' },
        { id: 2, patient_id: 2, clinic_id: 'clinic_123' },
        { id: 3, patient_id: 1, clinic_id: 'clinic_456' }
      ];

      const filtered = permissionService.filterDataByPermissions(data, 'clinical_record');
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should filter data for doctors', () => {
      permissionService.userRole = 'doctor';
      
      const data = [
        { id: 1, doctor_id: 1, clinic_id: 'clinic_123' },
        { id: 2, doctor_id: 2, clinic_id: 'clinic_123' },
        { id: 3, created_by: 1, clinic_id: 'clinic_123' }
      ];

      const filtered = permissionService.filterDataByPermissions(data, 'clinical_record');
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(item => item.id)).toEqual([1, 3]);
    });

    it('should allow admin to see all tenant data', () => {
      permissionService.userRole = 'admin';
      
      const data = [
        { id: 1, clinic_id: 'clinic_123' },
        { id: 2, clinic_id: 'clinic_123' },
        { id: 3, clinic_id: 'clinic_456' }
      ];

      const filtered = permissionService.filterDataByPermissions(data, 'clinical_record');
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(item => item.id)).toEqual([1, 2]);
    });

    it('should handle non-array data', () => {
      const data = { id: 1, patient_id: 1, clinic_id: 'clinic_123' };
      
      const filtered = permissionService.filterDataByPermissions(data, 'clinical_record');
      
      expect(filtered).toEqual(data);
    });
  });

  describe('role checking methods', () => {
    it('should correctly identify admin role', () => {
      permissionService.userRole = 'admin';
      expect(permissionService.isAdmin()).toBe(true);
      expect(permissionService.isDoctor()).toBe(false);
    });

    it('should correctly identify doctor role', () => {
      permissionService.userRole = 'doctor';
      expect(permissionService.isDoctor()).toBe(true);
      expect(permissionService.isPatient()).toBe(false);
    });

    it('should correctly identify patient role', () => {
      permissionService.userRole = 'patient';
      expect(permissionService.isPatient()).toBe(true);
      expect(permissionService.isStaff()).toBe(false);
    });

    it('should correctly identify staff role', () => {
      permissionService.userRole = 'staff';
      expect(permissionService.isStaff()).toBe(true);
      expect(permissionService.isAdmin()).toBe(false);
    });
  });

  describe('updatePermissions', () => {
    beforeEach(() => {
      permissionService.userRole = 'doctor';
      permissionService.tenantId = 'clinic_123';
    });

    it('should update permissions successfully', async () => {
      const newPermissions = ['view_patients', 'edit_patients'];
      secureTokenService.storeSecureData.mockResolvedValue(true);

      const result = await permissionService.updatePermissions(newPermissions);

      expect(result).toBe(true);
      expect(permissionService.userPermissions).toEqual(newPermissions);
      expect(permissionService.permissionCache.size).toBe(0); // Cache should be cleared
    });

    it('should handle update errors', async () => {
      secureTokenService.storeSecureData.mockRejectedValue(new Error('Update error'));

      const result = await permissionService.updatePermissions(['new_permission']);

      expect(result).toBe(false);
    });
  });

  describe('clearPermissions', () => {
    beforeEach(() => {
      permissionService.userRole = 'doctor';
      permissionService.userPermissions = ['view_patients'];
      permissionService.tenantId = 'clinic_123';
    });

    it('should clear permissions successfully', async () => {
      secureTokenService.storeSecureData.mockResolvedValue(true);

      const result = await permissionService.clearPermissions();

      expect(result).toBe(true);
      expect(permissionService.userPermissions).toBe(null);
      expect(permissionService.userRole).toBe(null);
      expect(permissionService.tenantId).toBe(null);
    });

    it('should handle clear errors', async () => {
      secureTokenService.storeSecureData.mockRejectedValue(new Error('Clear error'));

      const result = await permissionService.clearPermissions();

      expect(result).toBe(false);
    });
  });

  describe('canAccessTenant', () => {
    beforeEach(() => {
      permissionService.tenantId = 'clinic_123';
    });

    it('should allow access to same tenant', () => {
      expect(permissionService.canAccessTenant('clinic_123')).toBe(true);
    });

    it('should deny access to different tenant', () => {
      expect(permissionService.canAccessTenant('clinic_456')).toBe(false);
    });
  });

  describe('getter methods', () => {
    beforeEach(() => {
      permissionService.userRole = 'doctor';
      permissionService.tenantId = 'clinic_123';
    });

    it('should return correct user role', () => {
      expect(permissionService.getUserRole()).toBe('doctor');
    });

    it('should return correct tenant ID', () => {
      expect(permissionService.getTenantId()).toBe('clinic_123');
    });
  });
});