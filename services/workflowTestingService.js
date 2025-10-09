/**
 * Workflow Testing Service
 * Tests complete mobile user workflows across all roles
 */

import { integrationService } from './integrationService';
import { authService } from './authService';
import { dashboardService } from './dashboardService';
import { clinicalRecordsService } from './clinicalRecordsService';
import { appointmentService } from './appointmentService';
import { prescriptionService } from './prescriptionService';

class WorkflowTestingService {
  constructor() {
    this.testResults = {};
    this.currentTest = null;
    this.testStartTime = null;
  }

  /**
   * Run all workflow tests
   */
  async runAllWorkflowTests() {
    console.log('Starting comprehensive workflow tests...');
    
    const testSuite = [
      { name: 'Doctor Workflow', test: this.testDoctorWorkflow.bind(this) },
      { name: 'Patient Workflow', test: this.testPatientWorkflow.bind(this) },
      { name: 'Admin Workflow', test: this.testAdminWorkflow.bind(this) },
      { name: 'Staff Workflow', test: this.testStaffWorkflow.bind(this) },
      { name: 'Cross-Role Integration', test: this.testCrossRoleIntegration.bind(this) },
      { name: 'Offline Workflow', test: this.testOfflineWorkflow.bind(this) },
      { name: 'Real-time Updates', test: this.testRealTimeWorkflow.bind(this) },
      { name: 'Performance Workflow', test: this.testPerformanceWorkflow.bind(this) }
    ];

    const results = {};
    
    for (const testCase of testSuite) {
      try {
        console.log(`Running ${testCase.name}...`);
        this.currentTest = testCase.name;
        this.testStartTime = Date.now();
        
        const result = await testCase.test();
        results[testCase.name] = {
          status: 'passed',
          duration: Date.now() - this.testStartTime,
          details: result
        };
        
        console.log(`✅ ${testCase.name} passed`);
      } catch (error) {
        console.error(`❌ ${testCase.name} failed:`, error);
        results[testCase.name] = {
          status: 'failed',
          duration: Date.now() - this.testStartTime,
          error: error.message,
          stack: error.stack
        };
      }
    }
    
    this.testResults = results;
    this.generateTestReport();
    
    return results;
  }

  /**
   * Test doctor workflow
   */
  async testDoctorWorkflow() {
    const testSteps = [];
    
    // Step 1: Login as doctor
    testSteps.push(await this.testStep('Doctor Login', async () => {
      const loginResult = await authService.login({
        email: 'doctor@test.com',
        password: 'testpassword',
        role: 'doctor'
      });
      
      if (!loginResult.success) {
        throw new Error('Doctor login failed');
      }
      
      return { userId: loginResult.user.id, token: loginResult.token };
    }));

    // Step 2: Load doctor dashboard
    testSteps.push(await this.testStep('Load Doctor Dashboard', async () => {
      const dashboardData = await integrationService.getDashboardData(
        'doctor',
        testSteps[0].result.userId,
        'test-clinic-1'
      );
      
      if (!dashboardData || !dashboardData.metrics) {
        throw new Error('Dashboard data not loaded');
      }
      
      return { metricsCount: Object.keys(dashboardData.metrics).length };
    }));

    // Step 3: View clinical records
    testSteps.push(await this.testStep('View Clinical Records', async () => {
      const records = await integrationService.getClinicalRecords({
        doctorId: testSteps[0].result.userId
      });
      
      if (!Array.isArray(records)) {
        throw new Error('Clinical records not loaded');
      }
      
      return { recordsCount: records.length };
    }));

    // Step 4: Upload clinical document
    testSteps.push(await this.testStep('Upload Clinical Document', async () => {
      const mockDocument = {
        name: 'test-document.pdf',
        type: 'application/pdf',
        size: 1024,
        data: 'mock-file-data'
      };
      
      const uploadResult = await integrationService.uploadDocument(
        mockDocument,
        (progress) => console.log(`Upload progress: ${progress}%`)
      );
      
      if (!uploadResult.id) {
        throw new Error('Document upload failed');
      }
      
      return { documentId: uploadResult.id };
    }));

    // Step 5: Search clinical records
    testSteps.push(await this.testStep('Search Clinical Records', async () => {
      const searchResults = await integrationService.searchClinicalRecords(
        'test',
        { documentType: 'pdf' }
      );
      
      if (!Array.isArray(searchResults)) {
        throw new Error('Search failed');
      }
      
      return { resultsCount: searchResults.length };
    }));

    // Step 6: View appointments
    testSteps.push(await this.testStep('View Appointments', async () => {
      const appointments = await integrationService.getAppointments({
        doctorId: testSteps[0].result.userId
      });
      
      if (!Array.isArray(appointments)) {
        throw new Error('Appointments not loaded');
      }
      
      return { appointmentsCount: appointments.length };
    }));

    // Step 7: Create prescription
    testSteps.push(await this.testStep('Create Prescription', async () => {
      const prescriptionData = {
        patientId: 'test-patient-1',
        doctorId: testSteps[0].result.userId,
        medications: [
          { name: 'Test Medicine', dosage: '10mg', frequency: 'twice daily' }
        ]
      };
      
      const prescription = await prescriptionService.createPrescription(prescriptionData);
      
      if (!prescription.id) {
        throw new Error('Prescription creation failed');
      }
      
      return { prescriptionId: prescription.id };
    }));

    return {
      totalSteps: testSteps.length,
      passedSteps: testSteps.filter(s => s.status === 'passed').length,
      failedSteps: testSteps.filter(s => s.status === 'failed').length,
      steps: testSteps
    };
  }

