import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BillDetails = ({ route, navigation }) => {
  const { billId } = route.params;
  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchBillDetails();
  }, []);

  const fetchBillDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/billing/api/bills/${billId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bill details');
      }

      const data = await response.json();
      setBill(data);
      
      // Set default payment amount to due amount
      setPaymentData(prev => ({
        ...prev,
        amount: (data.total - data.amount_paid).toString()
      }));
    } catch (error) {
      console.error('Error fetching bill details:', error);
      Alert.alert('Error', 'Failed to load bill details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (bill.status === 'paid') {
      Alert.alert('Info', 'This bill is already fully paid');
      return;
    }
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
      
      const response = await fetch(`${API_URL}/billing/api/bills/${billId}/pay/`, {
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
      fetchBillDetails(); // Refresh bill data
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Bill not found</Text>
      </View>
    );
  }

  const dueAmount = bill.total - bill.amount_paid;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.billNumber}>Bill #{bill.bill_number}</Text>
        <Text style={[
          styles.status,
          {
            color: bill.status === 'paid' ? '#4caf50' :
                  bill.status === 'partial' ? '#ff9800' : '#f44336'
          }
        ]}>
          {bill.status.toUpperCase()}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bill Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(bill.bill_date)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Due Date:</Text>
          <Text style={styles.value}>{formatDate(bill.due_date)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{bill.bill_type}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Patient:</Text>
          <Text style={styles.value}>{bill.patient_name}</Text>
        </View>
        {bill.doctor_name && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Doctor:</Text>
            <Text style={styles.value}>{bill.doctor_name}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bill Items</Text>
        {bill.items && bill.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.item_name}</Text>
              {item.description && (
                <Text style={styles.itemDescription}>{item.description}</Text>
              )}
            </View>
            <View style={styles.itemAmount}>
              <Text style={styles.quantity}>Qty: {item.quantity}</Text>
              <Text style={styles.price}>{formatCurrency(item.total)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>{formatCurrency(bill.subtotal)}</Text>
        </View>
        {bill.tax > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(bill.tax)}</Text>
          </View>
        )}
        {bill.discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount:</Text>
            <Text style={[styles.summaryValue, { color: '#4caf50' }]}>
              -{formatCurrency(bill.discount)}
            </Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{formatCurrency(bill.total)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount Paid:</Text>
          <Text style={[styles.summaryValue, { color: '#4caf50' }]}>
            {formatCurrency(bill.amount_paid)}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.dueRow]}>
          <Text style={styles.dueLabel}>Amount Due:</Text>
          <Text style={[styles.dueValue, { color: dueAmount > 0 ? '#f44336' : '#4caf50' }]}>
            {formatCurrency(dueAmount)}
          </Text>
        </View>
      </View>

      {bill.payments && bill.payments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {bill.payments.map((payment, index) => (
            <View key={index} style={styles.paymentRow}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentDate}>
                  {formatDate(payment.payment_date)}
                </Text>
                <Text style={styles.paymentMethod}>
                  {payment.payment_method}
                </Text>
                {payment.reference_number && (
                  <Text style={styles.paymentRef}>
                    Ref: {payment.reference_number}
                  </Text>
                )}
              </View>
              <Text style={styles.paymentAmount}>
                {formatCurrency(payment.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {dueAmount > 0 && (
        <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
          <Icon name="payment" size={24} color="#fff" />
          <Text style={styles.payButtonText}>Make Payment</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Make Payment</Text>
            <Text style={styles.dueInfo}>Due Amount: {formatCurrency(dueAmount)}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Payment Amount"
              keyboardType="numeric"
              value={paymentData.amount}
              onChangeText={(text) => setPaymentData({ ...paymentData, amount: text })}
            />
            
            <View style={styles.paymentMethodContainer}>
              <Text style={styles.inputLabel}>Payment Method:</Text>
              {['cash', 'card', 'upi', 'bank_transfer'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodOption,
                    paymentData.payment_method === method && styles.selectedMethod
                  ]}
                  onPress={() => setPaymentData({ ...paymentData, payment_method: method })}
                >
                  <Text style={[
                    styles.methodText,
                    paymentData.payment_method === method && styles.selectedMethodText
                  ]}>
                    {method.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Reference Number (Optional)"
              value={paymentData.reference_number}
              onChangeText={(text) => setPaymentData({ ...paymentData, reference_number: text })}
            />
            
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Notes (Optional)"
              multiline
              value={paymentData.notes}
              onChangeText={(text) => setPaymentData({ ...paymentData, notes: text })}
            />
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.payButtonModal]}
                onPress={processPayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.payButtonTextModal}>Pay</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  billNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  section: {
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemAmount: {
    alignItems: 'flex-end',
  },
  quantity: {
    fontSize: 12,
    color: '#666',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dueRow: {
    backgroundColor: '#f8f8f8',
    padding: 8,
    marginTop: 8,
    borderRadius: 4,
  },
  dueLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dueValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  paymentRef: {
    fontSize: 12,
    color: '#666',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  payButton: {
    backgroundColor: '#3f51b5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  dueInfo: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  paymentMethodContainer: {
    marginBottom: 12,
  },
  methodOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedMethod: {
    backgroundColor: '#3f51b5',
    borderColor: '#3f51b5',
  },
  methodText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  selectedMethodText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  payButtonModal: {
    backgroundColor: '#3f51b5',
  },
  payButtonTextModal: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  cancelButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default BillDetails; 