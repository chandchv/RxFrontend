import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LogoutButton from '../../components/LogoutButton';
import ClinicSelector from '../../components/ClinicSelector';

const ClinicAdminDashboard = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    totalStaff: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchClinics();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      fetchDashboardData(selectedClinic);
    }
  }, [selectedClinic]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <LogoutButton />,
    });
  }, [navigation]);

  const fetchClinics = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('Fetching clinics with token:', token); // Debug log

      const response = await fetch(`${API_URL}/api/clinics/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      console.log('Clinics response status:', response.status); // Debug log

      if (!response.ok) {
        throw new Error('Failed to fetch clinics');
      }

      const data = await response.json();
      console.log('Clinics data:', data); // Debug log

      setClinics(data);
      if (data.length > 0 && !selectedClinic) {
        setSelectedClinic(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching clinics:', error);
      Alert.alert('Error', 'Failed to load clinics');
    }
  };

  const fetchDashboardData = async (clinicId = selectedClinic) => {
    try {
      setError(null);
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      console.log('Fetching dashboard for clinic:', clinicId);

      const response = await fetch(`${API_URL}/api/clinic-admin/dashboard/${clinicId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      console.log('Dashboard data received:', data);
      
      setStats({
        totalDoctors: data.totalDoctors || 0,
        totalPatients: data.totalPatients || 0,
        todayAppointments: data.todayAppointments || 0,
        pendingAppointments: data.pendingAppointments || 0,
        totalStaff: data.totalStaff || 0,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      setError(error.message);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClinicChange = async (clinicId) => {
    try {
      setSelectedClinic(clinicId);
      const token = await AsyncStorage.getItem('userToken');
      
      // Update current clinic in backend
      const response = await fetch(`${API_URL}/api/clinics/current/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clinic_id: clinicId })
      });

      if (!response.ok) {
        throw new Error('Failed to update current clinic');
      }

      // Fetch new dashboard data for selected clinic
      await fetchDashboardData(clinicId);
      
    } catch (error) {
      console.error('Error updating clinic:', error);
      Alert.alert('Error', 'Failed to update clinic selection');
    }
  };

  const handleClinicCreated = (newClinic) => {
    setClinics([...clinics, newClinic]);
    setSelectedClinic(newClinic.id);
  };

  const menuItems = [
    {
      title: 'Doctors',
      icon: 'medical-services',
      screen: 'DoctorManagement',
      color: '#4CAF50'
    },
    {
      title: 'Patients',
      icon: 'people',
      screen: 'PatientManagement',
      color: '#2196F3'
    },
    {
      title: 'Appointments',
      icon: 'event',
      screen: 'AppointmentManagement',
      color: '#FF9800'
    },
    {
      title: 'Staff',
      icon: 'badge',
      screen: 'StaffManagement',
      color: '#9C27B0'
    },
    {
      title: 'Reports',
      icon: 'bar-chart',
      screen: 'ClinicReports',
      color: '#F44336'
    },
    {
      title: 'Settings',
      icon: 'settings',
      screen: 'ClinicSettings',
      color: '#607D8B'
    },
  ];

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchDashboardData(selectedClinic)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={() => fetchDashboardData(selectedClinic)}
          colors={['#0066cc']}
          tintColor="#0066cc"
        />
      }
    >
      <ClinicSelector
        clinics={clinics}
        selectedClinic={selectedClinic}
        onClinicChange={handleClinicChange}
        onClinicCreated={handleClinicCreated}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      ) : (
        <>
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Dashboard Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.totalDoctors || 0}</Text>
                <Text style={styles.statLabel}>Doctors</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.totalPatients || 0}</Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.todayAppointments || 0}</Text>
                <Text style={styles.statLabel}>Today's Appointments</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.pendingAppointments || 0}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>

          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, { backgroundColor: item.color }]}
                onPress={() => navigation.navigate(item.screen)}
              >
                <Icon name={item.icon} size={32} color="#fff" />
                <Text style={styles.menuItemText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  menuItem: {
    width: '45%',
    aspectRatio: 1,
    margin: '2.5%',
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ClinicAdminDashboard; 