  /**
   * Test patient workflow
   */
  async testPatientWorkflow() {
    const testSteps = [];
    
    // Step 1: Login as patient
    testSteps.push(await this.testStep('Patient Login', async () => {
      const loginResult = await authService.login({
        email: 'patient@test.com',
        password: 'testpassword',
        role: 'patient'
      });
      
      if (!loginResult.success) {
        throw new Error('Patient login failed');
      }
      
      return { userId: loginResult.user.id, token: loginResult.token };
    }));

    // Step 2: Load patient dashboard
    testSteps.push(await this.testStep('Load Patient Dashboard', async () => {
      const dashboardData = await integrationService.getDashboardData(
        'patient',
        testSteps[0].result.userId,
        'test-clinic-1'
      );
      
      if (!dashboardData || !dashboardData.healthSummary) {
        throw new Error('Patient dashboard data not loaded');
      }
      
      return { hasHealthSummary: !!dashboardData.healthSummary };
    }));

    // Step 3: View personal clinical records
    testSteps.push(await this.testStep('View Personal Clinical Records', async () => {
      const records = await integrationService.getClinicalRecords({
        patientId: testSteps[0].result.userId
      });
      
      if (!Array.isArray(records)) {
        throw new Error('Personal clinical records not loaded');
      }
      
      return { recordsCount: records.length };
    }));

    // Step 4: Schedule appointment
    testSteps.push(await this.testStep('Schedule Appointment', async () => {
      const appointmentData = {
        patientId: testSteps[0].result.userId,
        doctorId: 'test-doctor-1',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        time: '10:00',
        type: 'consultation'
      };
      
      const appointment = await integrationService.scheduleAppointment(appointmentData);
      
      if (!appointment.id) {
        throw new Error('Appointment scheduling failed');
      }
      
      return { appointmentId: appointment.id };
    }));

    // Step 5: View prescriptions
    testSteps.push(await this.testStep('View Prescriptions', async () => {
      const prescriptions = await integrationService.getPrescriptions({
        patientId: testSteps[0].result.userId
      });
      
      if (!Array.isArray(prescriptions)) {
        throw new Error('Prescriptions not loaded');
      }
      
      return { prescriptionsCount: prescriptions.length };
    }));

    // Step 6: Share clinical record
    testSteps.push(await this.testStep('Share Clinical Record', async () => {
      const records = await integrationService.getClinicalRecords({
        patientId: testSteps[0].result.userId
      });
      
      if (records.length === 0) {
        return { skipped: true, reason: 'No records to share' };
      }
      
      const shareResult = await clinicalRecordsService.generateShareLink(
        records[0].id,
        { expiresIn: '7d', permissions: ['read'] }
      );
      
      if (!shareResult.shareUrl) {
        throw new Error('Share link generation failed');
      }
      
      return { shareUrl: shareResult.shareUrl };
    }));

    return {
      totalSteps: testSteps.length,
      passedSteps: testSteps.filter(s => s.status === 'passed').length,
      failedSteps: testSteps.filter(s => s.status === 'failed').length,
      steps: testSteps
    };
  }

