/**
 * Integration Service - Connects all mobile screens and components with backend systems
 * Provides unified interface for mobile app to interact with existing backend APIs
 */

import { mobileApiService } from './mobileApiService';
import { dashboardService } from './dashboardService';
import { clinicalRecordsService } from './clinicalRecordsService';
import { appointmentService } from './appointmentService';
import { prescriptionService } from './prescriptionService';
import { realTimeService } from './realTimeService';
import { offlineStorageService } from './offlineStorageService';
import { dataSyncService } from './dataSyncService';
import { performanceOptimizationService } from './performanceOptimizationService';
import { secureTokenService } from './secureTokenService';
import { auditLogService } from './auditLogService';

class IntegrationService {
  constructor() {
    this.isInitialized = false;
    this.services = {};
    this.connectionStatus = 'disconnected';
    this.lastSyncTime = null;
    this.performanceMetrics = {};
  }

  /**
   * Initialize all services and establish connections
   */
  async initialize() {
    try {
      console.log('Initializing Integration Service...');
      
      // Initialize core services
      await this.initializeCoreServices();
      
      // Initialize real-time connections
      await this.initializeRealTimeServices();
      
      // Initialize offline capabilities
      await this.initializeOfflineServices();
      
      // Initialize performance monitoring
      await this.initializePerformanceMonitoring();
      
      // Initialize security services
      await this.initializeSecurityServices();
      
      this.isInitialized = true;
      this.connectionStatus = 'connected';
      
      console.log('Integration Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Integration Service:', error);
      throw error;
    }
  }

  /**
   * Initialize core API services
   */
  async initializeCoreServices() {
    this.services.mobileApi = mobileApiService;
    this.services.dashboard = dashboardService;
    this.services.clinicalRecords = clinicalRecordsService;
    this.services.appointments = appointmentService;
    this.services.prescriptions = prescriptionService;
    
    // Initialize each service
    await Promise.all([
      this.services.mobileApi.initialize(),
      this.services.dashboard.initialize(),
      this.services.clinicalRecords.initialize(),
      this.services.appointments.initialize(),
      this.services.prescriptions.initialize()
    ]);
  }

  /**
   * Initialize real-time services
   */
  async initializeRealTimeServices() {
    this.services.realTime = realTimeService;
    await this.services.realTime.initialize();
    
    // Set up real-time event handlers
    this.setupRealTimeEventHandlers();
  }

  /**
   * Initialize offline services
   */
  async initializeOfflineServices() {
    this.services.offlineStorage = offlineStorageService;
    this.services.dataSync = dataSyncService;
    
    await Promise.all([
      this.services.offlineStorage.initialize(),
      this.services.dataSync.initialize()
    ]);
    
    // Set up offline event handlers
    this.setupOfflineEventHandlers();
  }

  /**
   * Initialize performance monitoring
   */
  async initializePerformanceMonitoring() {
    this.services.performance = performanceOptimizationService;
    await this.services.performance.initialize();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize security services
   */
  async initializeSecurityServices() {
    this.services.secureToken = secureTokenService;
    this.services.auditLog = auditLogService;
    
    await Promise.all([
      this.services.secureToken.initialize(),
      this.services.auditLog.initialize()
    ]);
  }

  /**
   * Set up real-time event handlers
   */
  setupRealTimeEventHandlers() {
    this.services.realTime.on('dashboard_update', this.handleDashboardUpdate.bind(this));
    this.services.realTime.on('clinical_record_update', this.handleClinicalRecordUpdate.bind(this));
    this.services.realTime.on('appointment_update', this.handleAppointmentUpdate.bind(this));
    this.services.realTime.on('prescription_update', this.handlePrescriptionUpdate.bind(this));
    this.services.realTime.on('notification', this.handleNotification.bind(this));
  }

  /**
   * Set up offline event handlers
   */
  setupOfflineEventHandlers() {
    this.services.dataSync.on('sync_started', this.handleSyncStarted.bind(this));
    this.services.dataSync.on('sync_completed', this.handleSyncCompleted.bind(this));
    this.services.dataSync.on('sync_failed', this.handleSyncFailed.bind(this));
    this.services.dataSync.on('conflict_detected', this.handleSyncConflict.bind(this));
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000); // Collect metrics every 30 seconds
  }

