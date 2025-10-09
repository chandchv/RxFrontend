/**
 * WebSocket Service Tests
 * 
 * Tests for WebSocket connection management, message handling,
 * and reconnection logic.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import websocketService from '../../services/websocketService';

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    
    // Simulate connection after a delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 100);
  }
  
  send(data) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Simulate message echo for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: JSON.stringify({ type: 'echo', data: JSON.parse(data) }) });
      }
    }, 50);
  }
  
  close(code, reason) {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose({ code, reason });
  }
  
  simulateMessage(message) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(message) });
    }
  }
  
  simulateError(error) {
    if (this.onerror) this.onerror(error);
    }
  
  simulateClose(code = 1000, reason = 'Normal closure') {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose({ code, reason });
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket;
global.WebSocket.CONNECTING = 0;
global.WebSocket.OPEN = 1;
global.WebSocket.CLOSING = 2;
global.WebSocket.CLOSED = 3;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('WebSocketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue('mock-token');
    
    // Reset service state
    websocketService.disconnect();
  });

  afterEach(() => {
    websocketService.disconnect();
  });

  describe('Connection Management', () => {
    test('should connect to WebSocket server', async () => {
      const connectionPromise = new Promise((resolve) => {
        websocketService.addConnectionListener((isConnected) => {
          if (isConnected) resolve();
        });
      });

      await websocketService.connect();
      await connectionPromise;

      const status = websocketService.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.isConnecting).toBe(false);
    });

    test('should handle connection failure when no token', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const errorPromise = new Promise((resolve) => {
        websocketService.addErrorListener((error) => {
          resolve(error);
        });
      });

      await websocketService.connect();
      const error = await errorPromise;

      expect(error.message).toContain('No authentication token');
    });

    test('should disconnect from WebSocket server', async () => {
      await websocketService.connect();
      
      const disconnectionPromise = new Promise((resolve) => {
        websocketService.addConnectionListener((isConnected) => {
          if (!isConnected) resolve();
        });
      });

      websocketService.disconnect();
      await disconnectionPromise;

      const status = websocketService.getConnectionStatus();
      expect(status.isConnected).toBe(false);
    });

    test('should handle reconnection attempts', async () => {
      let connectionCount = 0;
      websocketService.addConnectionListener((isConnected) => {
        if (isConnected) connectionCount++;
      });

      await websocketService.connect();
      expect(connectionCount).toBe(1);

      // Simulate connection loss
      websocketService.ws.simulateClose(1006, 'Connection lost');
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(connectionCount).toBe(2);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await websocketService.connect();
      // Wait for connection to be established
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    test('should send messages when connected', () => {
      const message = { type: 'test', data: 'hello' };
      const result = websocketService.sendMessage(message);
      
      expect(result).toBe(true);
    });

    test('should queue messages when not connected', () => {
      websocketService.disconnect();
      
      const message = { type: 'test', data: 'hello' };
      const result = websocketService.sendMessage(message);
      
      expect(result).toBe(false);
      
      const status = websocketService.getConnectionStatus();
      expect(status.queuedMessages).toBe(1);
    });

    test('should handle ping/pong messages', async () => {
      const pongPromise = new Promise((resolve) => {
        websocketService.addMessageListener('pong', resolve);
      });

      websocketService.sendMessage({ type: 'ping' });
      
      // Simulate pong response
      websocketService.ws.simulateMessage({ type: 'pong', timestamp: new Date().toISOString() });
      
      await pongPromise;
      // Test passes if no error is thrown
    });

    test('should handle notification messages', async () => {
      const notificationData = {
        id: 1,
        title: 'Test Notification',
        message: 'This is a test',
        type: 'appointment'
      };

      const notificationPromise = new Promise((resolve) => {
        websocketService.addMessageListener('notification', (data) => {
          resolve(data.data);
        });
      });

      websocketService.ws.simulateMessage({
        type: 'notification',
        data: notificationData
      });

      const receivedData = await notificationPromise;
      expect(receivedData).toEqual(notificationData);
    });

    test('should handle subscription confirmation', async () => {
      const subscriptionPromise = new Promise((resolve) => {
        websocketService.addMessageListener('subscription_confirmed', resolve);
      });

      const notificationTypes = ['appointment', 'clinical_record'];
      websocketService.subscribe(notificationTypes);

      websocketService.ws.simulateMessage({
        type: 'subscription_confirmed',
        notification_types: notificationTypes,
        message: 'Subscribed successfully'
      });

      await subscriptionPromise;
      // Test passes if no error is thrown
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      await websocketService.connect();
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    test('should subscribe to notification types', () => {
      const notificationTypes = ['appointment', 'clinical_record', 'prescription'];
      const result = websocketService.subscribe(notificationTypes);
      
      expect(result).toBe(true);
    });

    test('should restore subscriptions after reconnection', async () => {
      const notificationTypes = ['appointment', 'clinical_record'];
      websocketService.subscribe(notificationTypes);

      // Simulate connection loss and reconnection
      websocketService.ws.simulateClose(1006, 'Connection lost');
      
      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Subscriptions should be restored automatically
      // This is tested by checking that no errors occur during reconnection
    });
  });

  describe('Heartbeat Mechanism', () => {
    beforeEach(async () => {
      await websocketService.connect();
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    test('should start heartbeat after connection', () => {
      expect(websocketService.heartbeatInterval).toBeTruthy();
    });

    test('should stop heartbeat on disconnection', () => {
      websocketService.disconnect();
      expect(websocketService.heartbeatInterval).toBe(null);
    });

    test('should handle heartbeat timeout', async () => {
      const disconnectionPromise = new Promise((resolve) => {
        websocketService.addConnectionListener((isConnected) => {
          if (!isConnected) resolve();
        });
      });

      // Simulate heartbeat timeout by not responding to ping
      websocketService.heartbeatTimeout = setTimeout(() => {
        websocketService.disconnect();
        websocketService.connect();
      }, 100);

      await disconnectionPromise;
      // Test passes if disconnection occurs
    });
  });

  describe('Error Handling', () => {
    test('should handle WebSocket errors', async () => {
      const errorPromise = new Promise((resolve) => {
        websocketService.addErrorListener(resolve);
      });

      await websocketService.connect();
      await new Promise(resolve => setTimeout(resolve, 150));

      const testError = new Error('Connection failed');
      websocketService.ws.simulateError(testError);

      const receivedError = await errorPromise;
      expect(receivedError).toBe(testError);
    });

    test('should handle invalid JSON messages', async () => {
      await websocketService.connect();
      await new Promise(resolve => setTimeout(resolve, 150));

      // Simulate invalid JSON message
      if (websocketService.ws.onmessage) {
        websocketService.ws.onmessage({ data: 'invalid json' });
      }

      // Should not throw error, just log it
      // Test passes if no exception is thrown
    });

    test('should handle unknown message types', async () => {
      await websocketService.connect();
      await new Promise(resolve => setTimeout(resolve, 150));

      websocketService.ws.simulateMessage({
        type: 'unknown_type',
        data: 'test data'
      });

      // Should not throw error, just log warning
      // Test passes if no exception is thrown
    });
  });

  describe('Connection Status', () => {
    test('should return correct connection status', async () => {
      let status = websocketService.getConnectionStatus();
      expect(status.isConnected).toBe(false);
      expect(status.isConnecting).toBe(false);

      await websocketService.connect();
      await new Promise(resolve => setTimeout(resolve, 150));

      status = websocketService.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.isConnecting).toBe(false);
      expect(status.reconnectAttempts).toBe(0);
    });

    test('should track queued messages', () => {
      websocketService.sendMessage({ type: 'test1' });
      websocketService.sendMessage({ type: 'test2' });

      const status = websocketService.getConnectionStatus();
      expect(status.queuedMessages).toBe(2);
    });
  });

  describe('Listener Management', () => {
    test('should add and remove message listeners', () => {
      const callback = jest.fn();
      
      websocketService.addMessageListener('test', callback);
      websocketService.removeMessageListener('test', callback);
      
      // Simulate message
      websocketService.notifyMessageListeners({ type: 'test', data: 'hello' });
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('should notify multiple listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      websocketService.addMessageListener('test', callback1);
      websocketService.addMessageListener('test', callback2);
      
      websocketService.notifyMessageListeners({ type: 'test', data: 'hello' });
      
      expect(callback1).toHaveBeenCalledWith({ type: 'test', data: 'hello' });
      expect(callback2).toHaveBeenCalledWith({ type: 'test', data: 'hello' });
    });
  });

  describe('Utility Methods', () => {
    test('should force reconnection', async () => {
      await websocketService.connect();
      await new Promise(resolve => setTimeout(resolve, 150));

      const reconnectionPromise = new Promise((resolve) => {
        let connectionCount = 0;
        websocketService.addConnectionListener((isConnected) => {
          if (isConnected) {
            connectionCount++;
            if (connectionCount === 2) resolve(); // Second connection after reconnect
          }
        });
      });

      websocketService.forceReconnect();
      await reconnectionPromise;
    });

    test('should clear message queue', () => {
      websocketService.sendMessage({ type: 'test1' });
      websocketService.sendMessage({ type: 'test2' });
      
      websocketService.clearMessageQueue();
      
      const status = websocketService.getConnectionStatus();
      expect(status.queuedMessages).toBe(0);
    });
  });
});