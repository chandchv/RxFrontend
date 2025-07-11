import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPatientLabTests } from '../../api/labs';
import { useNavigation } from '@react-navigation/native';
import { Card, Button } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';

const LabHomeScreen = () => {
  const [labOrders, setLabOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { colors } = useTheme();

  const fetchLabOrders = async () => {
    try {
      setLoading(true);
      const data = await getPatientLabTests();
      setLabOrders(data);
    } catch (error) {
      console.error('Error fetching lab orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLabOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLabOrders();
  };

  const handleLabOrderPress = (labOrder) => {
    navigation.navigate('LabOrderDetails', { labOrderId: labOrder.id });
  };

  const handleBookLabTest = () => {
    navigation.navigate('BookLabTest');
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

  const renderLabOrderItem = ({ item }) => {
    return (
      <TouchableOpacity onPress={() => handleLabOrderPress(item)}>
        <Card style={[styles.card, { backgroundColor: colors.cardBackground }]} elevation={2}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={[styles.orderTitle, { color: colors.text }]}>
                Lab Order #{item.id}
              </Text>
              {renderStatusBadge(item.status)}
            </View>
            
            <View style={styles.orderInfo}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.secondaryText }]}>
                  {new Date(item.order_date).toLocaleDateString()}
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
                <Ionicons name="flask-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.secondaryText }]}>
                  {item.tests.length} test(s)
                </Text>
              </View>
              
              {item.chosen_lab && (
                <View style={styles.infoItem}>
                  <Ionicons name="business-outline" size={16} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.secondaryText }]}>
                    {item.chosen_lab.name}
                  </Text>
                </View>
              )}
              
              <View style={styles.infoItem}>
                <Ionicons name="cash-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.secondaryText }]}>
                  Payment: {formatPaymentStatus(item.payment_status)}
                </Text>
              </View>
            </View>
            
            {item.status === 'RESULT_UPLOADED' && (
              <View style={styles.resultInfo}>
                <Ionicons name="document-text-outline" size={18} color={colors.success} />
                <Text style={[styles.resultText, { color: colors.success }]}>
                  Results available
                </Text>
              </View>
            )}
          </Card.Content>
          
          <Card.Actions style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleLabOrderPress(item)}
            >
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
            
            {item.status === 'RESULT_UPLOADED' && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.accent, marginLeft: 8 }]}
                onPress={() => navigation.navigate('LabResultDetails', { resultId: item.result.id })}
              >
                <Text style={styles.actionButtonText}>View Results</Text>
              </TouchableOpacity>
            )}
          </Card.Actions>
        </Card>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING_PATIENT_CHOICE':
        return { background: '#e3f2fd', text: '#1976d2' };
      case 'PENDING_PAYMENT':
        return { background: '#fff9c4', text: '#ffa000' };
      case 'PENDING_LAB':
        return { background: '#fff9c4', text: '#ffa000' };
      case 'PROCESSING':
        return { background: '#fff9c4', text: '#ffa000' };
      case 'RESULT_UPLOADED':
        return { background: '#e8f5e9', text: '#388e3c' };
      case 'COMPLETED':
        return { background: '#e8f5e9', text: '#388e3c' };
      case 'CANCELLED':
        return { background: '#ffebee', text: '#d32f2f' };
      default:
        return { background: '#f5f5f5', text: '#757575' };
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'PENDING_PATIENT_CHOICE':
        return 'Choose Lab';
      case 'PENDING_PAYMENT':
        return 'Payment Pending';
      case 'PENDING_LAB':
        return 'Pending Lab';
      case 'PROCESSING':
        return 'Processing';
      case 'RESULT_UPLOADED':
        return 'Results Ready';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const formatPaymentStatus = (status) => {
    switch (status) {
      case 'UNPAID':
        return 'Unpaid';
      case 'PENDING':
        return 'Pending';
      case 'PAID':
        return 'Paid';
      case 'REFUNDED':
        return 'Refunded';
      case 'FAILED':
        return 'Failed';
      default:
        return status;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading lab tests...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Lab Tests</Text>
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: colors.primary }]}
          onPress={handleBookLabTest}
        >
          <Text style={styles.bookButtonText}>Book Test</Text>
        </TouchableOpacity>
      </View>
      
      {labOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image 
            source={require('../../assets/empty-lab-tests.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            You don't have any lab tests yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.secondaryText }]}>
            Book a lab test or wait for your doctor to prescribe one
          </Text>
          <Button 
            mode="contained" 
            onPress={handleBookLabTest}
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          >
            Book a Lab Test
          </Button>
        </View>
      ) : (
        <FlatList
          data={labOrders}
          renderItem={renderLabOrderItem}
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
  bookButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookButtonText: {
    color: 'white',
    fontWeight: '600',
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
  orderTitle: {
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
  orderInfo: {
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
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
    marginBottom: 24,
  },
  emptyButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
});

export default LabHomeScreen; 