import AsyncStorage from '@react-native-async-storage/async-storage';
import secureTokenService from './secureTokenService';

class PermissionService {
  constructor() {
    this.userPermissions = null;
    this.userRole = null;
    this.tenantId = null;
    this.permissionCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize permission service with user data
   */
  async initialize(userData) {
    try {
      if (userData) {
        this.userRole = userData.role;
        this.tenantId = userData.clinic_id || userData.tenant_id;
        this.userPermissions = userData.permissions || [];
        
        // Store permissions securely
        await secureTokenService.storeSecureData('user_permissions', {
          role: this.userRole,
          tenantId: this.tenantId,
          permissions: this.userPermissions,
          timestamp: Date.now()
        });
      } else {
        // Load from secure storage
        const storedPermissions = await secureTokenService.getSecureData('user_permissions');
        if (storedPermissions) {
          this.userRole = storedPermissions.role;
          this.tenantId = storedPermissions.tenantId;
          this.userPermissions = storedPermissions.permissions;
        }
      }

      return true;
    } catch (error) {
      console.error('Error initializing permission service:', error);
      return false;
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission) {
    try {
      if (!this.userPermissions || !Array.isArray(this.userPermissions)) {
        return false;
      }

      // Check direct permission
      if (this.userPermissions.includes(permission)) {
        return true;
      }

      // Check role-based permissions
      return this.hasRolePermission(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check role-based permissions
   */
  hasRolePermission(permission) {
    const rolePermissions = {
      'doctor': [
        'view_patients',
        'create_patients',
        'edit_patients',
        'view_clinical_records',
        'create_clinical_records',
        'edit_clinical_records',
        'view_appointments',
        'create_appointments',
        'edit_appointments',
        'view_prescriptions',
        'create_prescriptions',
        'edit_prescriptions',
        'view_dashboard',
        'access_mobile_app'
      ],
      'patient': [
        'view_own_records',
        'view_own_appointments',
        'create_appointments',
        'view_own_prescriptions',
        'view_dashboard',
        'access_mobile_app',
        'share_records'
      ],
      'admin': [
        'view_all_data',
        'create_all_data',
        'edit_all_data',
        'delete_all_data',
        'manage_users',
        'manage_clinic',
        'view_analytics',
        'manage_permissions',
        'view_audit_logs',
        'access_mobile_app'
      ],
      'staff': [
        'view_patients',
        'create_patients',
        'edit_patients',
        'view_clinical_records',
        'process_documents',
        'view_appointments',
        'create_appointments',
        'view_dashboard',
        'access_mobile_app'
      ]
    };

    const permissions = rolePermissions[this.userRole] || [];
    return permissions.includes(permission);
  }

  /**
   * Check if user can access specific screen
   */
  canAccessScreen(screenName) {
    const screenPermissions = {
      // Dashboard screens
      'DoctorDashboardScreen': ['view_dashboard', 'doctor_role'],
      'PatientDashboardScreen': ['view_dashboard', 'patient_role'],
      'AdminDashboardScreen': ['view_dashboard', 'admin_role'],
      'StaffDashboardScreen': ['view_dashboard', 'staff_role'],
      
      // Clinical records screens
      'ClinicalRecordsDashboardScreen': ['view_clinical_records'],
      'ClinicalRecordsListScreen': ['view_clinical_records'],
      'ClinicalRecordDetailScreen': ['view_clinical_records'],
      'DocumentViewerScreen': ['view_clinical_records'],
      'RecordSearchScreen': ['view_clinical_records'],
      'DocumentUploadScreen': ['create_clinical_records'],
      
      // Appointment screens
      'AppointmentListScreen': ['view_appointments'],
      'AppointmentDetailScreen': ['view_appointments'],
      'ScheduleAppointmentScreen': ['create_appointments'],
      
      // Prescription screens
      'PrescriptionListScreen': ['view_prescriptions'],
      'PrescriptionDetailScreen': ['view_prescriptions'],
      'PrescriptionScanScreen': ['create_prescriptions']
    };

    const requiredPermissions = screenPermissions[screenName] || [];
    
    // Check if user has any of the required permissions
    return requiredPermissions.some(permission => {
      if (permission.endsWith('_role')) {
        const role = permission.replace('_role', '');
        return this.userRole === role;
      }
      return this.hasPermission(permission);
    });
  }

  /**
   * Check if user can perform specific action
   */
  canPerformAction(action, resourceType = null, resourceData = null) {
    try {
      // Cache key for performance
      const cacheKey = `${action}_${resourceType}_${JSON.stringify(resourceData)}`;
      const cached = this.permissionCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.result;
      }

      let result = false;

      switch (action) {
        case 'view':
          result = this.canView(resourceType, resourceData);
          break;
        case 'create':
          result = this.canCreate(resourceType);
          break;
        case 'edit':
          result = this.canEdit(resourceType, resourceData);
          break;
        case 'delete':
          result = this.canDelete(resourceType, resourceData);
          break;
        case 'share':
          result = this.canShare(resourceType, resourceData);
          break;
        default:
          result = this.hasPermission(action);
      }

      // Cache result
      this.permissionCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error checking action permission:', error);
      return false;
    }
  }

  /**
   * Check view permissions
   */
  canView(resourceType, resourceData) {
    switch (resourceType) {
      case 'clinical_record':
        if (this.userRole === 'patient') {
          return resourceData && resourceData.patient_id === this.getUserId();
        }
        return this.hasPermission('view_clinical_records');
        
      case 'appointment':
        if (this.userRole === 'patient') {
          return resourceData && resourceData.patient_id === this.getUserId();
        }
        return this.hasPermission('view_appointments');
        
      case 'prescription':
        if (this.userRole === 'patient') {
          return resourceData && resourceData.patient_id === this.getUserId();
        }
        return this.hasPermission('view_prescriptions');
        
      case 'patient':
        if (this.userRole === 'patient') {
          return resourceData && resourceData.id === this.getUserId();
        }
        return this.hasPermission('view_patients');
        
      default:
        return this.hasPermission(`view_${resourceType}`);
    }
  }

  /**
   * Check create permissions
   */
  canCreate(resourceType) {
    switch (resourceType) {
      case 'clinical_record':
        return this.hasPermission('create_clinical_records');
      case 'appointment':
        return this.hasPermission('create_appointments');
      case 'prescription':
        return this.hasPermission('create_prescriptions');
      case 'patient':
        return this.hasPermission('create_patients');
      default:
        return this.hasPermission(`create_${resourceType}`);
    }
  }

  /**
   * Check edit permissions
   */
  canEdit(resourceType, resourceData) {
    // Patients can only edit their own data
    if (this.userRole === 'patient') {
      return resourceData && (
        resourceData.patient_id === this.getUserId() ||
        resourceData.id === this.getUserId()
      );
    }

    return this.hasPermission(`edit_${resourceType}`);
  }

  /**
   * Check delete permissions
   */
  canDelete(resourceType, resourceData) {
    // Only admin and specific roles can delete
    if (this.userRole === 'admin') {
      return true;
    }

    // Doctors can delete their own records
    if (this.userRole === 'doctor' && resourceData) {
      return resourceData.created_by === this.getUserId();
    }

    return false;
  }

  /**
   * Check share permissions
   */
  canShare(resourceType, resourceData) {
    switch (resourceType) {
      case 'clinical_record':
        // Patients can share their own records
        if (this.userRole === 'patient') {
          return resourceData && resourceData.patient_id === this.getUserId();
        }
        // Doctors can share records of their patients
        return this.hasPermission('share_records');
      default:
        return false;
    }
  }

  /**
   * Filter data based on user permissions and tenant
   */
  filterDataByPermissions(data, resourceType) {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.filter(item => {
      // Tenant filtering
      if (item.clinic_id && item.clinic_id !== this.tenantId) {
        return false;
      }

      // Role-based filtering
      if (this.userRole === 'patient') {
        return item.patient_id === this.getUserId() || item.id === this.getUserId();
      }

      // Admin sees all data within tenant
      if (this.userRole === 'admin') {
        return true;
      }

      // Doctor sees patients and related data
      if (this.userRole === 'doctor') {
        return item.doctor_id === this.getUserId() || 
               item.created_by === this.getUserId() ||
               !item.doctor_id; // Public data
      }

      // Staff sees general data
      if (this.userRole === 'staff') {
        return !item.patient_id || this.hasPermission(`view_${resourceType}`);
      }

      return false;
    });
  }

  /**
   * Get user ID from stored credentials
   */
  getUserId() {
    // This would typically come from the authenticated user data
    // For now, we'll try to get it from stored user data
    try {
      const userData = AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData).id : null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Check tenant access
   */
  canAccessTenant(tenantId) {
    return this.tenantId === tenantId;
  }

  /**
   * Get user role
   */
  getUserRole() {
    return this.userRole;
  }

  /**
   * Get tenant ID
   */
  getTenantId() {
    return this.tenantId;
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.userRole === 'admin';
  }

  /**
   * Check if user is doctor
   */
  isDoctor() {
    return this.userRole === 'doctor';
  }

  /**
   * Check if user is patient
   */
  isPatient() {
    return this.userRole === 'patient';
  }

  /**
   * Check if user is staff
   */
  isStaff() {
    return this.userRole === 'staff';
  }

  /**
   * Clear permission cache
   */
  clearCache() {
    this.permissionCache.clear();
  }

  /**
   * Update permissions
   */
  async updatePermissions(newPermissions) {
    try {
      this.userPermissions = newPermissions;
      this.clearCache();
      
      await secureTokenService.storeSecureData('user_permissions', {
        role: this.userRole,
        tenantId: this.tenantId,
        permissions: this.userPermissions,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Error updating permissions:', error);
      return false;
    }
  }

  /**
   * Clear all permission data
   */
  async clearPermissions() {
    try {
      this.userPermissions = null;
      this.userRole = null;
      this.tenantId = null;
      this.clearCache();
      
      await secureTokenService.storeSecureData('user_permissions', null);
      
      return true;
    } catch (error) {
      console.error('Error clearing permissions:', error);
      return false;
    }
  }
}

export default new PermissionService();