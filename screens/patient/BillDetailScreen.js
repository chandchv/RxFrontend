import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Card, Divider, Button, List, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { getBillDetails, downloadBillPdf, payBillBalance } from '../../api/billing';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PaymentItem = ({ payment }) => {
  return (
    <List.Item
      title={`Payment: ${formatCurrency(payment.amount)}`}
      description={`${payment.payment_method} • ${formatDate(payment.payment_date)}`}
      left={props => <List.Icon {...props} icon="cash" />}
      right={props => 
        <Text style={styles.receiptNumber}>
          {payment.receipt_number}
        </Text>
      }
    />
  );
};

const BillItem = ({ item }) => {
  return (
    <List.Item
      title={item.item_name}
      description={item.description || 'No description'}
      right={props => (
        <View style={styles.itemPriceContainer}>
          <Text style={styles.itemQuantity}>x{item.quantity}</Text>
          <Text style={styles.itemPrice}>{formatCurrency(item.total)}</Text>
        </View>
      )}
    />
  );
};

const BillDetailScreen = ({ route, navigation }) => {
  const { billId } = route.params;
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchBillDetails();
  }, [billId]);

  const fetchBillDetails = async () => {
    try {
      setLoading(true);
      const data = await getBillDetails(billId);
      setBill(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load bill details. Please try again.');
      console.error('Error fetching bill details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const pdfUrl = await downloadBillPdf(billId);
      const supported = await Linking.canOpenURL(pdfUrl);
      
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert('Error', 'Cannot open the PDF. Please try again later.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download the bill. Please try again.');
      console.error('Error downloading bill:', error);
    }
  };

  const handlePayment = async () => {
    try {
      setPaymentLoading(true);
      
      // In a real app, you would:
      // 1. Navigate to a payment screen
      // 2. Collect payment method details
      // 3. Create a payment intent with your payment processor
      // 4. Call the payBillBalance API with the payment intent ID
      
      // For this example, we'll mock a successful payment
      Alert.alert(
        'Process Payment',
        'This would typically open a payment gateway to process the payment.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Mock Success', 
            onPress: () => {
              // Refresh bill details after successful payment
              fetchBillDetails();
              Alert.alert('Success', 'Payment processed successfully');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment. Please try again.');
      console.error('Error processing payment:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading bill details...</Text>
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#ff6b6b" />
        <Text style={styles.errorText}>Failed to load bill details</Text>
        <Button 
          mode="contained" 
          onPress={fetchBillDetails}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }

  const amountDue = bill.total - bill.total_paid;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.billNumber}>{bill.bill_number}</Text>
              <Text style={styles.billDate}>
                <Ionicons name="calendar-outline" size={14} color="#555" />
                {' '}Bill Date: {formatDate(bill.bill_date)}
              </Text>
            </View>
            <Badge style={[
              styles.statusBadge, 
              { backgroundColor: bill.status === 'paid' ? 'green' : bill.status === 'partial' ? 'orange' : 'red' }
            ]}>
              {bill.status_display}
            </Badge>
          </View>

          <Divider style={styles.divider} />
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Bill Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bill Type:</Text>
              <Text style={styles.infoValue}>{bill.bill_type_display}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Due Date:</Text>
              <Text style={styles.infoValue}>{formatDate(bill.due_date)}</Text>
            </View>
            
            {bill.doctor_details && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Doctor:</Text>
                <Text style={styles.infoValue}>{bill.doctor_details.name}</Text>
              </View>
            )}
            
            {bill.notes && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Notes:</Text>
                <Text style={styles.infoValue}>{bill.notes}</Text>
              </View>
            )}
          </View>

          <Divider style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Items</Text>
          
          {bill.items && bill.items.map((item, index) => (
            <BillItem key={item.id || index} item={item} />
          ))}

          <Divider style={styles.divider} />
          
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(bill.subtotal)}</Text>
            </View>
            
            {bill.tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax:</Text>
                <Text style={styles.totalValue}>{formatCurrency(bill.tax)}</Text>
              </View>
            )}
            
            {bill.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount:</Text>
                <Text style={styles.totalValue}>-{formatCurrency(bill.discount)}</Text>
              </View>
            )}
            
            <View style={styles.totalRow}>
              <Text style={styles.grandTotalLabel}>Total:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(bill.total)}</Text>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Paid:</Text>
              <Text style={[styles.totalValue, { color: 'green' }]}>
                {formatCurrency(bill.total_paid)}
              </Text>
            </View>
            
            {amountDue > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.grandTotalLabel}>Due:</Text>
                <Text style={[styles.grandTotalValue, { color: 'red' }]}>
                  {formatCurrency(amountDue)}
                </Text>
              </View>
            )}
          </View>

          {bill.payments && bill.payments.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.sectionTitle}>Payment History</Text>
              
              {bill.payments.map((payment, index) => (
                <PaymentItem key={payment.id || index} payment={payment} />
              ))}
            </>
          )}
        </Card.Content>
        
        <Card.Actions style={styles.actions}>
          <Button
            mode="outlined"
            icon="download"
            onPress={handleDownload}
          >
            Download
          </Button>
          
          {amountDue > 0 && (
            <Button
              mode="contained"
              icon="cash"
              onPress={handlePayment}
              loading={paymentLoading}
              disabled={paymentLoading}
            >
              Pay {formatCurrency(amountDue)}
            </Button>
          )}
        </Card.Actions>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#555',
  },
  retryButton: {
    marginTop: 10,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  billNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  billDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    flex: 2,
    fontSize: 14,
    color: '#333',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  totalsSection: {
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptNumber: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});

export default BillDetailScreen; 