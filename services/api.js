import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const handleResponse = async (response) => {
  const text = await response.text();
  console.log('API Response:', response.status, text); // Debug log
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return text ? JSON.parse(text) : {};
};

export const fetchWithToken = async (url, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const userJson = await AsyncStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    
    console.log('User type:', user?.role); // Debug log
    console.log('Making request to:', `${API_URL}${url}`); // Debug log

    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return handleResponse(response);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
};

// API endpoints based on user role
export const getEndpoints = async () => {
  const userJson = await AsyncStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  if (user?.role === 'SUPERUSER' || user?.role === 'CLINIC_ADMIN') {
    // First get the clinics list
    const clinicsResponse = await fetchWithToken('/api/clinics/');
    console.log('Clinics response:', clinicsResponse);
    
    // Get the first clinic's ID (or the specific clinic ID for the admin)
    const clinicId = clinicsResponse[0]?.id;
    
    if (!clinicId) {
      throw new Error('No clinic found');
    }

    return {
      getPatients: () => fetchWithToken(`/api/clinic/${clinicId}/patients/`),
      getAppointments: () => fetchWithToken(`/api/clinic/${clinicId}/appointments/`),
      getDoctors: () => fetchWithToken(`/api/clinic/${clinicId}/doctors/`),
      getClinicStats: () => fetchWithToken(`/api/clinic/${clinicId}/stats/`),
      getClinics: () => fetchWithToken('/api/clinics/'),
    };
  }
  
  return {
    getPatients: () => fetchWithToken('/api/doctor/patients/'),
    getAppointments: () => fetchWithToken('/api/doctor/appointments/'),
    getProfile: () => fetchWithToken('/api/doctor/me/'),
  };
};

export default {
  fetchWithToken,
  getEndpoints,
}; 