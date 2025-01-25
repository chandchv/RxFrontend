import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('userToken');
      
      if (userJson && token) {
        setUser(JSON.parse(userJson));
      } else {
        // If either token or user data is missing, clear both
        await AsyncStorage.multiRemove(['user', 'userToken']);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      // On error, clear storage and user state
      await AsyncStorage.multiRemove(['user', 'userToken']);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('Attempting login for:', username);
      
      const response = await fetch(`${API_URL}/api/login/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok || data.status === 'error') {
        throw new Error(data.error || data.detail || 'Login failed');
      }

      // Create a normalized user object
      const normalizedUser = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        first_name: data.user.first_name,
        last_name: data.user.last_name,
        role: data.user_type.toUpperCase(),
        is_superuser: data.user.is_superuser,
      };

      // Add role-specific IDs
      if (data.user_type === 'doctor') {
        normalizedUser.doctor_id = data.doctor_id;
      } else if (data.user_type === 'patient') {
        normalizedUser.patient_id = data.patient_id;
      } else if (data.user_type === 'staff') {
        normalizedUser.staff_id = data.staff_id;
      } else if (data.user_type === 'clinic_admin') {
        normalizedUser.clinic_admin_id = data.clinic_admin_id;
      }     

      // Store token and normalized user data
      await AsyncStorage.setItem('userToken', data.access);
      await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
      
      // Set user in state
      setUser(normalizedUser);

      return {
        success: true,
        user: normalizedUser
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const logout = async () => {
    try {
      // Clear all auth-related data from storage
      await AsyncStorage.multiRemove(['user', 'userToken']);
      
      // Reset user state
      setUser(null);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout,
      isLoggedIn: !!user,
      isAdmin: user?.is_superuser || user?.role === 'SUPERUSER',
      isDoctor: user?.role === 'DOCTOR',
      isPatient: user?.role === 'PATIENT'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 