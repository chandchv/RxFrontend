/**
 * WebSocket Service for Real-time Updates
 * 
 * This service manages WebSocket connections for real-time dashboard updates,
 * clinical records notifications, and appointment updates.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.listeners = new Map();
    
    // WebSocket URL (convert HTTP to WS)
    this.wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/notifications/';
    
    // Connection state callbacks
    this.onConnectionChange = null;
    this.onError = null;
    this.onMessage = null;
  }

  /**
   * Connect to WebSocket server
   */
  async connect() {
    if (this.isConnected || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    try {
      this.isConnecting = true;
      
      // Get authentication token
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Create WebSocket connection with auth token
      const wsUrl = `${this.wsUrl}?token=${token}`;
      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.handleConnectionError(error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    console.log('Disconnecting WebSocket');
    
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Clear heartbeat
    this.stopHeartbeat();
    
    // Close WebSocket connection
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    // Notify listeners
    this.notifyConnectionChange(false);
  }

  /**
   * Handle WebSocket open event
   */
  handleOpen() {
    console.log('WebSocket connected');
    
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000; // Reset delay
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Send queued messages
    this.sendQueuedMessages();
    
    // Restore subscriptions
    this.restoreSubscriptions();
    
    // Notify listeners
    this.notifyConnectionChange(true);
  }

  /**
   * Handle WebSocket message event
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data.type);
      
      switch (data.type) {
        case 'connection_established':
          this.handleConnectionEstablished(data);
          break;
          
        case 'notification':
          this.handleNotificationMessage(data);
          break;
          
        case 'alert':
          this.handleAlertMessage(data);
          break;
          
        case 'update':
          this.handleUpdateMessage(data);
          break;
          
        case 'pong':
          this.handlePong(data);
          break;
          
        case 'heartbeat':
          this.handleHeartbeat(data);
          break;
          
        case 'subscription_confirmed':
          this.handleSubscriptionConfirmed(data);
          break;
          
        case 'mark_read_confirmed':
          this.handleMarkReadConfirmed(data);
          break;
          
        case 'unread_count':
          this.handleUnreadCount(data);
          break;
          
        case 'error':
          this.handleServerError(data);
          break;
          
        default:
          console.warn('Unknown WebSocket message type:', data.type);
      }
      
      // Notify general message listeners
      this.notifyMessageListeners(data);
      
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  handleClose(event) {
    console.log('WebSocket closed:', event.code, event.reason);
    
    this.isConnected = false;
    this.isConnecting = false;
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Notify listeners
    this.notifyConnectionChange(false);
    
    // Attempt reconnection if not a clean close
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  handleError(error) {
    console.error('WebSocket error:', error);
    this.handleConnectionError(error);
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(error) {
    this.isConnected = false;
    this.isConnecting = false;
    
    // Notify error listeners
    if (this.onError) {
      this.onError(error);
    }
    
    // Schedule reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, this.reconnectDelay);
    
    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000,
      this.maxReconnectDelay
    );
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
        
        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Heartbeat timeout - connection may be lost');
          this.disconnect();
          this.connect(); // Attempt reconnection
        }, 10000); // 10 second timeout
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Send message to WebSocket server
   */
  sendMessage(message) {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      console.log('Message queued (not connected):', message.type);
      return false;
    }
  }

  /**
   * Send queued messages
   */
  sendQueuedMessages() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  /**
   * Subscribe to notification types
   */
  subscribe(notificationTypes) {
    const subscriptionData = {
      type: 'subscribe',
      notification_types: notificationTypes,
      timestamp: new Date().toISOString()
    };
    
    // Store subscription for restoration after reconnect
    this.subscriptions.set('notification_types', notificationTypes);
    
    return this.sendMessage(subscriptionData);
  }

  /**
   * Restore subscriptions after reconnection
   */
  restoreSubscriptions() {
    for (const [key, value] of this.subscriptions.entries()) {
      if (key === 'notification_types') {
        this.subscribe(value);
      }
    }
  }

  /**
   * Mark notifications as read
   */
  markNotificationsRead(notificationIds) {
    return this.sendMessage({
      type: 'mark_read',
      notification_ids: notificationIds,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get unread notification count
   */
  getUnreadCount() {
    return this.sendMessage({
      type: 'get_unread_count',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add connection change listener
   */
  addConnectionListener(callback) {
    this.onConnectionChange = callback;
  }

  /**
   * Add error listener
   */
  addErrorListener(callback) {
    this.onError = callback;
  }

  /**
   * Add message listener
   */
  addMessageListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  /**
   * Remove message listener
   */
  removeMessageListener(type, callback) {
    if (this.listeners.has(type)) {
      const callbacks = this.listeners.get(type);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify connection change listeners
   */
  notifyConnectionChange(isConnected) {
    if (this.onConnectionChange) {
      this.onConnectionChange(isConnected);
    }
  }

  /**
   * Notify message listeners
   */
  notifyMessageListeners(data) {
    if (this.listeners.has(data.type)) {
      const callbacks = this.listeners.get(data.type);
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      });
    }
  }

  // Message handlers

  handleConnectionEstablished(data) {
    console.log('WebSocket connection established:', data.message);
  }

  handleNotificationMessage(data) {
    console.log('Notification received:', data.data);
    // This will be handled by notification listeners
  }

  handleAlertMessage(data) {
    console.log('Alert received:', data.data);
    // This will be handled by alert listeners
  }

  handleUpdateMessage(data) {
    console.log('Update received:', data.data);
    // This will be handled by update listeners
  }

  handlePong(data) {
    // Clear heartbeat timeout
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  handleHeartbeat(data) {
    // Server-initiated heartbeat - respond with pong
    this.sendMessage({
      type: 'pong',
      timestamp: new Date().toISOString()
    });
  }

  handleSubscriptionConfirmed(data) {
    console.log('Subscription confirmed:', data.notification_types);
  }

  handleMarkReadConfirmed(data) {
    console.log('Mark read confirmed:', data.updated_count, 'notifications');
  }

  handleUnreadCount(data) {
    console.log('Unread count:', data.count);
  }

  handleServerError(data) {
    console.error('Server error:', data.message);
  }

  // Utility methods

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    };
  }

  /**
   * Force reconnection
   */
  forceReconnect() {
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  /**
   * Clear message queue
   */
  clearMessageQueue() {
    this.messageQueue = [];
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;