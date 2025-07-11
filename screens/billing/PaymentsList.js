import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PaymentsList = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/billing/api/payments/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const formatCurrency = (amount) => {
    return "₹" + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const renderPaymentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.paymentCard}
      onPress={() => navigation.navigate('PaymentDetails', { paymentId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.paymentNumber}>{item.payment_number}</Text>
        <Text style={styles.paymentDate}>{new Date(item.payment_date).toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.patientName}>{item.patient_name}</Text>
        <Text style={styles.billNumber}>Bill: {item.bill_number}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        <Text style={[styles.status, { color: '#4caf50' }]}>
          {item.payment_method.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('RecordPayment')}
        >
          <Icon name="add-circle" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Record Payment</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0066cc']}
            tintColor="#0066cc"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="info" size={48} color="#3f51b5" />
            <Text style={styles.emptyText}>No payments found</Text>
          </View>
        }
      />
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3f51b5',
    padding: 8,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  list: {
    flex: 1,
    padding: 8,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentDate: {
    fontSize: 14,
    color: '#666',
  },
  cardBody: {
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    color: '#333',
  },
  billNumber: {
    fontSize: 14,
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});

export default PaymentsList; 