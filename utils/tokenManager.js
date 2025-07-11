import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

class TokenManager {
  static async refreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token found');
      }

      const response = await fetch(`${API_URL}/users/api/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      await AsyncStorage.setItem('userToken', data.access);
      
      // Optionally update refresh token if server returns a new one
      if (data.refresh) {
        await AsyncStorage.setItem('refreshToken', data.refresh);
      }

      return data.access;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear tokens and return null to trigger re-login
      await this.clearTokens();
      return null;
    }
  }

  static async clearTokens() {
    try {
      await AsyncStorage.multiRemove(['userToken', 'refreshToken']);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  static async getValidToken() {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        return null;
      }

      // Check if token is expired (decode JWT and check exp)
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
      
      if (Date.now() >= expirationTime) {
        // Token is expired, try to refresh
        return await this.refreshToken();
      }

      return token;
    } catch (error) {
      console.error('Error getting valid token:', error);
      return null;
    }
  }
}

export default TokenManager; 