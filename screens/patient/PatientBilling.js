import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const PatientBilling = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billingData, setBillingData] = useState([]);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_URL}/api/patient/billing/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch billing data');
        }

        const data = await response.json();
        setBillingData(data);
      } catch (error) {
        setError(error.message || 'Error loading billing data');
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Billing</Text>
      <FlatList
        data={billingData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Appointment Date: {item.appointment_date}</Text>
            <Text>Amount: ${item.amount}</Text>
            <Text>Status: {item.is_paid ? 'Paid' : 'Free'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.noData}>No billing records found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 20,
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
});

export default PatientBilling; 