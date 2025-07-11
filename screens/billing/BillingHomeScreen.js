import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPatientBills } from '../../api/billing';
import { useNavigation } from '@react-navigation/native';
import { Card, Chip, Divider } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';

const BillingHomeScreen = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'paid'
  const navigation = useNavigation();
  const { colors } = useTheme();

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await getPatientBills();
      setBills(data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBills();
  };

  const handleBillPress = (bill) => {
    navigation.navigate('BillDetails', { billId: bill.id });
  };

  const getFilteredBills = () => {
    switch (filter) {
      case 'pending':
        return bills.filter(bill => bill.status === 'pending' || bill.status === 'partial');
      case 'paid':
        return bills.filter(bill => bill.status === 'paid');
      case 'all':
      default:
        return bills;
    }
  };

  const renderBillItem = ({ item }) => {
    return (
      <TouchableOpacity onPress={() => handleBillPress(item)}>
        <Card style={[styles.card, { backgroundColor: colors.cardBackground }]} elevation={2}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={[styles.billTitle, { color: colors.text }]}>
                Bill #{item.bill_number}
              </Text>
              {renderStatusBadge(item.status)}
            </View>
            
            <View style={styles.billInfo}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.secondaryText }]}>
                  {new Date(item.bill_date).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="medical-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.secondaryText }]}>
                  {formatBillType(item.bill_type)}
                </Text>
              </View>
              
              {item.doctor && (
                <View style={styles.infoItem}>
                  <Ionicons name="person-outline" size={16} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.secondaryText }]}>
                    Dr. {item.doctor.name}
                  </Text>
                </View>
              )}
              
              <View style={styles.infoItem}>
                <Ionicons name="business-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.secondaryText }]}>
                  {item.clinic.name}
                </Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.amountsContainer}>
              <View style={styles.amountItem}>
                <Text style={[styles.amountLabel, { color: colors.secondaryText }]}>Total</Text>
                <Text style={[styles.amountValue, { color: colors.text }]}>
                  ₹{item.total.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.amountItem}>
                <Text style={[styles.amountLabel, { color: colors.secondaryText }]}>Paid</Text>
                <Text style={[styles.amountValue, { color: colors.success }]}>
                  ₹{item.amount_paid.toFixed(2)}
                </Text>
              </View>
              
              {item.due_amount > 0 && (
                <View style={styles.amountItem}>
                  <Text style={[styles.amountLabel, { color: colors.secondaryText }]}>Due</Text>
                  <Text style={[styles.amountValue, { color: colors.error }]}>
                    ₹{item.due_amount.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
          
          <Card.Actions style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleBillPress(item)}
            >
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
            
            {(item.status === 'pending' || item.status === 'partial') && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.accent, marginLeft: 8 }]}
                onPress={() => navigation.navigate('PayBill', { billId: item.id })}
              >
                <Text style={styles.actionButtonText}>Pay Now</Text>
              </TouchableOpacity>
            )}
          </Card.Actions>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderStatusBadge = (status) => {
    const { background, text } = getStatusColor(status);
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: background }]}>
        <Text style={[styles.statusText, { color: text }]}>
          {formatStatus(status)}
        </Text>
      </View>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return { background: '#fff9c4', text: '#ffa000' };
      case 'partial':
        return { background: '#e3f2fd', text: '#1976d2' };
      case 'paid':
        return { background: '#e8f5e9', text: '#388e3c' };
      case 'cancelled':
        return { background: '#ffebee', text: '#d32f2f' };
      default:
        return { background: '#f5f5f5', text: '#757575' };
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'partial':
        return 'Partially Paid';
      case 'paid':
        return 'Paid';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatBillType = (type) => {
    switch (type) {
      case 'consultation':
        return 'Consultation';
      case 'lab_test':
        return 'Lab Test';
      case 'procedure':
        return 'Medical Procedure';
      case 'pharmacy':
        return 'Pharmacy';
      case 'appointment':
        return 'Appointment';
      case 'lab':
        return 'Lab Test';
      case 'other':
        return 'Other Service';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading bills...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Bills</Text>
      </View>
      
      <View style={styles.filterContainer}>
        <Chip 
          selected={filter === 'all'} 
          onPress={() => setFilter('all')}
          style={[styles.filterChip, filter === 'all' && { backgroundColor: colors.primary }]}
          textStyle={{ color: filter === 'all' ? 'white' : colors.text }}
        >
          All
        </Chip>
        <Chip 
          selected={filter === 'pending'} 
          onPress={() => setFilter('pending')}
          style={[styles.filterChip, filter === 'pending' && { backgroundColor: colors.primary }]}
          textStyle={{ color: filter === 'pending' ? 'white' : colors.text }}
        >
          Pending
        </Chip>
        <Chip 
          selected={filter === 'paid'} 
          onPress={() => setFilter('paid')}
          style={[styles.filterChip, filter === 'paid' && { backgroundColor: colors.primary }]}
          textStyle={{ color: filter === 'paid' ? 'white' : colors.text }}
        >
          Paid
        </Chip>
      </View>
      
      {bills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image 
            source={require('../../assets/empty-bills.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            You don't have any bills yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.secondaryText }]}>
            Bills will appear here after you receive services
          </Text>
        </View>
      ) : getFilteredBills().length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image 
            source={require('../../assets/empty-filtered-bills.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No {filter} bills found
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.secondaryText }]}>
            Try changing the filter to view other bills
          </Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredBills()}
          renderItem={renderBillItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  listContainer: {
    paddingBottom: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  billInfo: {
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  divider: {
    marginVertical: 8,
  },
  amountsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amountItem: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default BillingHomeScreen; 