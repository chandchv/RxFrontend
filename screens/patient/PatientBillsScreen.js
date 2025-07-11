import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Badge, Divider, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { getPatientBills, downloadBillPdf } from '../../api/billing';
import { formatCurrency, formatDate } from '../../utils/formatters';

const StatusBadge = ({ status }) => {
  let color = 'gray';
  
  switch (status) {
    case 'paid':
      color = 'green';
      break;
    case 'partial':
      color = 'orange';
      break;
    case 'pending':
      color = 'red';
      break;
    case 'cancelled':
      color = 'gray';
      break;
  }
  
  return (
    <Badge style={[styles.badge, { backgroundColor: color }]}>
      {status}
    </Badge>
  );
};

const BillCard = ({ bill, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(bill)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.billNumber}>{bill.bill_number}</Text>
            <StatusBadge status={bill.status} />
          </View>
          
          <Text style={styles.date}>
            <Ionicons name="calendar-outline" size={14} color="#555" />
            {' '}{formatDate(bill.bill_date)}
          </Text>
          
          <Divider style={styles.divider} />
          
          <View style={styles.billDetails}>
            <View style={styles.billDetailRow}>
              <Text style={styles.billDetailLabel}>Bill Type:</Text>
              <Text style={styles.billDetailValue}>{bill.bill_type}</Text>
            </View>
            
            <View style={styles.billDetailRow}>
              <Text style={styles.billDetailLabel}>Doctor:</Text>
              <Text style={styles.billDetailValue}>{bill.doctor_name || 'N/A'}</Text>
            </View>
            
            <View style={styles.billDetailRow}>
              <Text style={styles.billDetailLabel}>Amount:</Text>
              <Text style={styles.billDetailValue}>{formatCurrency(bill.total)}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const PatientBillsScreen = ({ navigation }) => {
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState({
    total_billed: 0,
    total_paid: 0,
    total_pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await getPatientBills();
      setBills(data.bills);
      setSummary({
        total_billed: data.total_billed,
        total_paid: data.total_paid,
        total_pending: data.total_pending,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load bills. Please try again.');
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBills();
  }, []);

  useEffect(() => {
    fetchBills();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBills();
    }, [])
  );

  const handleBillPress = (bill) => {
    navigation.navigate('BillDetail', { billId: bill.id });
  };

  const handleDownloadPress = async (billId) => {
    try {
      setLoading(true);
      const pdfUrl = await downloadBillPdf(billId);
      
      // Open the PDF in the device's default PDF viewer
      const supported = await Linking.canOpenURL(pdfUrl);
      
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert('Error', 'Cannot open the PDF. Please try again later.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download the bill. Please try again.');
      console.error('Error downloading bill:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading bills...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Billed</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.total_billed)}</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={[styles.summaryValue, { color: 'green' }]}>
            {formatCurrency(summary.total_paid)}
          </Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: 'red' }]}>
            {formatCurrency(summary.total_pending)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.sectionTitle}>Your Bills</Text>
      
      <FlatList
        data={bills}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <BillCard bill={item} onPress={handleBillPress} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No bills found</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  card: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  badge: {
    borderRadius: 4,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  billDetails: {
    marginTop: 4,
  },
  billDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  billDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  billDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  list: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});

export default PatientBillsScreen; 