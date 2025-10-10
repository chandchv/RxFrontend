import permissionService from './permissionService';
import auditLogService from './auditLogService';

class TenantFilterService {
  constructor() {
    this.currentTenantId = null;
    this.tenantContext = null;
    this.filterCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize tenant filter service
   */
  async initialize(tenantContext) {
    try {
      this.tenantContext = tenantContext;
      this.currentTenantId = tenantContext?.clinic_id || tenantContext?.tenant_id;
      
      // Log tenant context initialization
      await auditLogService.logAction('tenant_context_initialized', {
        tenantId: this.currentTenantId,
        tenantName: tenantContext?.clinic_name || tenantContext?.tenant_name
      });

      return true;
    } catch (error) {
      console.error('Error initializing tenant filter service:', error);
      return false;
    }
  }

  /**
   * Filter data by tenant context
   */
  filterByTenant(data, options = {}) {
    try {
      if (!data) {
        return data;
      }

      // Single object
      if (!Array.isArray(data)) {
        return this.filterSingleItem(data, options);
      }

      // Array of objects
      return data.filter(item => this.filterSingleItem(item, options) !== null);
    } catch (error) {
      console.error('Error filtering data by tenant:', error);
      return data; // Return original data on error
    }
  }

  /**
   * Filter single item by tenant
   */
  filterSingleItem(item, options = {}) {
    try {
      if (!item || typeof item !== 'object') {
        return item;
      }

      // Check tenant ID fields
      const tenantFields = ['clinic_id', 'tenant_id', 'organization_id'];
      const itemTenantId = tenantFields.find(field => item[field])?.let(field => item[field]);

      // If item has tenant ID and it doesn't match current tenant, filter out
      if (itemTenantId && itemTenantId !== this.currentTenantId) {
        // Log unauthorized access attempt
        auditLogService.logSecurityEvent('unauthorized_tenant_access', {
          attemptedTenantId: itemTenantId,
          currentTenantId: this.currentTenantId,
          resourceType: options.resourceType || 'unknown',
          resourceId: item.id || 'unknown'
        });
        
        return null;
      }

      // Apply role-based filtering
      return this.applyRoleBasedFiltering(item, options);
    } catch (error) {
      console.error('Error filtering single item:', error);
      return item;
    }
  }

  /**
   * Apply role-based filtering
   */
  applyRoleBasedFiltering(item, options = {}) {
    try {
      const userRole = permissionService.getUserRole();
      const userId = permissionService.getUserId();

      switch (userRole) {
        case 'patient':
          return this.filterForPatient(item, userId, options);
        case 'doctor':
          return this.filterForDoctor(item, userId, options);
        case 'staff':
          return this.filterForStaff(item, userId, options);
        case 'admin':
          return this.filterForAdmin(item, userId, options);
        default:
          return null; // Unknown role, deny access
      }
    } catch (error) {
      console.error('Error applying role-based filtering:', error);
      return item;
    }
  }

  /**
   * Filter data for patient role
   */
  filterForPatient(item, userId, options) {
    // Patients can only see their own data
    if (item.patient_id === userId || item.id === userId) {
      return this.sanitizeDataForPatient(item, options);
    }

    // Check if patient has shared access
    if (item.shared_with && Array.isArray(item.shared_with)) {
      const hasAccess = item.shared_with.some(share => 
        share.user_id === userId && 
        share.access_level && 
        new Date(share.expires_at) > new Date()
      );
      
      if (hasAccess) {
        return this.sanitizeDataForPatient(item, options);
      }
    }

    return null;
  }

  /**
   * Filter data for doctor role
   */
  filterForDoctor(item, userId, options) {
    // Doctors can see data for their patients
    if (item.doctor_id === userId || item.created_by === userId) {
      return this.sanitizeDataForDoctor(item, options);
    }

    // Check if doctor has been granted access
    if (item.accessible_by && Array.isArray(item.accessible_by)) {
      const hasAccess = item.accessible_by.includes(userId);
      if (hasAccess) {
        return this.sanitizeDataForDoctor(item, options);
      }
    }

    // Check if it's general clinic data
    if (!item.patient_id && !item.doctor_id) {
      return this.sanitizeDataForDoctor(item, options);
    }

    return null;
  }

  /**
   * Filter data for staff role
   */
  filterForStaff(item, userId, options) {
    // Staff can see general clinic data and assigned tasks
    if (item.assigned_to === userId || item.created_by === userId) {
      return this.sanitizeDataForStaff(item, options);
    }

    // Staff can see non-sensitive clinic data
    if (!this.isSensitiveData(item, options)) {
      return this.sanitizeDataForStaff(item, options);
    }

    return null;
  }

  /**
   * Filter data for admin role
   */
  filterForAdmin(item, userId, options) {
    // Admins can see all data within their tenant
    return this.sanitizeDataForAdmin(item, options);
  }

  /**
   * Sanitize data for patient view
   */
  sanitizeDataForPatient(item, options) {
    const sanitized = { ...item };
    
    // Remove sensitive fields that patients shouldn't see
    const restrictedFields = [
      'internal_notes',
      'staff_comments',
      'billing_details',
      'insurance_details',
      'admin_flags'
    ];

    restrictedFields.forEach(field => {
      delete sanitized[field];
    });

    return sanitized;
  }

  /**
   * Sanitize data for doctor view
   */
  sanitizeDataForDoctor(item, options) {
    const sanitized = { ...item };
    
    // Remove admin-only fields
    const restrictedFields = [
      'admin_flags',
      'system_metadata',
      'audit_trail'
    ];

    restrictedFields.forEach(field => {
      delete sanitized[field];
    });

    return sanitized;
  }

  /**
   * Sanitize data for staff view
   */
  sanitizeDataForStaff(item, options) {
    const sanitized = { ...item };
    
    // Remove sensitive medical and admin fields
    const restrictedFields = [
      'medical_history',
      'diagnosis_notes',
      'treatment_plans',
      'admin_flags',
      'billing_details'
    ];

    restrictedFields.forEach(field => {
      delete sanitized[field];
    });

    return sanitized;
  }

  /**
   * Sanitize data for admin view
   */
  sanitizeDataForAdmin(item, options) {
    // Admins see all data, but we might still want to log access
    if (this.isSensitiveData(item, options)) {
      auditLogService.logDataAccess(
        options.resourceType || 'unknown',
        item.id || 'unknown',
        'view_sensitive',
        { adminAccess: true }
      );
    }

    return item;
  }

  /**
   * Check if data is sensitive
   */
  isSensitiveData(item, options) {
    const sensitiveTypes = [
      'clinical_record',
      'medical_history',
      'prescription',
      'lab_result',
      'diagnosis'
    ];

    const sensitiveFields = [
      'medical_history',
      'diagnosis',
      'treatment_plan',
      'prescription_details',
      'lab_results'
    ];

    // Check by resource type
    if (options.resourceType && sensitiveTypes.includes(options.resourceType)) {
      return true;
    }

    // Check by fields present
    return sensitiveFields.some(field => item.hasOwnProperty(field));
  }

  /**
   * Filter API response data
   */
  async filterAPIResponse(response, options = {}) {
    try {
      if (!response || !response.data) {
        return response;
      }

      // Log data access
      await auditLogService.logDataAccess(
        options.resourceType || 'api_response',
        options.resourceId || 'multiple',
        'view',
        {
          recordCount: Array.isArray(response.data) ? response.data.length : 1,
          endpoint: options.endpoint || 'unknown'
        }
      );

      // Filter the data
      const filteredData = this.filterByTenant(response.data, options);

      return {
        ...response,
        data: filteredData,
        filtered: true,
        originalCount: Array.isArray(response.data) ? response.data.length : 1,
        filteredCount: Array.isArray(filteredData) ? filteredData.length : (filteredData ? 1 : 0)
      };
    } catch (error) {
      console.error('Error filtering API response:', error);
      return response;
    }
  }

  /**
   * Check if user can access specific tenant data
   */
  canAccessTenantData(tenantId) {
    if (!tenantId) {
      return true; // No tenant restriction
    }

    const hasAccess = tenantId === this.currentTenantId;
    
    if (!hasAccess) {
      auditLogService.logSecurityEvent('unauthorized_tenant_access_attempt', {
        attemptedTenantId: tenantId,
        currentTenantId: this.currentTenantId,
        userId: permissionService.getUserId()
      });
    }

    return hasAccess;
  }

  /**
   * Get current tenant context
   */
  getCurrentTenantContext() {
    return {
      tenantId: this.currentTenantId,
      tenantContext: this.tenantContext
    };
  }

  /**
   * Switch tenant context (admin only)
   */
  async switchTenantContext(newTenantId, newTenantContext) {
    try {
      if (!permissionService.isAdmin()) {
        throw new Error('Insufficient permissions to switch tenant context');
      }

      const oldTenantId = this.currentTenantId;
      
      this.currentTenantId = newTenantId;
      this.tenantContext = newTenantContext;
      
      // Clear cache when switching tenants
      this.filterCache.clear();

      // Log tenant switch
      await auditLogService.logAction('tenant_context_switched', {
        oldTenantId,
        newTenantId,
        switchedBy: permissionService.getUserId()
      });

      return true;
    } catch (error) {
      console.error('Error switching tenant context:', error);
      return false;
    }
  }

  /**
   * Validate tenant access for API calls
   */
  validateTenantAccess(requestData) {
    try {
      // Check if request contains tenant-specific data
      const tenantFields = ['clinic_id', 'tenant_id', 'organization_id'];
      
      for (const field of tenantFields) {
        if (requestData[field] && requestData[field] !== this.currentTenantId) {
          auditLogService.logSecurityEvent('invalid_tenant_request', {
            requestedTenantId: requestData[field],
            currentTenantId: this.currentTenantId,
            requestData: requestData
          });
          
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating tenant access:', error);
      return false;
    }
  }

  /**
   * Add tenant context to API requests
   */
  addTenantContext(requestData) {
    if (!requestData) {
      requestData = {};
    }

    // Add current tenant ID to request
    if (this.currentTenantId) {
      requestData.clinic_id = this.currentTenantId;
    }

    return requestData;
  }

  /**
   * Clear filter cache
   */
  clearCache() {
    this.filterCache.clear();
  }

  /**
   * Get filter statistics
   */
  getFilterStatistics() {
    return {
      currentTenantId: this.currentTenantId,
      cacheSize: this.filterCache.size,
      userRole: permissionService.getUserRole(),
      userId: permissionService.getUserId()
    };
  }
}

export default new TenantFilterService();