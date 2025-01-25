import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const AdminDashboard = ({ navigation }) => {
  const [adminInfo, setAdminInfo] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');

      if (!token) {
        throw new Error('No authentication token found');
      }

      if (userData) {
        const parsedUserData = JSON.parse(userData);
        setAdminInfo(parsedUserData);
      }

      // Fetch dashboard statistics
      const response = await fetch(`${API_URL}/api/admin/statistics/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStatistics(data);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Welcome, {adminInfo?.first_name} {adminInfo?.last_name}</Text>
      </View>

      <View style={styles.content}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.buttonContainer}>
                <Button 
                  title="Manage Users" 
                  onPress={() => navigation.navigate('UserManagement')}
                />
                <Button 
                  title="Clinic Settings" 
                  onPress={() => navigation.navigate('ClinicSettings')}
                />
                <Button 
                  title="Reports" 
                  onPress={() => navigation.navigate('Reports')}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>System Statistics</Text>
              {statistics && (
                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{statistics.total_doctors}</Text>
                    <Text style={styles.statLabel}>Doctors</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{statistics.total_patients}</Text>
                    <Text style={styles.statLabel}>Patients</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{statistics.total_appointments}</Text>
                    <Text style={styles.statLabel}>Appointments</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{statistics.total_staff}</Text>
                    <Text style={styles.statLabel}>Staff</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      <Button title="Logout" onPress={handleLogout} color="#ff0000" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#444',
  },
  buttonContainer: {
    gap: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 20,
  },
});

export default AdminDashboard; 