  /**
   * Get dashboard data for specific role
   */
  async getDashboardData(role, userId, clinicId) {
    try {
      const startTime = Date.now();
      
      // Try to get from cache first
      const cachedData = await this.services.offlineStorage.getDashboardData(role, userId);
      if (cachedData && this.connectionStatus === 'disconnected') {
        return cachedData;
      }
      
      // Fetch from API
      const data = await this.services.dashboard.getDashboardData(role, userId, clinicId);
      
      // Cache the data
      await this.services.offlineStorage.cacheDashboardData(role, userId, data);
      
      // Log performance
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('dashboard_load', duration);
      
      // Log audit event
      await this.services.auditLog.logEvent('dashboard_access', {
        role,
        userId,
        clinicId,
        duration
      });
      
      return data;
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      
      // Try to return cached data on error
      const cachedData = await this.services.offlineStorage.getDashboardData(role, userId);
      if (cachedData) {
        return cachedData;
      }
      
      throw error;
    }
  }

  /**
   * Get clinical records with caching and offline support
   */
  async getClinicalRecords(filters = {}, pagination = {}) {
    try {
      const startTime = Date.now();
      
      // Check offline status
      if (this.connectionStatus === 'disconnected') {
        return await this.services.offlineStorage.getClinicalRecords(filters, pagination);
      }
      
      // Fetch from API
      const records = await this.services.clinicalRecords.getRecords(filters, pagination);
      
      // Cache the records
      await this.services.offlineStorage.cacheClinicalRecords(records, filters);
      
      // Log performance
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('clinical_records_load', duration);
      
      return records;
    } catch (error) {
      console.error('Failed to get clinical records:', error);
      
      // Try to return cached data
      const cachedRecords = await this.services.offlineStorage.getClinicalRecords(filters, pagination);
      if (cachedRecords) {
        return cachedRecords;
      }
      
      throw error;
    }
  }

  /**
   * Upload document with progress tracking and offline support
   */
  async uploadDocument(documentData, progressCallback) {
    try {
      const startTime = Date.now();
      
      // Check if offline - queue for later upload
      if (this.connectionStatus === 'disconnected') {
        await this.services.offlineStorage.queueDocumentUpload(documentData);
        return { status: 'queued', message: 'Document queued for upload when online' };
      }
      
      // Upload document
      const result = await this.services.clinicalRecords.uploadDocument(
        documentData,
        progressCallback
      );
      
      // Log performance
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('document_upload', duration);
      
      // Log audit event
      await this.services.auditLog.logEvent('document_upload', {
        documentId: result.id,
        size: documentData.size,
        type: documentData.type,
        duration
      });
      
      return result;
    } catch (error) {
      console.error('Failed to upload document:', error);
      
      // Queue for retry if network error
      if (error.code === 'NETWORK_ERROR') {
        await this.services.offlineStorage.queueDocumentUpload(documentData);
        return { status: 'queued', message: 'Document queued for upload when online' };
      }
      
      throw error;
    }
  }

  /**
   * Search clinical records with caching
   */
  async searchClinicalRecords(query, filters = {}) {
    try {
      const startTime = Date.now();
      
      // Check cache first
      const cacheKey = `search_${JSON.stringify({ query, filters })}`;
      const cachedResults = await this.services.offlineStorage.getCachedSearchResults(cacheKey);
      
      if (cachedResults && this.connectionStatus === 'disconnected') {
        return cachedResults;
      }
      
      // Search via API
      const results = await this.services.clinicalRecords.searchRecords(query, filters);
      
      // Cache results
      await this.services.offlineStorage.cacheSearchResults(cacheKey, results);
      
      // Log performance
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('search', duration);
      
      return results;
    } catch (error) {
      console.error('Failed to search clinical records:', error);
      
      // Return cached results if available
      const cacheKey = `search_${JSON.stringify({ query, filters })}`;
      const cachedResults = await this.services.offlineStorage.getCachedSearchResults(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }
      
      throw error;
    }
  }

