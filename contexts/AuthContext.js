import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
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
      const [userJson, token] = await AsyncStorage.multiGet(['user', 'userToken']);
      console.log('Checking stored data:', { 
        hasUser: !!userJson[1], 
        hasToken: !!token[1] 
      });

      if (userJson[1] && token[1]) {
        const isValidToken = await validateToken(token[1]);
        if (isValidToken) {
          const userData = JSON.parse(userJson[1]);
          setUser(userData);
        } else {
          await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'user']);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('Attempting login for:', username);
      const response = await fetch(`${API_URL}/users/api/auth/login/`, {
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

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Normalize the role and create user data
      const userData = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        firstName: data.user.first_name,
        lastName: data.user.last_name,
        role: data.user_type.toUpperCase(),
        isSuperuser: data.user.is_superuser,
        // Store additional data if needed
        doctorId: data.doctor_id,
        patientId: data.patient_id,
        clinicId: data.clinic_id
      };

      // Store all necessary data
      await AsyncStorage.multiSet([
        ['userToken', data.access],
        ['refreshToken', data.refresh],
        ['user', JSON.stringify(userData)],
        ['role', data.user_type],
        ['doctorId', data.doctor_id?.toString() || ''],
        ['patientId', data.patient_id?.toString() || ''],
        ['clinicId', data.clinic_id?.toString() || '']
      ]);

      setUser(userData);
      return { success: true, user: userData };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const logout = async (navigation) => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        await AsyncStorage.multiRemove(keys);
      }
      setUser(null);

      if (navigation) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const validateToken = async (token) => {
    try {
      const response = await fetch(`${API_URL}/users/api/token/verify/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        console.log('Token expired or invalid, attempting refresh');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshResponse = await fetch(`${API_URL}/users/api/token/refresh/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshResponse.ok) {
            const newTokens = await refreshResponse.json();
            await AsyncStorage.setItem('userToken', newTokens.access);
            // Retry the original request
            return makeAuthenticatedRequest(endpoint, options);
          }
        }
        // If refresh failed, logout
        await logout();
        throw new Error('Authentication failed');
      }

      return response;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      makeAuthenticatedRequest,
      isLoggedIn: !!user,
      isDoctor: user?.role === 'DOCTOR',
      isPatient: user?.role === 'PATIENT',
      isLab: user?.role === 'LAB',
      isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPERUSER',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 