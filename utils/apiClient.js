import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';

const createApiClient = () => {
  const { token, logout } = useAuth();

  return {
    async fetch(endpoint, options = {}) {
      try {
        if (!token) {
          console.error('No token available');
          await logout();
          return null;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        };

        console.log(`Making request to ${endpoint} with token:`, token);

        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });

        if (response.status === 401) {
          console.error('Token expired or invalid');
          await logout();
          return null;
        }

        return response;
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    },

    async get(endpoint) {
      return this.fetch(endpoint, { method: 'GET' });
    },

    async post(endpoint, data) {
      return this.fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  };
};

export default createApiClient; 