  /**
   * Get appointments with offline support
   */
  async getAppointments(filters = {}) {
    try {
      const startTime = Date.now();
      
      if (this.connectionStatus === 'disconnected') {
        return await this.services.offlineStorage.getAppointments(filters);
      }
      
      const appointments = await this.services.appointments.getAppointments(filters);
      
      // Cache appointments
      await this.services.offlineStorage.cacheAppointments(appointments);
      
      // Log performance
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('appointments_load', duration);
      
      return appointments;
    } catch (error) {
      console.error('Failed to get appointments:', error);
      
      const cachedAppointments = await this.services.offlineStorage.getAppointments(filters);
      if (cachedAppointments) {
        return cachedAppointments;
      }
      
      throw error;
    }
  }

  /**
   * Schedule appointment with offline support
   */
  async scheduleAppointment(appointmentData) {
    try {
      const startTime = Date.now();
      
      if (this.connectionStatus === 'disconnected') {
        await this.services.offlineStorage.queueAppointmentAction('schedule', appointmentData);
        return { status: 'queued', message: 'Appointment queued for scheduling when online' };
      }
      
      const result = await this.services.appointments.scheduleAppointment(appointmentData);
      
      // Update cache
      await this.services.offlineStorage.updateAppointmentCache(result);
      
      // Log performance
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('appointment_schedule', duration);
      
      // Log audit event
      await this.services.auditLog.logEvent('appointment_scheduled', {
        appointmentId: result.id,
        patientId: appointmentData.patientId,
        doctorId: appointmentData.doctorId,
        duration
      });
      
      return result;
    } catch (error) {
      console.error('Failed to schedule appointment:', error);
      
      if (error.code === 'NETWORK_ERROR') {
        await this.services.offlineStorage.queueAppointmentAction('schedule', appointmentData);
        return { status: 'queued', message: 'Appointment queued for scheduling when online' };
      }
      
      throw error;
    }
  }

  /**
   * Get prescriptions with offline support
   */
  async getPrescriptions(filters = {}) {
    try {
      const startTime = Date.now();
      
      if (this.connectionStatus === 'disconnected') {
        return await this.services.offlineStorage.getPrescriptions(filters);
      }
      
      const prescriptions = await this.services.prescriptions.getPrescriptions(filters);
      
      // Cache prescriptions
      await this.services.offlineStorage.cachePrescriptions(prescriptions);
      
      // Log performance
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('prescriptions_load', duration);
      
      return prescriptions;
    } catch (error) {
      console.error('Failed to get prescriptions:', error);
      
      const cachedPrescriptions = await this.services.offlineStorage.getPrescriptions(filters);
      if (cachedPrescriptions) {
        return cachedPrescriptions;
      }
      
      throw error;
    }
  }

  /**
   * Process prescription scan with OCR
   */
  async processPrescriptionScan(imageData) {
    try {
      const startTime = Date.now();
      
      if (this.connectionStatus === 'disconnected') {
        await this.services.offlineStorage.queuePrescriptionScan(imageData);
        return { status: 'queued', message: 'Prescription scan queued for processing when online' };
      }
      
      const result = await this.services.prescriptions.processScan(imageData);
      
      // Log performance
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('prescription_scan', duration);
      
      // Log audit event
      await this.services.auditLog.logEvent('prescription_scan', {
        scanId: result.id,
        imageSize: imageData.size,
        duration
      });
      
      return result;
    } catch (error) {
      console.error('Failed to process prescription scan:', error);
      
      if (error.code === 'NETWORK_ERROR') {
        await this.services.offlineStorage.queuePrescriptionScan(imageData);
        return { status: 'queued', message: 'Prescription scan queued for processing when online' };
      }
      
      throw error;
    }
  }

  /**
   * Sync all offline data when connection is restored
   */
  async syncOfflineData() {
    try {
      console.log('Starting offline data sync...');
      
      await this.services.dataSync.syncAll();
      
      this.lastSyncTime = new Date();
      console.log('Offline data sync completed successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to sync offline data:', error);
      throw error;
    }
  }

  /**
   * Handle real-time dashboard updates
   */
  handleDashboardUpdate(data) {
    console.log('Dashboard update received:', data);
    // Emit event for components to update
    this.emit('dashboard_updated', data);
  }