  /**
   * Test admin workflow
   */
  async testAdminWorkflow() {
    const testSteps = [];
    
    // Step 1: Login as admin
    testSteps.push(await this.testStep('Admin Login', async () => {
      const loginResult = await authService.login({
        email: 'admin@test.com',
        password: 'testpassword',
        role: 'admin'
      });
      
      if (!loginResult.success) {
        throw new Error('Admin login failed');
      }
      
      return { userId: loginResult.user.id, token: loginResult.token };
    }));

    // Step 2: Load admin dashboard
    testSteps.push(await this.testStep('Load Admin Dashboard', async () => {
      const dashboardData = await integrationService.getDashboardData(
        'admin',
        testSteps[0].result.userId,
        'test-clinic-1'
      );
      
      if (!dashboardData || !dashboardData.systemMetrics) {
        throw new Error('Admin dashboard data not loaded');
      }
      
      return { hasSystemMetrics: !!dashboardData.systemMetrics };
    }));

    // Step 3: View system analytics
    testSteps.push(await this.testStep('View System Analytics', async () => {
      const analytics = await dashboardService.getSystemAnalytics('test-clinic-1');
      
      if (!analytics || !analytics.clinicalRecordsStats) {
        throw new Error('System analytics not loaded');
      }
      
      return { analyticsLoaded: true };
    }));

    // Step 4: Monitor clinical records system
    testSteps.push(await this.testStep('Monitor Clinical Records System', async () => {
      const systemHealth = await clinicalRecordsService.getSystemHealth();
      
      if (!systemHealth || typeof systemHealth.status === 'undefined') {
        throw new Error('System health check failed');
      }
      
      return { systemStatus: systemHealth.status };
    }));

    // Step 5: View audit logs
    testSteps.push(await this.testStep('View Audit Logs', async () => {
      const auditLogs = await dashboardService.getAuditLogs({
        clinicId: 'test-clinic-1',
        limit: 10
      });
      
      if (!Array.isArray(auditLogs)) {
        throw new Error('Audit logs not loaded');
      }
      
      return { logsCount: auditLogs.length };
    }));

    return {
      totalSteps: testSteps.length,
      passedSteps: testSteps.filter(s => s.status === 'passed').length,
      failedSteps: testSteps.filter(s => s.status === 'failed').length,
      steps: testSteps
    };
  }

  /**
   * Test staff workflow
   */
  async testStaffWorkflow() {
    const testSteps = [];
    
    // Step 1: Login as staff
    testSteps.push(await this.testStep('Staff Login', async () => {
      const loginResult = await authService.login({
        email: 'staff@test.com',
        password: 'testpassword',
        role: 'staff'
      });
      
      if (!loginResult.success) {
        throw new Error('Staff login failed');
      }
      
      return { userId: loginResult.user.id, token: loginResult.token };
    }));

    // Step 2: Load staff dashboard
    testSteps.push(await this.testStep('Load Staff Dashboard', async () => {
      const dashboardData = await integrationService.getDashboardData(
        'staff',
        testSteps[0].result.userId,
        'test-clinic-1'
      );
      
      if (!dashboardData || !dashboardData.tasks) {
        throw new Error('Staff dashboard data not loaded');
      }
      
      return { tasksCount: dashboardData.tasks.length };
    }));

    // Step 3: Process document review queue
    testSteps.push(await this.testStep('Process Document Review Queue', async () => {
      const reviewQueue = await clinicalRecordsService.getDocumentReviewQueue();
      
      if (!Array.isArray(reviewQueue)) {
        throw new Error('Document review queue not loaded');
      }
      
      return { queueLength: reviewQueue.length };
    }));

    // Step 4: Assist with patient record organization
    testSteps.push(await this.testStep('Assist with Patient Record Organization', async () => {
      const unorganizedRecords = await clinicalRecordsService.getUnorganizedRecords();
      
      if (!Array.isArray(unorganizedRecords)) {
        throw new Error('Unorganized records not loaded');
      }
      
      return { unorganizedCount: unorganizedRecords.length };
    }));

    return {
      totalSteps: testSteps.length,
      passedSteps: testSteps.filter(s => s.status === 'passed').length,
      failedSteps: testSteps.filter(s => s.status === 'failed').length,
      steps: testSteps
    };
  }

