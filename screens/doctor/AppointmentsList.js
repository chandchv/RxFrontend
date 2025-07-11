import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../../config';
import CustomHeader from '../../components/CustomHeader';

const AppointmentsList = ({ navigation, route }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { filter } = route.params || {};

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  // Refresh appointments when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchAppointments();
    }, [filter])
  );

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      let url = `${API_URL}/users/api/doctor/appointments/list/`;
      const params = new URLSearchParams();
      
      const today = new Date().toISOString().split('T')[0];
      
      switch (filter) {
        case 'today':
          params.append('date_from', today);
          params.append('date_to', today);
          break;
        case 'completed_today':
          params.append('date_from', today);
          params.append('date_to', today);
          params.append('status', 'completed');
          break;
        case 'upcoming':
          params.append('date_from', today);
          params.append('status', 'scheduled');
          break;
        case 'month':
          const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
          const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
          params.append('date_from', firstDay);
          params.append('date_to', lastDay);
          break;
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      console.log('Appointments API response:', data); // Debug log
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'in_progress': return '#f59e0b';
      case 'no_show': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  const getStatusBadgeStyle = (status) => {
    const color = getStatusColor(status);
    return {
      backgroundColor: color + '20',
      borderColor: color,
      borderWidth: 1,
    };
  };

  const getFilterTitle = () => {
    switch (filter) {
      case 'today': return "Today's Appointments";
      case 'completed_today': return "Completed Today";
      case 'upcoming': return "Upcoming Appointments";
      case 'month': return "This Month's Appointments";
      default: return "All Appointments";
    }
  };

  const renderAppointmentItem = ({ item }) => (
    <Pressable 
      style={styles.appointmentItem}
      onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
    >
      <View style={styles.appointmentHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>
            {item.patient_name}
          </Text>
          <Text style={styles.appointmentDateTime}>
            {new Date(item.appointment_date).toLocaleDateString()} at{' '}
            {new Date(`2000-01-01T${item.appointment_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
          {item.reason && (
            <Text style={styles.appointmentReason}>{item.reason}</Text>
          )}
        </View>
        
        <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status === 'in_progress' ? 'In Progress' : item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader 
        title={getFilterTitle()}
        subtitle={`${appointments.length} appointments`}
        navigation={navigation}
        currentScreen="Appointments"
      />

      <FlatList
        data={appointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No appointments found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  appointmentItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientInfo: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  appointmentDateTime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  appointmentReason: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
  },
});

export default AppointmentsList; 
