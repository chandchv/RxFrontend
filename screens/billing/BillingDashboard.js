import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BillingDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalCollected: 0,
    pendingAmount: 0,
    overdueBills: 0
  });
  const [recentBills, setRecentBills] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/billing/api/admin/dashboard/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch billing dashboard data');
      }

      const data = await response.json();
      
      setStats({
        totalBilled: data.total_billed || 0,
        totalCollected: data.total_collected || 0,
        pendingAmount: data.pending_amount || 0,
        overdueBills: data.overdue_bills || 0
      });
      
      setRecentBills(data.recent_bills || []);
    } catch (error) {
      console.error('Error fetching billing dashboard:', error);
      Alert.alert('Error', 'Failed to load billing dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleViewBill = (billId) => {
    navigation.navigate('BillDetails', { billId });
  };

  const handlePayBill = (bill) => {
    setSelectedBill(bill);
    setPaymentData({
      amount: (bill.total - bill.amount_paid).toString(),
      payment_method: 'cash',
      reference_number: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    try {
      if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
        Alert.alert('Error', 'Please enter a valid payment amount');
        return;
      }

      setPaymentLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/billing/api/bills/${selectedBill.id}/pay/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      Alert.alert('Success', 'Payment recorded successfully');
      setShowPaymentModal(false);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', error.message || 'Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return "₹" + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const renderBillItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.billCard}
      onPress={() => handleViewBill(item.id)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.billNumber}>{item.bill_number}</Text>
        <Text style={styles.billDate}>{new Date(item.bill_date).toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.patientName}>{item.patient_name}</Text>
        <Text style={styles.billType}>{item.bill_type}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.amountSection}>
          <Text style={styles.amount}>{formatCurrency(item.total)}</Text>
          {item.amount_paid > 0 && (
            <Text style={styles.paidAmount}>Paid: {formatCurrency(item.amount_paid)}</Text>
          )}
        </View>
        <View style={styles.actionSection}>
          <Text style={[
            styles.status, 
            { 
              color: item.status === 'paid' ? '#4caf50' : 
                    item.status === 'partial' ? '#ff9800' : '#f44336' 
            }
          ]}>
            {item.status.toUpperCase()}
          </Text>
          {item.status !== 'paid' && (
            <TouchableOpacity 
              style={styles.payButton}
              onPress={() => handlePayBill(item)}
            >
              <Text style={styles.payButtonText}>Pay</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const navigateToSection = (section) => {
    switch(section) {
      case 'bills':
        navigation.navigate('BillsList');
        break;
      case 'payments':
        navigation.navigate('PaymentsList');
        break;
      case 'reports':
        navigation.navigate('BillingReports');
        break;
      case 'create-bill':
        navigation.navigate('CreateBill');
        break;
      default:
        break;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.overviewContainer}>
        <Text style={styles.sectionTitle}>Financial Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Billed</Text>
            <Text style={styles.statAmount}>{formatCurrency(stats.totalBilled)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Collected</Text>
            <Text style={styles.statAmount}>{formatCurrency(stats.totalCollected)}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending Amount</Text>
            <Text style={[styles.statAmount, { color: '#f44336' }]}>{formatCurrency(stats.pendingAmount)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Overdue Bills</Text>
            <Text style={[styles.statAmount, { color: '#f44336' }]}>{stats.overdueBills}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigateToSection('create-bill')}
        >
          <Icon name="add-circle" size={24} color="#fff" />
          <Text style={styles.actionText}>Create Bill</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigateToSection('payments')}
        >
          <Icon name="payment" size={24} color="#fff" />
          <Text style={styles.actionText}>Record Payment</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigateToSection('bills')}
        >
          <Icon name="receipt" size={24} color="#3f51b5" />
          <Text style={styles.menuText}>All Bills</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigateToSection('payments')}
        >
          <Icon name="account-balance-wallet" size={24} color="#3f51b5" />
          <Text style={styles.menuText}>Payments</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigateToSection('reports')}
        >
          <Icon name="bar-chart" size={24} color="#3f51b5" />
          <Text style={styles.menuText}>Reports</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Bills</Text>
        <TouchableOpacity onPress={() => navigateToSection('bills')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={recentBills}
        renderItem={renderBillItem}
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
            <Text style={styles.emptyText}>No recent bills found</Text>
          </View>
        }
      />

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pay Bill</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              keyboardType="numeric"
              value={paymentData.amount}
              onChangeText={(text) => setPaymentData({ ...paymentData, amount: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Payment Method"
              value={paymentData.payment_method}
              onChangeText={(text) => setPaymentData({ ...paymentData, payment_method: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Reference Number"
              value={paymentData.reference_number}
              onChangeText={(text) => setPaymentData({ ...paymentData, reference_number: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Notes"
              value={paymentData.notes}
              onChangeText={(text) => setPaymentData({ ...paymentData, notes: text })}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.payButton}
                onPress={processPayment}
              >
                <Text style={styles.payButtonText}>Pay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  overviewContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3f51b5',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  actionText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  menuContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    marginBottom: 8,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  menuText: {
    marginTop: 4,
    fontSize: 12,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3f51b5',
  },
  list: {
    flex: 1,
    padding: 8,
  },
  billCard: {
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
  billNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  billDate: {
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
  billType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paidAmount: {
    fontSize: 12,
    color: '#666',
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  payButton: {
    backgroundColor: '#3f51b5',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '500',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 12,
    padding: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default BillingDashboard; 