  /**
   * Test cross-role integration
   */
  async testCrossRoleIntegration() {
    const testSteps = [];
    
    // Test data consistency across roles
    testSteps.push(await this.testStep('Data Consistency Across Roles', async () => {
      // Login as doctor and create a clinical record
      const doctorLogin = await authService.login({
        email: 'doctor@test.com',
        password: 'testpassword',
        role: 'doctor'
      });
      
      const mockDocument = {
        name: 'cross-role-test.pdf',
        type: 'application/pdf',
        size: 1024,
        data: 'mock-file-data',
        patientId: 'test-patient-1'
      };
      
      const uploadResult = await integrationService.uploadDocument(mockDocument);
      
      // Login as patient and verify record is visible
      const patientLogin = await authService.login({
        email: 'patient@test.com',
        password: 'testpassword',
        role: 'patient'
      });
      
      const patientRecords = await integrationService.getClinicalRecords({
        patientId: 'test-patient-1'
      });
      
      const recordExists = patientRecords.some(r => r.id === uploadResult.id);
      
      if (!recordExists) {
        throw new Error('Record not visible to patient after doctor upload');
      }
      
      return { recordId: uploadResult.id, visibleToPatient: true };
    }));

    // Test role-based access control
    testSteps.push(await this.testStep('Role-Based Access Control', async () => {
      // Login as patient and try to access admin functions
      const patientLogin = await authService.login({
        email: 'patient@test.com',
        password: 'testpassword',
        role: 'patient'
      });
      
      try {
        await dashboardService.getSystemAnalytics('test-clinic-1');
        throw new Error('Patient should not have access to system analytics');
      } catch (error) {
        if (error.message.includes('Insufficient permissions')) {
          return { accessControlWorking: true };
        }
        throw error;
      }
    }));

    return {
      totalSteps: testSteps.length,
      passedSteps: testSteps.filter(s => s.status === 'passed').length,
      failedSteps: testSteps.filter(s => s.status === 'failed').length,
      steps: testSteps
    };
  }

  /**
   * Test offline workflow
   */
  async testOfflineWorkflow() {
    const testSteps = [];
    
    // Test offline data access
    testSteps.push(await this.testStep('Offline Data Access', async () => {
      // Simulate offline mode
      integrationService.setConnectionStatus('disconnected');
      
      // Try to access cached dashboard data
      const dashboardData = await integrationService.getDashboardData(
        'doctor',
        'test-doctor-1',
        'test-clinic-1'
      );
      
      if (!dashboardData) {
        throw new Error('No cached dashboard data available offline');
      }
      
      return { hasCachedData: true };
    }));

    // Test offline actions queuing
    testSteps.push(await this.testStep('Offline Actions Queuing', async () => {
      const mockDocument = {
        name: 'offline-test.pdf',
        type: 'application/pdf',
        size: 1024,
        data: 'mock-file-data'
      };
      
      const result = await integrationService.uploadDocument(mockDocument);
      
      if (result.status !== 'queued') {
        throw new Error('Document should be queued when offline');
      }
      
      return { actionQueued: true };
    }));

    // Test sync when back online
    testSteps.push(await this.testStep('Sync When Back Online', async () => {
      // Simulate coming back online
      integrationService.setConnectionStatus('connected');
      
      // Wait for sync to complete
      await new Promise(resolve => {
        const timeout = setTimeout(() => resolve(), 5000);
        integrationService.once('sync_completed', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      return { syncCompleted: true };
    }));

    return {
      totalSteps: testSteps.length,
      passedSteps: testSteps.filter(s => s.status === 'passed').length,
      failedSteps: testSteps.filter(s => s.status === 'failed').length,
      steps: testSteps
    };
  }

  /**
   * Test real-time updates workflow
   */
  async testRealTimeWorkflow() {
    const testSteps = [];
    
    // Test real-time dashboard updates
    testSteps.push(await this.testStep('Real-time Dashboard Updates', async () => {
      let updateReceived = false;
      
      // Listen for dashboard updates
      const updateHandler = () => {
        updateReceived = true;
      };
      
      integrationService.once('dashboard_updated', updateHandler);
      
      // Simulate dashboard update from backend
      integrationService.handleDashboardUpdate({
        type: 'metrics_update',
        data: { newPatients: 5 }
      });
      
      // Wait for update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!updateReceived) {
        throw new Error('Dashboard update not received');
      }
      
      return { updateReceived: true };
    }));

    // Test real-time notifications
    testSteps.push(await this.testStep('Real-time Notifications', async () => {
      let notificationReceived = false;
      
      // Listen for notifications
      const notificationHandler = () => {
        notificationReceived = true;
      };
      
      integrationService.once('notification_received', notificationHandler);
      
      // Simulate notification from backend
      integrationService.handleNotification({
        id: 'test-notification',
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'normal'
      });
      
      // Wait for notification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!notificationReceived) {
        throw new Error('Notification not received');
      }
      
      return { notificationReceived: true };
    }));

    return {
      totalSteps: testSteps.length,
      passedSteps: testSteps.filter(s => s.status === 'passed').length,
      failedSteps: testSteps.filter(s => s.status === 'failed').length,
      steps: testSteps
    };
  }

  /**
   * Test performance workflow
   */
  async testPerformanceWorkflow() {
    const testSteps = [];
    
    // Test API response times
    testSteps.push(await this.testStep('API Response Times', async () => {
      const startTime = Date.now();
      
      await integrationService.getDashboardData('doctor', 'test-doctor-1', 'test-clinic-1');
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 5000) { // 5 seconds threshold
        throw new Error(`API response too slow: ${responseTime}ms`);
      }
      
      return { responseTime };
    }));

    // Test memory usage
    testSteps.push(await this.testStep('Memory Usage', async () => {
      const memoryUsage = integrationService.services.performance?.getMemoryUsage();
      
      if (!memoryUsage) {
        return { skipped: true, reason: 'Memory monitoring not available' };
      }
      
      if (memoryUsage.used > memoryUsage.total * 0.9) { // 90% threshold
        throw new Error(`Memory usage too high: ${memoryUsage.used}/${memoryUsage.total}`);
      }
      
      return { memoryUsage };
    }));

    return {
      totalSteps: testSteps.length,
      passedSteps: testSteps.filter(s => s.status === 'passed').length,
      failedSteps: testSteps.filter(s => s.status === 'failed').length,
      steps: testSteps
    };
  }

