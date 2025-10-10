import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import secureTokenService from './secureTokenService';
import biometricAuthService from './biometricAuthService';

class SessionManagementService {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes default
    this.warningTimeout = 5 * 60 * 1000; // 5 minutes warning
    this.sessionTimer = null;
    this.warningTimer = null;
    this.appStateSubscription = null;
    this.backgroundTime = null;
    this.isSessionActive = false;
    this.sessionCallbacks = {
      onSessionExpired: null,
      onSessionWarning: null,
      onSessionExtended: null,
      onSessionStarted: null
    };
  }

  /**
   * Initialize session management
   */
  async initialize(callbacks = {}) {
    try {
      this.sessionCallbacks = { ...this.sessionCallbacks, ...callbacks };
      
      // Load session timeout from storage
      const storedTimeout = await AsyncStorage.getItem('sessionTimeout');
      if (storedTimeout) {
        this.sessionTimeout = parseInt(storedTimeout);
      }

      // Set up app state listener
      this.setupAppStateListener();
      
      // Check for existing session
      await this.checkExistingSession();
      
      return true;
    } catch (error) {
      console.error('Error initializing session management:', error);
      return false;
    }
  }

  /**
   * Start a new session
   */
  async startSession(userInfo = null) {
    try {
      this.isSessionActive = true;
      
      // Store session start time
      const sessionStartTime = Date.now();
      await AsyncStorage.setItem('sessionStartTime', sessionStartTime.toString());
      
      if (userInfo) {
        await AsyncStorage.setItem('sessionUserInfo', JSON.stringify(userInfo));
      }

      // Start session timer
      this.startSessionTimer();
      
      // Callback for session started
      if (this.sessionCallbacks.onSessionStarted) {
        this.sessionCallbacks.onSessionStarted(userInfo);
      }

      console.log('Session started successfully');
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      return false;
    }
  }

  /**
   * Extend current session
   */
  async extendSession() {
    try {
      if (!this.isSessionActive) {
        return false;
      }

      // Update session start time
      const sessionStartTime = Date.now();
      await AsyncStorage.setItem('sessionStartTime', sessionStartTime.toString());
      
      // Restart timers
      this.clearTimers();
      this.startSessionTimer();
      
      // Callback for session extended
      if (this.sessionCallbacks.onSessionExtended) {
        this.sessionCallbacks.onSessionExtended();
      }

      console.log('Session extended');
      return true;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }

  /**
   * End current session
   */
  async endSession(reason = 'manual') {
    try {
      this.isSessionActive = false;
      
      // Clear timers
      this.clearTimers();
      
      // Clear session data
      await AsyncStorage.removeItem('sessionStartTime');
      await AsyncStorage.removeItem('sessionUserInfo');
      
      // Clear secure tokens if session expired due to timeout
      if (reason === 'timeout' || reason === 'security') {
        await secureTokenService.clearAllTokens();
      }

      console.log(`Session ended: ${reason}`);
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }

  /**
   * Check if session is active and valid
   */
  async isSessionValid() {
    try {
      if (!this.isSessionActive) {
        return false;
      }

      const sessionStartTime = await AsyncStorage.getItem('sessionStartTime');
      if (!sessionStartTime) {
        return false;
      }

      const startTime = parseInt(sessionStartTime);
      const currentTime = Date.now();
      const timeDiff = currentTime - startTime;

      return timeDiff < this.sessionTimeout;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Get remaining session time
   */
  async getRemainingSessionTime() {
    try {
      const sessionStartTime = await AsyncStorage.getItem('sessionStartTime');
      if (!sessionStartTime) {
        return 0;
      }

      const startTime = parseInt(sessionStartTime);
      const currentTime = Date.now();
      const timeDiff = currentTime - startTime;
      const remainingTime = this.sessionTimeout - timeDiff;

      return Math.max(0, remainingTime);
    } catch (error) {
      console.error('Error getting remaining session time:', error);
      return 0;
    }
  }

  /**
   * Set session timeout duration
   */
  async setSessionTimeout(timeoutMs) {
    try {
      this.sessionTimeout = timeoutMs;
      await AsyncStorage.setItem('sessionTimeout', timeoutMs.toString());
      
      // Restart timer with new timeout if session is active
      if (this.isSessionActive) {
        this.clearTimers();
        this.startSessionTimer();
      }

      return true;
    } catch (error) {
      console.error('Error setting session timeout:', error);
      return false;
    }
  }

  /**
   * Get current session info
   */
  async getSessionInfo() {
    try {
      const sessionStartTime = await AsyncStorage.getItem('sessionStartTime');
      const sessionUserInfo = await AsyncStorage.getItem('sessionUserInfo');
      const remainingTime = await this.getRemainingSessionTime();

      return {
        isActive: this.isSessionActive,
        startTime: sessionStartTime ? parseInt(sessionStartTime) : null,
        userInfo: sessionUserInfo ? JSON.parse(sessionUserInfo) : null,
        remainingTime,
        timeoutDuration: this.sessionTimeout
      };
    } catch (error) {
      console.error('Error getting session info:', error);
      return {
        isActive: false,
        startTime: null,
        userInfo: null,
        remainingTime: 0,
        timeoutDuration: this.sessionTimeout
      };
    }
  }

  /**
   * Handle app state changes
   */
  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background
        this.backgroundTime = Date.now();
        this.clearTimers();
      } else if (nextAppState === 'active') {
        // App coming to foreground
        await this.handleAppForeground();
      }
    });
  }

  /**
   * Handle app coming to foreground
   */
  async handleAppForeground() {
    try {
      if (!this.backgroundTime || !this.isSessionActive) {
        return;
      }

      const backgroundDuration = Date.now() - this.backgroundTime;
      const maxBackgroundTime = 5 * 60 * 1000; // 5 minutes

      if (backgroundDuration > maxBackgroundTime) {
        // App was in background too long, require re-authentication
        await this.requireReAuthentication();
      } else {
        // Check if session is still valid
        const isValid = await this.isSessionValid();
        if (isValid) {
          this.startSessionTimer();
        } else {
          await this.handleSessionExpired();
        }
      }

      this.backgroundTime = null;
    } catch (error) {
      console.error('Error handling app foreground:', error);
    }
  }

  /**
   * Require re-authentication after background
   */
  async requireReAuthentication() {
    try {
      // Check if biometric auth is enabled
      const biometricStatus = await biometricAuthService.getBiometricStatus();
      
      if (biometricStatus.enabled) {
        const authResult = await biometricAuthService.authenticate({
          promptMessage: 'Authenticate to continue using RxDoctor'
        });

        if (authResult.success) {
          await this.extendSession();
          return true;
        }
      }

      // If biometric auth fails or not enabled, end session
      await this.endSession('security');
      
      if (this.sessionCallbacks.onSessionExpired) {
        this.sessionCallbacks.onSessionExpired('security');
      }

      return false;
    } catch (error) {
      console.error('Error requiring re-authentication:', error);
      await this.endSession('error');
      return false;
    }
  }

  /**
   * Start session timer
   */
  startSessionTimer() {
    this.clearTimers();

    // Set warning timer
    const warningTime = this.sessionTimeout - this.warningTimeout;
    this.warningTimer = setTimeout(() => {
      if (this.sessionCallbacks.onSessionWarning) {
        this.sessionCallbacks.onSessionWarning(this.warningTimeout);
      }
    }, warningTime);

    // Set session expiry timer
    this.sessionTimer = setTimeout(async () => {
      await this.handleSessionExpired();
    }, this.sessionTimeout);
  }

  /**
   * Handle session expiration
   */
  async handleSessionExpired() {
    try {
      await this.endSession('timeout');
      
      if (this.sessionCallbacks.onSessionExpired) {
        this.sessionCallbacks.onSessionExpired('timeout');
      }
    } catch (error) {
      console.error('Error handling session expiration:', error);
    }
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Check for existing session on app start
   */
  async checkExistingSession() {
    try {
      const sessionStartTime = await AsyncStorage.getItem('sessionStartTime');
      
      if (sessionStartTime) {
        const isValid = await this.isSessionValid();
        
        if (isValid) {
          this.isSessionActive = true;
          this.startSessionTimer();
          
          const userInfo = await AsyncStorage.getItem('sessionUserInfo');
          if (this.sessionCallbacks.onSessionStarted && userInfo) {
            this.sessionCallbacks.onSessionStarted(JSON.parse(userInfo));
          }
        } else {
          // Clean up expired session
          await this.endSession('expired');
        }
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    }
  }

  /**
   * Cleanup on app termination
   */
  cleanup() {
    this.clearTimers();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

export default new SessionManagementService();