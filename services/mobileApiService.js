/**
 * Mobile API Service
 * 
 * This service provides mobile-optimized API calls for dashboard and clinical records
 * functionality, integrating with the new mobile API endpoints.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { getServiceURL, getEndpointURL, CLINICAL_RECORDS_CONFIG } from '../config/clinicalRecordsConfig';
import { logApiRequest, debugError, debugInfo } from '../utils/debugUtils';

class MobileApiService {
  constructor() {
    this.baseURL = API_URL;
    this.clinicalRecordsServiceURL = getServiceURL();
    this.endpoints = {
      // Dashboard endpoints
      dashboard: '/dashboard/api/mobile/data/',
      clinicalRecordsSummary: '/dashboard/api/mobile/clinical-records/summary/',
      recentDocuments: '/dashboard/api/mobile/recent-documents/',
      quickActions: '/dashboard/api/mobile/quick-actions/',
      alerts: '/dashboard/api/mobile/alerts/',
      dashboardPreferences: '/dashboard/api/mobile/preferences/',
      
      // Clinical Records endpoints (via main backend integration)
      clinicalRecords: '/dashboard/api/clinical-records/records/',
      clinicalRecordDetail: (id) => `/dashboard/api/clinical-records/records/${id}/`,
      documentUpload: '/dashboard/api/clinical-records/records/upload/',
      clinicalRecordsSearch: '/dashboard/api/clinical-records/records/search/',
      documentProcessingStatus: (id) => `/dashboard/api/clinical-records/documents/${id}/status/`,
      documentDetail: (id) => `/dashboard/api/clinical-records/documents/${id}/`,
      documentViewUrl: (id) => `/dashboard/api/clinical-records/documents/${id}/view-url/`,
      documentDownloadUrl: (id) => `/dashboard/api/clinical-records/documents/${id}/download-url/`,
      createDocumentShare: '/dashboard/api/clinical-records/documents/share/',
      createRecordShare: '/dashboard/api/clinical-records/records/share/',
      
      // Notification endpoints
      notifications: '/notifications/api/mobile/',
      registerPushToken: '/notifications/api/mobile/register-push-token/',
      unregisterPushToken: '/notifications/api/mobile/unregister-push-token/',
      markNotificationsRead: '/notifications/api/mobile/mark-read/',
      notificationSummary: '/notifications/api/mobile/summary/',
      realTimeUpdates: '/notifications/api/mobile/real-time-updates/',
      offlineSync: '/notifications/api/mobile/offline-sync/',
      syncStatus: '/notifications/api/mobile/sync-status/',
      notificationPreferences: '/notifications/api/mobile/preferences/',
    };
  }

  /**
   * Make authenticated API request to Clinical Records Service
   */
  async makeClinicalRecordsRequest(endpoint, options = {}) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${this.clinicalRecordsServiceURL}${endpoint}`;
      const config = {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      };

      debugInfo(`Clinical Records Service Request: ${options.method || 'GET'} ${url}`, config, 'ClinicalRecordsAPI');

      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry with new token
          const newToken = await AsyncStorage.getItem('userToken');
          config.headers['Authorization'] = `Bearer ${newToken}`;
          return await fetch(url, config);
        } else {
          throw new Error('Authentication failed');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      debugError(`Clinical Records Service Error (${endpoint}):`, error, 'ClinicalRecordsAPI');
      throw error;
    }
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, options = {}) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${this.baseURL}${endpoint}`;
      const config = {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      };

      console.log(`Mobile API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry with new token
          const newToken = await AsyncStorage.getItem('userToken');
          config.headers['Authorization'] = `Bearer ${newToken}`;
          return await fetch(url, config);
        } else {
          throw new Error('Authentication failed');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Mobile API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/users/api/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const tokens = await response.json();
        await AsyncStorage.setItem('userToken', tokens.access);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  // Dashboard API Methods
  
  /**
   * Get mobile dashboard data
   */
  async getDashboardData(options = {}) {
    const params = new URLSearchParams({
      date_range: options.dateRange || '30',
      include_trends: options.includeTrends ? 'true' : 'false',
      compact: options.compact ? 'true' : 'false',
    });

    return await this.makeRequest(`${this.endpoints.dashboard}?${params}`);
  }

  /**
   * Get clinical records summary for dashboard
   */
  async getClinicalRecordsSummary(options = {}) {
    const params = new URLSearchParams({
      date_range: options.dateRange || '30',
      ...(options.patientId && { patient_id: options.patientId }),
      ...(options.recordTypes && { record_types: options.recordTypes.join(',') }),
    });

    return await this.makeRequest(`${this.endpoints.clinicalRecordsSummary}?${params}`);
  }

  /**
   * Get recent documents for dashboard
   */
  async getRecentDocuments(options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || '10',
      ...(options.documentTypes && { document_types: options.documentTypes.join(',') }),
      ...(options.processingStatus && { processing_status: options.processingStatus }),
    });

    return await this.makeRequest(`${this.endpoints.recentDocuments}?${params}`);
  }

  /**
   * Get quick actions for dashboard
   */
  async getQuickActions() {
    return await this.makeRequest(this.endpoints.quickActions);
  }

  /**
   * Get dashboard alerts
   */
  async getDashboardAlerts(options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || '10',
      unread_only: options.unreadOnly ? 'true' : 'false',
      ...(options.categories && { categories: options.categories.join(',') }),
    });

    return await this.makeRequest(`${this.endpoints.alerts}?${params}`);
  }

  /**
   * Mark alert as read
   */
  async markAlertRead(alertId) {
    return await this.makeRequest(`${this.endpoints.alerts}${alertId}/read/`, {
      method: 'POST',
    });
  }

  /**
   * Dismiss alert
   */
  async dismissAlert(alertId) {
    return await this.makeRequest(`${this.endpoints.alerts}${alertId}/dismiss/`, {
      method: 'POST',
    });
  }

  /**
   * Get dashboard preferences
   */
  async getDashboardPreferences() {
    return await this.makeRequest(this.endpoints.dashboardPreferences);
  }

  /**
   * Update dashboard preferences
   */
  async updateDashboardPreferences(preferences) {
    return await this.makeRequest(this.endpoints.dashboardPreferences, {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  }

  // Clinical Records API Methods

  /**
   * Get clinical records list
   */
  async getClinicalRecords(options = {}) {
    const params = new URLSearchParams({
      page: options.page || '1',
      page_size: options.pageSize || '10',
      ...(options.recordType && { record_type: options.recordType }),
      ...(options.status && { status: options.status }),
      ...(options.patientId && { patient_id: options.patientId }),
      ...(options.dateFrom && { date_from: options.dateFrom }),
      ...(options.dateTo && { date_to: options.dateTo }),
      ...(options.search && { search: options.search }),
      ...(options.ordering && { ordering: options.ordering }),
    });

    return await this.makeClinicalRecordsRequest(`${this.endpoints.clinicalRecords}?${params}`);
  }

  /**
   * Get clinical record detail
   */
  async getClinicalRecordDetail(recordId) {
    return await this.makeClinicalRecordsRequest(this.endpoints.clinicalRecordDetail(recordId));
  }

  /**
   * Upload document to clinical record
   */
  async uploadDocument(clinicalRecordId, file, options = {}) {
    const token = await AsyncStorage.getItem('userToken');
    
    const formData = new FormData();
    formData.append('clinical_record', clinicalRecordId);
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || 'document.jpg',
    });

    const response = await fetch(`${this.clinicalRecordsServiceURL}${this.endpoints.documentUpload}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Upload failed');
    }

    return await response.json();
  }

  /**
   * Search clinical records
   */
  async searchClinicalRecords(searchParams = {}) {
    const params = new URLSearchParams();
    
    // Handle both old and new parameter formats
    if (typeof searchParams === 'string') {
      params.append('q', searchParams);
    } else {
      if (searchParams.q) params.append('q', searchParams.q);
      if (searchParams.page) params.append('page', searchParams.page);
      if (searchParams.page_size) params.append('page_size', searchParams.page_size);
      if (searchParams.include_documents) params.append('include_documents', searchParams.include_documents);
      if (searchParams.record_type) params.append('record_type', searchParams.record_type);
      if (searchParams.priority) params.append('priority', searchParams.priority);
      if (searchParams.date_from) params.append('date_from', searchParams.date_from);
      if (searchParams.date_to) params.append('date_to', searchParams.date_to);
    }

    return await this.makeClinicalRecordsRequest(`${this.endpoints.clinicalRecordsSearch}?${params}`);
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query, type = 'medications') {
    const params = new URLSearchParams({
      q: query,
      type: type,
    });

    return await this.makeRequest(`/api/clinical-records/search/suggestions/?${params}`);
  }

  /**
   * Get document processing status
   */
  async getDocumentProcessingStatus(documentId) {
    return await this.makeRequest(this.endpoints.documentProcessingStatus(documentId));
  }

  // Notification API Methods

  /**
   * Register push notification token
   */
  async registerPushToken(tokenData) {
    return await this.makeRequest(this.endpoints.registerPushToken, {
      method: 'POST',
      body: JSON.stringify(tokenData),
    });
  }

  /**
   * Unregister push notification token
   */
  async unregisterPushToken(deviceId) {
    return await this.makeRequest(this.endpoints.unregisterPushToken, {
      method: 'DELETE',
      body: JSON.stringify({ device_id: deviceId }),
    });
  }

  /**
   * Get notifications list
   */
  async getNotifications(options = {}) {
    const params = new URLSearchParams({
      page: options.page || '1',
      page_size: options.pageSize || '20',
      unread_only: options.unreadOnly ? 'true' : 'false',
      ...(options.notificationType && { notification_type: options.notificationType }),
      ...(options.dateFrom && { date_from: options.dateFrom }),
      ...(options.dateTo && { date_to: options.dateTo }),
    });

    return await this.makeRequest(`${this.endpoints.notifications}?${params}`);
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsRead(notificationIds = [], markAll = false) {
    return await this.makeRequest(this.endpoints.markNotificationsRead, {
      method: 'POST',
      body: JSON.stringify({
        notification_ids: notificationIds,
        mark_all: markAll,
      }),
    });
  }

  /**
   * Get notification summary
   */
  async getNotificationSummary() {
    return await this.makeRequest(this.endpoints.notificationSummary);
  }

  /**
   * Get real-time updates
   */
  async getRealTimeUpdates(lastCheck = null, types = []) {
    const params = new URLSearchParams({
      ...(lastCheck && { last_check: lastCheck }),
      ...(types.length > 0 && { types: types.join(',') }),
    });

    return await this.makeRequest(`${this.endpoints.realTimeUpdates}?${params}`);
  }

  /**
   * Sync offline data
   */
  async syncOfflineData(lastSync = null, clientData = {}) {
    return await this.makeRequest(this.endpoints.offlineSync, {
      method: 'POST',
      body: JSON.stringify({
        last_sync: lastSync,
        client_data: clientData,
      }),
    });
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    return await this.makeRequest(this.endpoints.syncStatus);
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences() {
    return await this.makeRequest(this.endpoints.notificationPreferences);
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences) {
    return await this.makeRequest(this.endpoints.notificationPreferences, {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  }

  /**
   * Get notification history with advanced filtering
   */
  async getNotificationHistory(options = {}) {
    const params = new URLSearchParams({
      page: options.page || '1',
      page_size: options.pageSize || '50',
      ...(options.dateFrom && { date_from: options.dateFrom }),
      ...(options.dateTo && { date_to: options.dateTo }),
      ...(options.notificationType && { notification_type: options.notificationType }),
      ...(options.unreadOnly && { unread_only: 'true' }),
      ...(options.search && { search: options.search }),
    });

    return await this.makeRequest(`${this.endpoints.notifications}?${params.toString()}`);
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    return await this.makeRequest(`${this.endpoints.notifications}${notificationId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Bulk delete notifications
   */
  async bulkDeleteNotifications(notificationIds) {
    return await this.makeRequest(`${this.endpoints.notifications}bulk-delete/`, {
      method: 'POST',
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
  }

  /**
   * Get notification statistics
   */
  async getNotificationStatistics(options = {}) {
    const params = new URLSearchParams({
      ...(options.dateFrom && { date_from: options.dateFrom }),
      ...(options.dateTo && { date_to: options.dateTo }),
    });

    return await this.makeRequest(`${this.endpoints.notifications}statistics/?${params.toString()}`);
  }

  /**
   * Test push notification
   */
  async testPushNotification() {
    return await this.makeRequest(`${this.endpoints.notifications}test-push/`, {
      method: 'POST',
    });
  }

  // Document API Methods

  /**
   * Get document detail
   */
  async getDocumentDetail(documentId) {
    return await this.makeRequest(this.endpoints.documentDetail(documentId));
  }

  /**
   * Get document view URL
   */
  async getDocumentViewUrl(documentId) {
    return await this.makeRequest(this.endpoints.documentViewUrl(documentId));
  }

  /**
   * Get document download URL
   */
  async getDocumentDownloadUrl(documentId) {
    return await this.makeRequest(this.endpoints.documentDownloadUrl(documentId));
  }

  // Sharing API Methods

  /**
   * Create secure share link for a clinical record
   */
  async createRecordShare(shareData) {
    return await this.makeRequest(this.endpoints.createRecordShare, {
      method: 'POST',
      body: JSON.stringify(shareData),
    });
  }

  /**
   * Create secure share link for a document
   */
  async createDocumentShare(shareData) {
    return await this.makeRequest(this.endpoints.createDocumentShare, {
      method: 'POST',
      body: JSON.stringify(shareData),
    });
  }

  /**
   * Create secure share link for patient bundle
   */
  async createPatientBundleShare(shareData) {
    return await this.makeRequest('/api/clinical-records/sharing/create-patient-bundle-share/', {
      method: 'POST',
      body: JSON.stringify(shareData),
    });
  }

  /**
   * List share tokens
   */
  async getShareTokens(options = {}) {
    const params = new URLSearchParams({
      page: options.page || '1',
      page_size: options.pageSize || '20',
      ...(options.scope && { scope: options.scope }),
      ...(options.isActive !== undefined && { is_active: options.isActive.toString() }),
      ...(options.patientId && { patient_id: options.patientId }),
    });

    return await this.makeRequest(`/api/clinical-records/sharing/list/?${params}`);
  }

  /**
   * Revoke share token
   */
  async revokeShareToken(tokenId, reason = '') {
    return await this.makeRequest(`/api/clinical-records/sharing/revoke/${tokenId}/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Extend share token expiry
   */
  async extendShareToken(tokenId, additionalHours) {
    return await this.makeRequest(`/api/clinical-records/sharing/extend/${tokenId}/`, {
      method: 'POST',
      body: JSON.stringify({ additional_hours: additionalHours }),
    });
  }

  // Utility Methods

  /**
   * Check if device is online
   */
  async isOnline() {
    try {
      const response = await fetch(`${this.baseURL}/api/health/`, {
        method: 'HEAD',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cached data
   */
  async getCachedData(key) {
    try {
      const data = await AsyncStorage.getItem(`cache_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async setCachedData(key, data, ttl = 300000) { // 5 minutes default TTL
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Check if cached data is valid
   */
  async isCacheValid(key) {
    try {
      const cached = await this.getCachedData(key);
      if (!cached) return false;
      
      const { timestamp, ttl } = cached;
      return (Date.now() - timestamp) < ttl;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear cache
   */
  async clearCache(pattern = null) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => {
        if (pattern) {
          return key.startsWith('cache_') && key.includes(pattern);
        }
        return key.startsWith('cache_');
      });
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

// Create singleton instance
const mobileApiService = new MobileApiService();

export default mobileApiService;