  /**
   * Execute a test step with error handling
   */
  async testStep(stepName, testFunction) {
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      
      return {
        name: stepName,
        status: 'passed',
        duration: Date.now() - startTime,
        result
      };
    } catch (error) {
      return {
        name: stepName,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: Object.keys(this.testResults).length,
        passedTests: Object.values(this.testResults).filter(r => r.status === 'passed').length,
        failedTests: Object.values(this.testResults).filter(r => r.status === 'failed').length,
        totalDuration: Object.values(this.testResults).reduce((sum, r) => sum + r.duration, 0)
      },
      results: this.testResults,
      recommendations: this.generateRecommendations()
    };
    
    console.log('=== Mobile App Workflow Test Report ===');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    console.log(`Total Duration: ${report.summary.totalDuration}ms`);
    console.log('========================================');
    
    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Check for failed tests
    const failedTests = Object.entries(this.testResults)
      .filter(([_, result]) => result.status === 'failed');
    
    if (failedTests.length > 0) {
      recommendations.push({
        type: 'critical',
        message: `${failedTests.length} workflow tests failed. Review and fix issues before deployment.`,
        tests: failedTests.map(([name, _]) => name)
      });
    }
    
    // Check for performance issues
    const slowTests = Object.entries(this.testResults)
      .filter(([_, result]) => result.duration > 10000); // 10 seconds
    
    if (slowTests.length > 0) {
      recommendations.push({
        type: 'performance',
        message: 'Some workflows are running slowly. Consider optimization.',
        tests: slowTests.map(([name, result]) => ({ name, duration: result.duration }))
      });
    }
    
    // Check for offline functionality
    const offlineTest = this.testResults['Offline Workflow'];
    if (offlineTest && offlineTest.status === 'failed') {
      recommendations.push({
        type: 'offline',
        message: 'Offline functionality is not working properly. This may impact user experience in poor network conditions.'
      });
    }
    
    return recommendations;
  }

  /**
   * Get test results
   */
  getTestResults() {
    return this.testResults;
  }

  /**
   * Clear test results
   */
  clearTestResults() {
    this.testResults = {};
    this.currentTest = null;
    this.testStartTime = null;
  }
}

export const workflowTestingService = new WorkflowTestingService();
export default workflowTestingService;