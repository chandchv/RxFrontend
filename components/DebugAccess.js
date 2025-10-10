/**
 * Debug Access Component
 * 
 * Provides easy access to debug functionality from anywhere in the app
 * Can be triggered with gestures or buttons
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PanGestureHandler,
  State
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDebug } from '../utils/debugUtils';

const DebugAccess = ({ navigation, children }) => {
  const [debugMode, setDebugMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const debug = useDebug('DebugAccess');

  const handleTap = () => {
    const currentTime = Date.now();
    
    if (currentTime - lastTapTime > 2000) {
      // Reset if more than 2 seconds have passed
      setTapCount(1);
    } else {
      setTapCount(prev => prev + 1);
    }
    
    setLastTapTime(currentTime);

    // Enable debug mode after 5 taps
    if (tapCount >= 4) {
      setDebugMode(true);
      setTapCount(0);
      debug.info('Debug mode enabled via tap gesture');
      Alert.alert(
        'Debug Mode Enabled',
        'Debug mode is now active. You can access the debug screen from the navigation.',
        [
          { text: 'OK' },
          { 
            text: 'Open Debug Screen', 
            onPress: () => navigation.navigate('DebugScreen') 
          }
        ]
      );
    }
  };

  const handleLongPress = () => {
    debug.info('Debug access triggered via long press');
    Alert.alert(
      'Debug Access',
      'Choose an action:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Debug Screen', 
          onPress: () => navigation.navigate('DebugScreen') 
        },
        { 
          text: 'Toggle Debug Mode', 
          onPress: () => {
            setDebugMode(!debugMode);
            debug.info(`Debug mode ${!debugMode ? 'enabled' : 'disabled'}`);
          }
        },
        { 
          text: 'Show Debug Info', 
          onPress: () => {
            debug.info('Current debug state', { debugMode, tapCount });
            Alert.alert('Debug Info', `Debug Mode: ${debugMode}\nTap Count: ${tapCount}`);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {children}
      
      {/* Debug Access Button (only visible in debug mode) */}
      {debugMode && (
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => navigation.navigate('DebugScreen')}
        >
          <Icon name="bug-report" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Hidden Debug Trigger */}
      <TouchableOpacity
        style={styles.hiddenTrigger}
        onPress={handleTap}
        onLongPress={handleLongPress}
        delayLongPress={1000}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugButton: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#ff4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  hiddenTrigger: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 50,
    height: 50,
    opacity: 0,
  },
});

export default DebugAccess;
