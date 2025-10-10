import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView
} from 'react-native';
import { Searchbar, FAB, Chip, Card, Button, Menu, Divider } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';

import { appointmentService } from '../../services/appointmentService';
import { theme } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';

const AppointmentListScreen = ({ navigation, route }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewType, setViewType] = useState('list'); // 'list' or 'calendar'
  
  // Menu states
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [dateMenuVisible, setDateMenuVisible] = useState(false);
  
  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const statusOptions = [
    { value: 'all', label: 'All Appointments', color: theme.colors.primary },
    { value: 'scheduled', label: 'Scheduled', color: theme.colors.info },
    { value: 'in_progress', label: 'In Progress', color: theme.colors.warning },
    { value: 'completed', label: 'Completed', color: theme.colors.success },
    { value: 'cancelled', label: 'Cancelled', color: theme.colors.error },
    { value: 'no_show', label: 'No Show', color: theme.colors.error },
    { value: 'missed', label: 'Missed', color: theme.colors.error }
  ];

  const dateOptions = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this_week', label: 'This Week' },
    { value: 'next_week', label: 'Next Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'custom', label: 'Custom Date' }
  ];

  const loadAppointments = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setOffset(0);
      } else if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);

      // Build filters
      const filters = {
        limit,
        offset: refresh ? 0 : offset,
        view_type: viewType
      };

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      // Date filtering
      if (dateFilter !== 'all') {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        switch (dateFilter) {
          case 'today':
            filters.date_from = formatUtils.formatDate(today);
            filters.date_to = formatUtils.formatDate(today);
            break;
          case 'tomorrow':
            filters.date_from = formatUtils.formatDate(tomorrow);
            filters.date_to = formatUtils.formatDate(tomorrow);
            break;
          case 'this_week':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            filters.date_from = formatUtils.formatDate(startOfWeek);
            filters.date_to = formatUtils.formatDate(endOfWeek);
            break;
          case 'next_week':
            const nextWeekStart = new Date(today);
            nextWeekStart.setDate(today.getDate() + (7 - today.getDay()));
            const nextWeekEnd = new Date(nextWeekStart);
            nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
            filters.date_from = formatUtils.formatDate(nextWeekStart);
            filters.date_to = formatUtils.formatDate(nextWeekEnd);
            break;
          case 'this_month':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            filters.date_from = formatUtils.formatDate(startOfMonth);
            filters.date_to = formatUtils.formatDate(endOfMonth);
            break;
          case 'custom':
            if (selectedDate) {
              filters.date_from = selectedDate;
              filters.date_to = selectedDate;
            }
            break;
        }
      }

      const response = await appointmentService.getAppointments(filters);
      
      if (response.success) {
        const newAppointments = response.data.appointments;
        
        if (refresh || offset === 0) {
          setAppointments(newAppointments);
        } else {
          setAppointments(prev => [...prev, ...newAppointments]);
        }
        
        setHasMore(response.data.has_more);
        setOffset(refresh ? limit : offset + limit);
      } else {
        throw new Error(response.error || 'Failed to load appointments');
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [statusFilter, dateFilter, selectedDate, viewType, offset]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredAppointments(appointments);
      return;
    }

    const filtered = appointments.filter(appointment => {
      const searchText = query.toLowerCase();
      return (
        appointment.reason?.toLowerCase().includes(searchText) ||
        appointment.patient_name?.toLowerCase().includes(searchText) ||
        appointment.doctor_name?.toLowerCase().includes(searchText) ||
        appointment.status_display?.toLowerCase().includes(searchText)
      );
    });
    
    setFilteredAppointments(filtered);
  }, [appointments]);

  const handleRefresh = useCallback(() => {
    loadAppointments(true);
  }, [loadAppointments]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      loadAppointments(false);
    }
  }, [hasMore, loadingMore, loading, loadAppointments]);

  const handleAppointmentPress = (appointment) => {
    navigation.navigate('AppointmentDetail', { 
      appointmentId: appointment.id,
      appointment: appointment 
    });
  };

  const handleCreateAppointment = () => {
    navigation.navigate('ScheduleAppointment');
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setStatusMenuVisible(false);
    setOffset(0);
  };

  const handleDateFilter = (dateOption) => {
    setDateFilter(dateOption);
    setDateMenuVisible(false);
    setOffset(0);
    
    if (dateOption === 'custom') {
      setShowCalendar(true);
    }
  };

  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
    setShowCalendar(false);
    setOffset(0);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setDateFilter('all');
    setSelectedDate(null);
    setSearchQuery('');
    setOffset(0);
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.color : theme.colors.primary;
  };

  const renderAppointmentItem = ({ item }) => (
    <Card style={styles.appointmentCard} onPress={() => handleAppointmentPress(item)}>
      <Card.Content>
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentInfo}>
            <Text style={styles.appointmentDate}>
              {formatUtils.formatDate(item.appointment_date)}
            </Text>
            <Text style={styles.appointmentTime}>
              {formatUtils.formatTime(item.appointment_time)}
            </Text>
          </View>
          <Chip 
            mode="outlined" 
            textStyle={{ color: getStatusColor(item.status) }}
            style={{ borderColor: getStatusColor(item.status) }}
          >
            {item.status_display}
          </Chip>
        </View>
        
        {item.patient_name && (
          <Text style={styles.patientName}>Patient: {item.patient_name}</Text>
        )}
        
        {item.doctor_name && (
          <Text style={styles.doctorName}>
            Dr. {item.doctor_name}
            {item.doctor_specialization && ` - ${item.doctor_specialization}`}
          </Text>
        )}
        
        {item.reason && (
          <Text style={styles.appointmentReason} numberOfLines={2}>
            {item.reason}
          </Text>
        )}
        
        <View style={styles.appointmentFlags}>
          {item.is_emergency && (
            <Chip icon="alert" size="small" style={styles.flagChip}>
              Emergency
            </Chip>
          )}
          {item.is_telemedicine && (
            <Chip icon="video" size="small" style={styles.flagChip}>
              Telemedicine
            </Chip>
          )}
          {item.is_walk_in && (
            <Chip icon="walk" size="small" style={styles.flagChip}>
              Walk-in
            </Chip>
          )}
        </View>
        
        <View style={styles.appointmentActions}>
          <Text style={styles.durationText}>
            Duration: {item.duration_minutes} min
          </Text>
          <View style={styles.actionButtons}>
            {item.can_modify && (
              <Button 
                mode="outlined" 
                compact 
                onPress={() => navigation.navigate('ScheduleAppointment', { 
                  appointmentId: item.id,
                  editMode: true 
                })}
              >
                Edit
              </Button>
            )}
            {item.can_cancel && (
              <Button 
                mode="outlined" 
                compact 
                textColor={theme.colors.error}
                onPress={() => handleCancelAppointment(item)}
              >
                Cancel
              </Button>
            )}
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const handleCancelAppointment = (appointment) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel the appointment with ${appointment.doctor_name || appointment.patient_name} on ${formatUtils.formatDate(appointment.appointment_date)}?`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await appointmentService.cancelAppointment(appointment.id);
              if (response.success) {
                Alert.alert('Success', 'Appointment cancelled successfully');
                handleRefresh();
              } else {
                Alert.alert('Error', response.error || 'Failed to cancel appointment');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          }
        }
      ]
    );
  };

  const renderEmptyState = () => (
    <EmptyState
      icon="calendar-blank"
      title="No Appointments"
      message={
        statusFilter !== 'all' || dateFilter !== 'all' || searchQuery
          ? "No appointments match your current filters"
          : "You don't have any appointments yet"
      }
      actionText={statusFilter === 'all' && dateFilter === 'all' && !searchQuery ? "Schedule Appointment" : "Clear Filters"}
      onActionPress={
        statusFilter === 'all' && dateFilter === 'all' && !searchQuery 
          ? handleCreateAppointment 
          : clearFilters
      }
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingMoreText}>Loading more appointments...</Text>
      </View>
    );
  };

  // Focus effect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAppointments(true);
    }, [])
  );

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, appointments, handleSearch]);

  const displayAppointments = searchQuery ? filteredAppointments : appointments;

  if (loading && appointments.length === 0) {
    return <LoadingSpinner message="Loading appointments..." />;
  }

  if (error && appointments.length === 0) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => loadAppointments(true)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <Searchbar
        placeholder="Search appointments..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Menu
            visible={statusMenuVisible}
            onDismiss={() => setStatusMenuVisible(false)}
            anchor={
              <Chip
                icon="filter"
                onPress={() => setStatusMenuVisible(true)}
                selected={statusFilter !== 'all'}
                style={styles.filterChip}
              >
                {statusOptions.find(opt => opt.value === statusFilter)?.label || 'Status'}
              </Chip>
            }
          >
            {statusOptions.map((option) => (
              <Menu.Item
                key={option.value}
                onPress={() => handleStatusFilter(option.value)}
                title={option.label}
                leadingIcon={statusFilter === option.value ? "check" : undefined}
              />
            ))}
          </Menu>

          <Menu
            visible={dateMenuVisible}
            onDismiss={() => setDateMenuVisible(false)}
            anchor={
              <Chip
                icon="calendar"
                onPress={() => setDateMenuVisible(true)}
                selected={dateFilter !== 'all'}
                style={styles.filterChip}
              >
                {dateOptions.find(opt => opt.value === dateFilter)?.label || 'Date'}
              </Chip>
            }
          >
            {dateOptions.map((option) => (
              <Menu.Item
                key={option.value}
                onPress={() => handleDateFilter(option.value)}
                title={option.label}
                leadingIcon={dateFilter === option.value ? "check" : undefined}
              />
            ))}
          </Menu>

          {(statusFilter !== 'all' || dateFilter !== 'all') && (
            <Chip
              icon="close"
              onPress={clearFilters}
              style={styles.clearFilterChip}
            >
              Clear
            </Chip>
          )}
        </ScrollView>
      </View>

      {/* Appointments List */}
      <FlatList
        data={displayAppointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={displayAppointments.length === 0 ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={selectedDate ? { [selectedDate]: { selected: true } } : {}}
              theme={{
                selectedDayBackgroundColor: theme.colors.primary,
                todayTextColor: theme.colors.primary,
                arrowColor: theme.colors.primary,
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreateAppointment}
        label="New Appointment"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  clearFilterChip: {
    marginRight: 8,
    backgroundColor: theme.colors.errorContainer,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Space for FAB
  },
  emptyContainer: {
    flex: 1,
    paddingBottom: 80, // Space for FAB
  },
  appointmentCard: {
    marginBottom: 12,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  appointmentTime: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.secondary,
    marginBottom: 4,
  },
  appointmentReason: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
    lineHeight: 20,
  },
  appointmentFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  flagChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  durationText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    color: theme.colors.onSurfaceVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});

export default AppointmentListScreen;