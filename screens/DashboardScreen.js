import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const DashboardScreen = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const { user, makeAuthenticatedRequest } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/dashboard/');
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, {user?.firstName}!</Text>
      <Text style={styles.role}>Role: {user?.role}</Text>
      {dashboardData ? (
        <View style={styles.dataContainer}>
          <Text>Dashboard Data:</Text>
          <Text>{JSON.stringify(dashboardData, null, 2)}</Text>
        </View>
      ) : (
        <Text>Loading dashboard data...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  role: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  dataContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
});

export default DashboardScreen; 