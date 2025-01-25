import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { CommonActions, useNavigation } from '@react-navigation/native';

const LogoutButton = () => {
  const { logout } = useAuth();
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Yes',
            onPress: async () => {
              const result = await logout();
              if (result.success) {
                // Reset navigation stack and navigate to Login
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [
                      { name: 'Login' }
                    ],
                  })
                );
              } else {
                Alert.alert('Error', 'Failed to logout. Please try again.');
              }
            }
          }
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'An error occurred while logging out.');
    }
  };

  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={handleLogout}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>Logout</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 10,
    marginRight: 10,
    backgroundColor: '#ff4444',
    borderRadius: 5,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LogoutButton; 