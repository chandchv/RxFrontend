/**
 * Connection Manager Component
 * 
 * This component manages real-time connection status and provides
 * reconnection controls and status indicators.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRealTime } from '../../contexts/RealTimeContext';
import { useTheme } from '../../contexts/ThemeContext';

const ConnectionManager = ({ 
  showStatusBar = true, 
  showReconnectButton = true,
  compact = false 
}) => {
  const { 
    isConnected, 
    isConnecting, 
    connectionError, 
    lastSyncTime,
    reconnect,
    getConnectionStatus 
  } = useRealTime();
  
  const { theme } = useTheme();
  const [pulseAnim] = useState(new Animated.Value(1));
  const [showDetails, setShowDetails] = useState(false);

  // Animate connection indicator
  useEffect(() => {
    if (isConnecting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnecting, pulseAnim]);

  const getConnectionIcon = () => {
    if (isConnecting) return 'sync';
    if (isConnected) return 'wifi';
    if (connectionError) return 'wifi-off';
    return 'signal-wifi-off';
  };

  const getConnectionColor = () => {
    if (isConnecting) return theme.colors.warning;
    if (isConnected) return theme.colors.success;
    if (connectionError) return theme.colors.error;
    return theme.colors.disabled;
  };

  const getConnectionText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    if (connectionError) return 'Connection Error';
    return 'Offline';
  };

  const handleReconnect = async () => {
    try {
      await reconnect();
    } catch (error) {
      Alert.alert(
        'Connection Error',
        'Failed to reconnect. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleShowDetails = () => {
    const status = getConnectionStatus();
    const details = [
      `Status: ${getConnectionText()}`,
      `WebSocket: ${status.websocketStatus?.isConnected ? 'Connected' : 'Disconnected'}`,
      `Reconnect Attempts: ${status.websocketStatus?.reconnectAttempts || 0}`,
      `Queued Messages: ${status.websocketStatus?.queuedMessages || 0}`,
      `Cache Size: ${status.cacheSize || 0} items`,
      lastSyncTime ? `Last Sync: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Never synced',
    ];

    Alert.alert(
      'Connection Details',
      details.join('\n'),
      [
        { text: 'Reconnect', onPress: handleReconnect },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  if (!showStatusBar && isConnected) {
    return null; // Hide when connected if status bar is disabled
  }

  const styles = createStyles(theme, compact);

  return (
    <View style={styles.container}>
      {showStatusBar && (
        <TouchableOpacity 
          style={styles.statusBar}
          onPress={handleShowDetails}
          activeOpacity={0.7}
        >
          <Animated.View 
            style={[
              styles.iconContainer,
              { opacity: pulseAnim }
            ]}
          >
            <MaterialIcons
              name={getConnectionIcon()}
              size={compact ? 16 : 20}
              color={getConnectionColor()}
            />
          </Animated.View>
          
          <Text style={[styles.statusText, { color: getConnectionColor() }]}>
            {getConnectionText()}
          </Text>
          
          {lastSyncTime && isConnected && (
            <Text style={styles.syncTime}>
              {new Date(lastSyncTime).toLocaleTimeString()}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {connectionError && showReconnectButton && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {connectionError}
          </Text>
          
          <TouchableOpacity
            style={styles.reconnectButton}
            onPress={handleReconnect}
            disabled={isConnecting}
          >
            <MaterialIcons
              name="refresh"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.reconnectText}>
              {isConnecting ? 'Connecting...' : 'Reconnect'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme, compact) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: compact ? 8 : 12,
    paddingVertical: compact ? 4 : 6,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconContainer: {
    marginRight: 8,
  },
  statusText: {
    fontSize: compact ? 12 : 14,
    fontWeight: '500',
    flex: 1,
  },
  syncTime: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  errorContainer: {
    backgroundColor: theme.colors.errorBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.error,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginBottom: 4,
  },
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  reconnectText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default ConnectionManager;