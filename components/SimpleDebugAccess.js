/**
 * Simple Debug Access Component
 * 
 * A lightweight debug access component that can be triggered with gestures
 * without complex dependencies
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SimpleDebugAccess = ({ navigation, children }) => {
  const [debugMode, setDebugMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  const handleTap = () => {
    const currentTime = Date.now();
    
    if (currentTime - lastTapTime > 2000) {
      setTapCount(1);
    } else {
      setTapCount(prev => prev + 1);
    }
    
    setLastTapTime(currentTime);

    if (tapCount >= 4) {
      setDebugMode(true);
      setTapCount(0);
      Alert.alert(
        'Debug Mode Enabled',
        'Debug mode is now active. You can access debug functions.',
        [
          { text: 'OK' },
          { 
            text: 'Show Debug Info', 
            onPress: () => {
              Alert.alert('Debug Info', `Debug Mode: ${debugMode}\nTap Count: ${tapCount}\nNavigation: Available`);
            }
          }
        ]
      );
    }
  };

  const handleLongPress = () => {
    Alert.alert(
      'Debug Access',
      'Choose an action:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Toggle Debug Mode', 
          onPress: () => {
            setDebugMode(!debugMode);
            Alert.alert('Debug Mode', `Debug mode ${!debugMode ? 'enabled' : 'disabled'}`);
          }
        },
        { 
          text: 'Show Debug Info', 
          onPress: () => {
            Alert.alert('Debug Info', `Debug Mode: ${debugMode}\nTap Count: ${tapCount}`);
          }
        },
        {
          text: 'Console Log Test',
          onPress: () => {
            console.log('=== DEBUG TEST ===');
            console.log('Debug mode:', debugMode);
            console.log('Tap count:', tapCount);
            console.log('Timestamp:', new Date().toISOString());
            console.log('==================');
            Alert.alert('Console Log', 'Check your console/terminal for debug information');
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
          onPress={() => {
            Alert.alert('Debug Functions', 'Debug functions available. Check console for logs.');
          }}
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

export default SimpleDebugAccess;