  /**
   * Handle real-time clinical record updates
   */
  handleClinicalRecordUpdate(data) {
    console.log('Clinical record update received:', data);
    // Update cache
    this.services.offlineStorage.updateClinicalRecordCache(data);
    // Emit event for components to update
    this.emit('clinical_record_updated', data);
  }

  /**
   * Handle real-time appointment updates
   */
  handleAppointmentUpdate(data) {
    console.log('Appointment update received:', data);
    // Update cache
    this.services.offlineStorage.updateAppointmentCache(data);
    // Emit event for components to update
    this.emit('appointment_updated', data);
  }

  /**
   * Handle real-time prescription updates
   */
  handlePrescriptionUpdate(data) {
    console.log('Prescription update received:', data);
    // Update cache
    this.services.offlineStorage.updatePrescriptionCache(data);
    // Emit event for components to update
    this.emit('prescription_updated', data);
  }

  /**
   * Handle real-time notifications
   */
  handleNotification(notification) {
    console.log('Notification received:', notification);
    // Emit event for notification components
    this.emit('notification_received', notification);
  }

  /**
   * Handle sync started event
   */
  handleSyncStarted() {
    console.log('Data sync started');
    this.emit('sync_started');
  }

  /**
   * Handle sync completed event
   */
  handleSyncCompleted() {
    console.log('Data sync completed');
    this.lastSyncTime = new Date();
    this.emit('sync_completed');
  }

  /**
   * Handle sync failed event
   */
  handleSyncFailed(error) {
    console.error('Data sync failed:', error);
    this.emit('sync_failed', error);
  }

  /**
   * Handle sync conflict
   */
  handleSyncConflict(conflict) {
    console.log('Sync conflict detected:', conflict);
    this.emit('sync_conflict', conflict);
  }

  /**
   * Log performance metric
   */
  logPerformanceMetric(operation, duration) {
    if (!this.performanceMetrics[operation]) {
      this.performanceMetrics[operation] = [];
    }
    
    this.performanceMetrics[operation].push({
      duration,
      timestamp: Date.now()
    });
    
    // Keep only last 100 metrics per operation
    if (this.performanceMetrics[operation].length > 100) {
      this.performanceMetrics[operation] = this.performanceMetrics[operation].slice(-100);
    }
  }

  /**
   * Collect performance metrics
   */
  collectPerformanceMetrics() {
    const metrics = {
      connectionStatus: this.connectionStatus,
      lastSyncTime: this.lastSyncTime,
      memoryUsage: this.services.performance?.getMemoryUsage(),
      batteryLevel: this.services.performance?.getBatteryLevel(),
      networkSpeed: this.services.performance?.getNetworkSpeed(),
      operationMetrics: this.performanceMetrics
    };
    
    // Send metrics to backend for analysis
    this.services.mobileApi.sendPerformanceMetrics(metrics).catch(error => {
      console.warn('Failed to send performance metrics:', error);
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }

  /**
   * Set connection status
   */
  setConnectionStatus(status) {
    const oldStatus = this.connectionStatus;
    this.connectionStatus = status;
    
    if (oldStatus !== status) {
      this.emit('connection_status_changed', { oldStatus, newStatus: status });
      
      // If connection restored, sync offline data
      if (status === 'connected' && oldStatus === 'disconnected') {
        this.syncOfflineData().catch(error => {
          console.error('Failed to sync offline data after reconnection:', error);
        });
      }
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceMetrics;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime() {
    return this.lastSyncTime;
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized() {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      console.log('Cleaning up Integration Service...');
      
      // Cleanup all services
      await Promise.all([
        this.services.realTime?.cleanup(),
        this.services.dataSync?.cleanup(),
        this.services.performance?.cleanup(),
        this.services.offlineStorage?.cleanup()
      ]);
      
      this.isInitialized = false;
      this.connectionStatus = 'disconnected';
      
      console.log('Integration Service cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup Integration Service:', error);
    }
  }
}

// Event emitter functionality
const EventEmitter = require('events');
Object.setPrototypeOf(IntegrationService.prototype, EventEmitter.prototype);

export const integrationService = new IntegrationService();
export default integrationService;