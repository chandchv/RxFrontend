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

const PharmacyDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    pendingOrders: 0,
    processedOrders: 0,
    deliveredOrders: 0
  });
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/pharmacy/api/staff/dashboard/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pharmacy dashboard data');
      }

      const data = await response.json();
      
      setStats({
        pendingOrders: data.stats.pendingOrders || 0,
        processedOrders: data.stats.processedOrders || 0,
        deliveredOrders: data.stats.deliveredOrders || 0
      });
      
      setPendingPrescriptions(data.pendingPrescriptions || []);
    } catch (error) {
      console.error('Error fetching pharmacy dashboard:', error);
      Alert.alert('Error', 'Failed to load pharmacy dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleViewPrescription = (prescriptionId) => {
    navigation.navigate('PrescriptionDetails', { prescriptionId });
  };

  const renderPrescriptionItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.prescriptionCard}
      onPress={() => handleViewPrescription(item.id)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.patientName}>{item.patient_name}</Text>
        <Text style={styles.prescriptionDate}>{new Date(item.date_prescribed).toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.doctorName}>Dr. {item.doctor_name}</Text>
        <Text style={styles.medicationCount}>{item.medications_count} medication(s)</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={[styles.status, { color: '#ff9800' }]}>
          <Icon name="hourglass-empty" size={16} color="#ff9800" /> Pending
        </Text>
        <Icon name="chevron-right" size={24} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const navigateToSection = (section) => {
    switch(section) {
      case 'pending':
        navigation.navigate('PendingPrescriptions');
        break;
      case 'inventory':
        navigation.navigate('PharmacyInventory');
        break;
      case 'orders':
        navigation.navigate('PharmacyOrders');
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
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#ff9800' }]}
          onPress={() => navigateToSection('pending')}
        >
          <Icon name="pending" size={24} color="#fff" />
          <Text style={styles.statNumber}>{stats.pendingOrders}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#4caf50' }]}
          onPress={() => navigateToSection('processed')}
        >
          <Icon name="check-circle" size={24} color="#fff" />
          <Text style={styles.statNumber}>{stats.processedOrders}</Text>
          <Text style={styles.statLabel}>Processed</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#2196f3' }]}
          onPress={() => navigateToSection('delivered')}
        >
          <Icon name="local-shipping" size={24} color="#fff" />
          <Text style={styles.statNumber}>{stats.deliveredOrders}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigateToSection('inventory')}
        >
          <Icon name="inventory" size={24} color="#0066cc" />
          <Text style={styles.actionText}>Manage Inventory</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigateToSection('orders')}
        >
          <Icon name="receipt-long" size={24} color="#0066cc" />
          <Text style={styles.actionText}>All Orders</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pending Prescriptions</Text>
        <TouchableOpacity onPress={() => navigateToSection('pending')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={pendingPrescriptions}
        renderItem={renderPrescriptionItem}
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
            <Icon name="check-circle" size={48} color="#4caf50" />
            <Text style={styles.emptyText}>No pending prescriptions!</Text>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f7ff',
    flex: 1,
    marginHorizontal: 4,
  },
  actionText: {
    marginLeft: 8,
    color: '#0066cc',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#0066cc',
  },
  list: {
    flex: 1,
    padding: 8,
  },
  prescriptionCard: {
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
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  prescriptionDate: {
    fontSize: 14,
    color: '#666',
  },
  cardBody: {
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 14,
    color: '#666',
  },
  medicationCount: {
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
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 14,
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

export default PharmacyDashboard; 