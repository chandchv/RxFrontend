import sessionManagementService from '../../services/sessionManagementService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import biometricAuthService from '../../services/biometricAuthService';
import secureTokenService from '../../services/secureTokenService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active'
  }
}));
jest.mock('../../services/biometricAuthService');
jest.mock('../../services/secureTokenService');

describe('SessionManagementService', () => {
  const mockCallbacks = {
    onSessionExpired: jest.fn(),
    onSessionWarning: jest.fn(),
    onSessionExtended: jest.fn(),
    onSessionStarted: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset service state
    sessionManagementService.isSessionActive = false;
    sessionManagementService.sessionTimer = null;
    sessionManagementService.warningTimer = null;
    sessionManagementService.backgroundTime = null;
    sessionManagementService.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    sessionManagementService.sessionCallbacks = {
      onSessionExpired: null,
      onSessionWarning: null,
      onSessionExtended: null,
      onSessionStarted: null
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('should initialize session management successfully', async () => {
      AsyncStorage.getItem.mockResolvedValue('1800000'); // 30 minutes
      AppState.addEventListener.mockReturnValue({ remove: jest.fn() });

      const result = await sessionManagementService.initialize(mockCallbacks);

      expect(result).toBe(true);
      expect(sessionManagementService.sessionCallbacks).toEqual(
        expect.objectContaining(mockCallbacks)
      );
      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('should use default timeout when none stored', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      AppState.addEventListener.mockReturnValue({ remove: jest.fn() });

      await sessionManagementService.initialize();

      expect(sessionManagementService.sessionTimeout).toBe(30 * 60 * 1000);
    });

    it('should handle initialization errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await sessionManagementService.initialize();

      expect(result).toBe(false);
    });
  });

  describe('startSession', () => {
    it('should start session successfully', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      const userInfo = { id: 1, name: 'Test User' };

      const result = await sessionManagementService.startSession(userInfo);

      expect(result).toBe(true);
      expect(sessionManagementService.isSessionActive).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'sessionStartTime',
        expect.any(String)
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'sessionUserInfo',
        JSON.stringify(userInfo)
      );
    });

    it('should start session without user info', async () => {
      AsyncStorage.setItem.mockResolvedValue();

      const result = await sessionManagementService.startSession();

      expect(result).toBe(true);
      expect(sessionManagementService.isSessionActive).toBe(true);
    });

    it('should call onSessionStarted callback', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      sessionManagementService.sessionCallbacks.onSessionStarted = mockCallbacks.onSessionStarted;
      const userInfo = { id: 1, name: 'Test User' };

      await sessionManagementService.startSession(userInfo);

      expect(mockCallbacks.onSessionStarted).toHaveBeenCalledWith(userInfo);
    });

    it('should handle start session errors', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await sessionManagementService.startSession();

      expect(result).toBe(false);
    });
  });

  describe('extendSession', () => {
    beforeEach(() => {
      sessionManagementService.isSessionActive = true;
    });

    it('should extend session successfully', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      sessionManagementService.sessionCallbacks.onSessionExtended = mockCallbacks.onSessionExtended;

      const result = await sessionManagementService.extendSession();

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'sessionStartTime',
        expect.any(String)
      );
      expect(mockCallbacks.onSessionExtended).toHaveBeenCalled();
    });

    it('should not extend inactive session', async () => {
      sessionManagementService.isSessionActive = false;

      const result = await sessionManagementService.extendSession();

      expect(result).toBe(false);
    });

    it('should handle extend session errors', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await sessionManagementService.extendSession();

      expect(result).toBe(false);
    });
  });

  describe('endSession', () => {
    beforeEach(() => {
      sessionManagementService.isSessionActive = true;
    });

    it('should end session successfully', async () => {
      AsyncStorage.removeItem.mockResolvedValue();

      const result = await sessionManagementService.endSession('manual');

      expect(result).toBe(true);
      expect(sessionManagementService.isSessionActive).toBe(false);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('sessionStartTime');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('sessionUserInfo');
    });

    it('should clear tokens on timeout', async () => {
      AsyncStorage.removeItem.mockResolvedValue();
      secureTokenService.clearAllTokens.mockResolvedValue(true);

      await sessionManagementService.endSession('timeout');

      expect(secureTokenService.clearAllTokens).toHaveBeenCalled();
    });

    it('should clear tokens on security reason', async () => {
      AsyncStorage.removeItem.mockResolvedValue();
      secureTokenService.clearAllTokens.mockResolvedValue(true);

      await sessionManagementService.endSession('security');

      expect(secureTokenService.clearAllTokens).toHaveBeenCalled();
    });

    it('should handle end session errors', async () => {
      AsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      const result = await sessionManagementService.endSession();

      expect(result).toBe(false);
    });
  });

  describe('isSessionValid', () => {
    it('should return false for inactive session', async () => {
      sessionManagementService.isSessionActive = false;

      const result = await sessionManagementService.isSessionValid();

      expect(result).toBe(false);
    });

    it('should return false when no session start time', async () => {
      sessionManagementService.isSessionActive = true;
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await sessionManagementService.isSessionValid();

      expect(result).toBe(false);
    });

    it('should return true for valid session', async () => {
      sessionManagementService.isSessionActive = true;
      const recentTime = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      AsyncStorage.getItem.mockResolvedValue(recentTime.toString());

      const result = await sessionManagementService.isSessionValid();

      expect(result).toBe(true);
    });

    it('should return false for expired session', async () => {
      sessionManagementService.isSessionActive = true;
      const oldTime = Date.now() - (40 * 60 * 1000); // 40 minutes ago
      AsyncStorage.getItem.mockResolvedValue(oldTime.toString());

      const result = await sessionManagementService.isSessionValid();

      expect(result).toBe(false);
    });
  });

  describe('getRemainingSessionTime', () => {
    it('should return remaining time correctly', async () => {
      const startTime = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      AsyncStorage.getItem.mockResolvedValue(startTime.toString());

      const result = await sessionManagementService.getRemainingSessionTime();

      expect(result).toBe(20 * 60 * 1000); // 20 minutes remaining
    });

    it('should return 0 for expired session', async () => {
      const startTime = Date.now() - (40 * 60 * 1000); // 40 minutes ago
      AsyncStorage.getItem.mockResolvedValue(startTime.toString());

      const result = await sessionManagementService.getRemainingSessionTime();

      expect(result).toBe(0);
    });

    it('should return 0 when no session start time', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await sessionManagementService.getRemainingSessionTime();

      expect(result).toBe(0);
    });
  });

  describe('setSessionTimeout', () => {
    it('should set session timeout successfully', async () => {
      const newTimeout = 60 * 60 * 1000; // 1 hour
      AsyncStorage.setItem.mockResolvedValue();

      const result = await sessionManagementService.setSessionTimeout(newTimeout);

      expect(result).toBe(true);
      expect(sessionManagementService.sessionTimeout).toBe(newTimeout);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'sessionTimeout',
        newTimeout.toString()
      );
    });

    it('should handle set timeout errors', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await sessionManagementService.setSessionTimeout(60000);

      expect(result).toBe(false);
    });
  });

  describe('getSessionInfo', () => {
    it('should return complete session info', async () => {
      const startTime = Date.now() - (10 * 60 * 1000);
      const userInfo = { id: 1, name: 'Test User' };
      
      sessionManagementService.isSessionActive = true;
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'sessionStartTime') return Promise.resolve(startTime.toString());
        if (key === 'sessionUserInfo') return Promise.resolve(JSON.stringify(userInfo));
        return Promise.resolve(null);
      });

      const result = await sessionManagementService.getSessionInfo();

      expect(result).toEqual({
        isActive: true,
        startTime: startTime,
        userInfo: userInfo,
        remainingTime: 20 * 60 * 1000,
        timeoutDuration: 30 * 60 * 1000
      });
    });

    it('should handle session info errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await sessionManagementService.getSessionInfo();

      expect(result).toEqual({
        isActive: false,
        startTime: null,
        userInfo: null,
        remainingTime: 0,
        timeoutDuration: 30 * 60 * 1000
      });
    });
  });

  describe('handleAppForeground', () => {
    beforeEach(() => {
      sessionManagementService.isSessionActive = true;
    });

    it('should handle short background duration', async () => {
      sessionManagementService.backgroundTime = Date.now() - (2 * 60 * 1000); // 2 minutes
      const startTime = Date.now() - (10 * 60 * 1000);
      AsyncStorage.getItem.mockResolvedValue(startTime.toString());

      await sessionManagementService.handleAppForeground();

      expect(sessionManagementService.backgroundTime).toBe(null);
    });

    it('should require re-authentication for long background', async () => {
      sessionManagementService.backgroundTime = Date.now() - (10 * 60 * 1000); // 10 minutes
      sessionManagementService.sessionCallbacks.onSessionExpired = mockCallbacks.onSessionExpired;
      
      biometricAuthService.getBiometricStatus.mockResolvedValue({ enabled: true });
      biometricAuthService.authenticate.mockResolvedValue({ success: false });
      secureTokenService.clearAllTokens.mockResolvedValue(true);

      await sessionManagementService.handleAppForeground();

      expect(mockCallbacks.onSessionExpired).toHaveBeenCalledWith('security');
    });

    it('should extend session on successful biometric auth', async () => {
      sessionManagementService.backgroundTime = Date.now() - (10 * 60 * 1000);
      
      biometricAuthService.getBiometricStatus.mockResolvedValue({ enabled: true });
      biometricAuthService.authenticate.mockResolvedValue({ success: true });
      AsyncStorage.setItem.mockResolvedValue();

      await sessionManagementService.handleAppForeground();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'sessionStartTime',
        expect.any(String)
      );
    });
  });

  describe('session timers', () => {
    beforeEach(() => {
      sessionManagementService.isSessionActive = true;
      sessionManagementService.sessionCallbacks.onSessionWarning = mockCallbacks.onSessionWarning;
      sessionManagementService.sessionCallbacks.onSessionExpired = mockCallbacks.onSessionExpired;
    });

    it('should trigger warning before session expires', () => {
      sessionManagementService.startSessionTimer();

      // Fast forward to warning time
      jest.advanceTimersByTime(25 * 60 * 1000); // 25 minutes

      expect(mockCallbacks.onSessionWarning).toHaveBeenCalledWith(5 * 60 * 1000);
    });

    it('should trigger session expiration', async () => {
      AsyncStorage.removeItem.mockResolvedValue();
      secureTokenService.clearAllTokens.mockResolvedValue(true);
      
      sessionManagementService.startSessionTimer();

      // Fast forward to session expiry
      jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockCallbacks.onSessionExpired).toHaveBeenCalledWith('timeout');
    });

    it('should clear timers properly', () => {
      sessionManagementService.startSessionTimer();
      
      expect(sessionManagementService.sessionTimer).not.toBe(null);
      expect(sessionManagementService.warningTimer).not.toBe(null);

      sessionManagementService.clearTimers();

      expect(sessionManagementService.sessionTimer).toBe(null);
      expect(sessionManagementService.warningTimer).toBe(null);
    });
  });

  describe('cleanup', () => {
    it('should cleanup properly', () => {
      const mockRemove = jest.fn();
      sessionManagementService.appStateSubscription = { remove: mockRemove };
      sessionManagementService.sessionTimer = setTimeout(() => {}, 1000);
      sessionManagementService.warningTimer = setTimeout(() => {}, 1000);

      sessionManagementService.cleanup();

      expect(mockRemove).toHaveBeenCalled();
      expect(sessionManagementService.appStateSubscription).toBe(null);
      expect(sessionManagementService.sessionTimer).toBe(null);
      expect(sessionManagementService.warningTimer).toBe(null);
    });
  });
});